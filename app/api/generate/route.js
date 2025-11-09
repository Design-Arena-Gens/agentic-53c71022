import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { type, description, schedule } = await request.json();
    const safeDesc = String(description || "").trim();
    if (!safeDesc || safeDesc.length < 8) {
      return NextResponse.json({ error: "Description must be at least 8 characters" }, { status: 400 });
    }

    const cron = (String(schedule || "").trim()) || "0 9 * * *";
    const title = toTitle(safeDesc.slice(0, 64));

    let files = [];

    if (type === "github-actions") {
      const yaml = genGithubActionsYaml(title, cron);
      const nodeScript = genGithubNodeScript(safeDesc);
      files.push(
        { filename: ".github/workflows/automation.yml", language: "yaml", content: yaml, hint: `Place in .github/workflows. Schedule: ${cron}` },
        { filename: ".github/scripts/automation.js", language: "javascript", content: nodeScript, hint: "Node 20 runtime. Add your logic in the handler." }
      );
    } else if (type === "cron-bash") {
      const bash = genCronBash(safeDesc);
      const crontab = `${cron} /path/to/automation.sh >> /var/log/automation.log 2>&1`;
      files.push(
        { filename: "automation.sh", language: "bash", content: bash, hint: "Make executable: chmod +x automation.sh" },
        { filename: "CRON.txt", language: "text", content: `# Add this line with crontab -e\n${crontab}\n`, hint: `Cron schedule: ${cron}` }
      );
    } else {
      const zap = genZapierJson(safeDesc);
      files.push(
        { filename: "zapier_webhook.json", language: "json", content: JSON.stringify(zap, null, 2), hint: "Use as a guide when creating a Zap with Webhooks + Code." }
      );
    }

    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

function toTitle(text) {
  return text
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function genGithubActionsYaml(title, cron) {
  const hasCron = /\S/.test(cron);
  return `name: Auto - ${title}\n\non:${hasCron ? `\n  schedule:\n    - cron: \"${cron}\"` : ""}\n  workflow_dispatch:\n\njobs:\n  run-automation:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n    steps:\n      - uses: actions/checkout@v4\n      - name: Setup Node\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n          cache: 'npm'\n      - name: Install dependencies\n        run: npm ci --ignore-scripts\n      - name: Run automation\n        run: node ./.github/scripts/automation.js\n`;
}

function genGithubNodeScript(description) {
  return `#!/usr/bin/env node\n\nasync function main() {\n  const context = {\n    nowUtcIso: new Date().toISOString(),\n    env: process.env,\n  };\n\n  // Goal: ${description}\n  // Implement your steps below. Use fetch, octokit, or any SDKs you need.\n\n  console.log(\`[Automation] Start - ${description}\`);\n\n  // Example: placeholder async task\n  await new Promise((r) => setTimeout(r, 500));\n\n  console.log('[Automation] Done.', context.nowUtcIso);\n}\n\nmain().catch((err) => {\n  console.error('[Automation] Failed:', err);\n  process.exitCode = 1;\n});\n`;
}

function genCronBash(description) {
  return `#!/usr/bin/env bash\nset -euo pipefail\n\n# Goal: ${description}\n# Logs: /var/log/automation.log (example)\n\nlog() {\n  echo \"[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*\"\n}\n\nlog \"Start automation\"\n\n# Example work: replace with real steps\nsleep 1\n\nlog \"Done\"\n`;
}

function genZapierJson(description) {
  return {
    platform: "zapier",
    summary: description,
    trigger: {
      app: "Webhooks by Zapier",
      event: "Catch Hook",
      input: {
        method: "POST",
        examplePayload: { message: "Hello from your webhook" }
      }
    },
    actions: [
      { type: "Code by Zapier", language: "javascript", note: "Transform data here" },
      { type: "Email by Zapier", note: "Send a summary" }
    ],
    hints: [
      "Create a Zap with Webhooks trigger (Catch Hook)",
      "Add a Code step to transform data",
      "Add output action(s) such as Email or Slack"
    ]
  };
}
