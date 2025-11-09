"use client";
import { useMemo, useState } from "react";

export default function Page() {
  const [type, setType] = useState("github-actions");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("0 9 * * *");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const disabled = useMemo(() => generating || description.trim().length < 8, [generating, description]);

  async function onGenerate(e) {
    e.preventDefault();
    setError("");
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, schedule })
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setGenerating(false);
    }
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Automation Creator</h1>
        <div className="subtle">Generate ready-to-use templates for CI/CD, cron jobs, and webhooks.</div>
        <form onSubmit={onGenerate}>
          <label>Automation type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="github-actions">GitHub Actions (YAML + Node script)</option>
            <option value="cron-bash">Cron + Bash script</option>
            <option value="zapier-webhook">Zapier-style Webhook JSON</option>
          </select>

          <div className="row">
            <div>
              <label>Schedule (cron)</label>
              <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 9 * * *" />
              <div className="small">Ignored for webhook; used for scheduled runs.</div>
            </div>
            <div>
              <label className="">Quick tips</label>
              <div className="small">Describe the inputs, actions, outputs. Example: "Every weekday at 9am, fetch latest issues, summarize, and email to team".</div>
            </div>
          </div>

          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what to automate..." />

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={disabled}>
              {generating ? "Generating..." : "Generate"}
            </button>
            <span className="small">Press <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span></span>
          </div>
        </form>

        {error && (
          <div className="file" style={{ borderColor: "#5b1f2a", background: "#1a0d14", color: "#ffb4c2" }}>
            {error}
          </div>
        )}

        {result?.files?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Generated files</h2>
            {result.files.map((f, idx) => (
              <div key={idx} className="file">
                <div className="actions" style={{ justifyContent: "space-between" }}>
                  <div className="filename">{f.filename}</div>
                  <div className="actions">
                    <button className="secondary" onClick={() => copy(f.content)}>Copy</button>
                    <button className="secondary" onClick={() => download(f.filename, f.content)}>Download</button>
                  </div>
                </div>
                {f.hint && <div className="small" style={{ margin: "8px 0 12px" }}>{f.hint}</div>}
                <pre><code>{f.content}</code></pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
