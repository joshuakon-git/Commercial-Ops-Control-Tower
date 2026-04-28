import { formatShortDate } from "@/lib/formatting/dates";
import { buildDataHealthChecks } from "@/lib/metrics/transforms";
import {
  getLatestAiReport,
  getLatestImports,
  getLatestMetricSnapshot,
  getLatestWorkflowRun,
  getRequiredSourceTableCounts,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DataHealthPage() {
  const [latestImports, latestSnapshot, latestWorkflowRun, sourceTableCounts, latestAiReport] = await Promise.all([
    getLatestImports(),
    getLatestMetricSnapshot(),
    getLatestWorkflowRun(),
    getRequiredSourceTableCounts(),
    getLatestAiReport(),
  ]);
  const healthChecks = buildDataHealthChecks({
    latestImports,
    latestSnapshot,
    latestWorkflowRun,
    sourceTableCounts,
    latestAiReport,
  });
  const warningCount = healthChecks.filter((check) => check.state !== "ok").length;

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
            <h2>Stale data warnings</h2>
            <p>Health checks for import age, metric freshness, workflow runs, source coverage, and AI report recency.</p>
          </div>
          <span className={warningCount > 0 ? "tag warning" : "tag"}>{warningCount} warnings</span>
        </div>
        <div className="status-list">
          {healthChecks.map((check) => (
            <div className="status-row health-row" data-state={check.state} key={check.label}>
              <strong>{check.label}</strong>
              <span>{check.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="section-grid two-column">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Import history</h2>
              <p>Latest source imports from Supabase raw upload records.</p>
            </div>
          </div>
          {latestImports.length > 0 ? (
            <div className="status-list">
              {latestImports.map((item) => (
                <div className="status-row" key={item.id}>
                  <strong>{item.sourceName}</strong>
                  <span>
                    {item.status} / {item.rowsImported} of {item.rowsReceived} rows / {formatShortDate(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact">
              <strong>No imports found</strong>
            </div>
          )}
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Source table coverage</h2>
              <p>Required source tables used by metrics, forecasts, and risks.</p>
            </div>
          </div>
          <div className="status-list">
            {sourceTableCounts.map((item) => (
              <div className="status-row" key={item.tableName}>
                <strong>{item.tableName}</strong>
                <span>{item.rowCount} rows</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
