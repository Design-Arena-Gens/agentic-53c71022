import './globals.css';

export const metadata = {
  title: 'Automation Creator',
  description: 'Generate CI/CD and cron automations quickly',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
