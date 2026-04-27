import { formatCurrency } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/dates";

const placeholderMetrics = [
  { label: "Revenue MTD", value: formatCurrency(31120) },
  { label: "Gross margin", value: "36.2%" },
  { label: "Open risks", value: "0" },
  { label: "Last import", value: formatShortDate("2026-04-27") },
];

export default function DashboardPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Overview</p>
        <h1 className="page-title">Commercial operating picture</h1>
        <p className="page-description">
          Monitor revenue pace, margin pressure, pipeline coverage, and the next actions that need owner attention.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Selected KPIs</h2>
            <p>Seeded data is ready; live metric snapshots arrive in Task 4.</p>
          </div>
          <span className="tag">Foundation</span>
        </div>
        <div className="metric-row">
          {placeholderMetrics.map((metric) => (
            <div className="metric-cell" key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <strong className="metric-value">{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="section-grid two-column">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>AI summary</h2>
              <p>Weekly report output will appear here after the report workflow runs.</p>
            </div>
          </div>
          <div className="empty-panel">
            <strong>No weekly report generated yet</strong>
            <span>Task 9 will populate this area from validated AI report records.</span>
          </div>
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Risks and actions</h2>
              <p>Open risks and recommended actions will be linked as the loop comes online.</p>
            </div>
          </div>
          <div className="empty-panel">
            <strong>No open risks</strong>
            <span>No recommended actions</span>
          </div>
        </section>
      </div>
    </>
  );
}
