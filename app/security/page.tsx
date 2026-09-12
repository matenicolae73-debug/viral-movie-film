export default function LegalPage() {
  return (
    <main className="legal-page"><div className="legal-shell">
      <a className="legal-back" href="/">← Back to ViralMovie AI</a>
      <h1>Security</h1>
      <div className="legal-content">
        <p>ViralMovie AI uses a server-side architecture for sensitive AI provider credentials and generation requests.</p>
        <p><strong>Current security practices include:</strong></p>
        <ul><li>AI provider API keys are stored as server-side environment variables and should never be committed to GitHub or exposed in browser code.</li><li>Generation requests are routed through server API endpoints so provider secrets are not intentionally sent to the client.</li><li>Important request parameters and accepted download URLs are validated by the application.</li><li>Production secrets should be stored in Vercel Environment Variables and rotated immediately if exposure is suspected.</li><li>Security logs and operational data may be used to detect abuse and troubleshoot the service.</li></ul>
        <p>Security is an ongoing process. No application, API, network or hosting provider can guarantee absolute security.</p>
        <p><strong>Responsible disclosure.</strong> If you discover a security vulnerability, please report it privately through the contact method provided on the ViralMovie AI website. Do not publicly disclose credentials, personal data or an exploitable vulnerability before we have had a reasonable opportunity to investigate.</p>
        <p>Last updated: September 2026.</p>
      </div>
    </div></main>
  );
}
