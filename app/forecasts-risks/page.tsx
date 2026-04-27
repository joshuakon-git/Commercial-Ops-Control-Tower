const sections = [
  {
    title: "Pipeline",
    status: "Waiting for weighted pipeline snapshots",
  },
  {
    title: "Costs & Margin",
    status: "Waiting for margin trend and expense pressure calculations",
  },
  {
    title: "Capacity",
    status: "Waiting for cover days and stockout risk calculations",
  },
];

export default function ForecastsRisksPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Forecasts & Risks</p>
        <h1 className="page-title">Forward view and risk signals</h1>
        <p className="page-description">
          Review revenue projection, target pacing, slipping deals, margin pressure, and capacity risks in one operating surface.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Revenue forecast</h2>
            <p>Forecast chart and confidence notes will connect after the forecasting layer is in place.</p>
          </div>
          <span className="tag warning">Pending data</span>
        </div>
        <div className="empty-panel">
          <strong>No forecast generated yet</strong>
          <span>Task 8 will write forecast rows and risk events for this view.</span>
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Operating risk sections</h2>
            <p>Pipeline, Costs & Margin, and Capacity remain sections here for the MVP.</p>
          </div>
        </div>
        <div className="status-list">
          {sections.map((section) => (
            <div className="status-row" key={section.title}>
              <strong>{section.title}</strong>
              <span>{section.status}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
