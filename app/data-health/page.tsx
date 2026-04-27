const healthRules = [
  "No successful import in the last 7 days",
  "No metric snapshot in the last 48 hours",
  "Latest workflow run failed",
  "Required source table has zero rows",
  "Latest AI report is older than 8 days",
];

export default function DataHealthPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Data Health</p>
        <h1 className="page-title">Import and workflow readiness</h1>
        <p className="page-description">
          Watch source freshness, workflow outcomes, missing data, and report recency before trusting the operating view.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Health checks</h2>
            <p>These checks define the data-health surface for later workflow and query wiring.</p>
          </div>
          <span className="tag">Defined</span>
        </div>
        <div className="status-list">
          {healthRules.map((rule) => (
            <div className="status-row" key={rule}>
              <strong>{rule}</strong>
              <span>Waiting for live status</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
