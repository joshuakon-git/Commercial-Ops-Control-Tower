import { KpiTile } from "@/components/kpi/KpiTile";
import { formatShortDate } from "@/lib/formatting/dates";
import { buildKpiTiles } from "@/lib/metrics/transforms";
import {
  getLatestAiReport,
  getLatestImports,
  getLatestMetricSnapshot,
  getOpenRiskEvents,
  getRecommendedActions,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snapshot, riskEvents, aiReport, recommendedActions, latestImports] = await Promise.all([
    getLatestMetricSnapshot(),
    getOpenRiskEvents(),
    getLatestAiReport(),
    getRecommendedActions(),
    getLatestImports(),
  ]);
  const kpiTiles = buildKpiTiles(snapshot, latestImports);

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
            <p>Latest metric snapshot and import freshness from Supabase.</p>
          </div>
          <span className="tag">{snapshot ? formatShortDate(snapshot.snapshotDate) : "No snapshot"}</span>
        </div>
        <div className="metric-row">
          {kpiTiles.map((metric) => (
            <KpiTile key={metric.label} {...metric} />
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
          {aiReport ? (
            <div className="status-list">
              <div className="status-row">
                <strong>{aiReport.summary}</strong>
                <span>{formatShortDate(aiReport.createdAt)}</span>
              </div>
              <div className="status-row">
                <strong>Needs attention</strong>
                <span>{aiReport.needsAttention}</span>
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <strong>No weekly report generated yet</strong>
              <span>Report records will appear here after the weekly AI workflow runs.</span>
            </div>
          )}
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Risks and actions</h2>
              <p>Open operating risks and owner follow-up from the action queue.</p>
            </div>
          </div>
          {riskEvents.length > 0 ? (
            <div className="status-list">
              {riskEvents.map((risk) => (
                <div className="status-row" key={risk.id}>
                  <strong>{risk.title}</strong>
                  <span>{risk.severity}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact">
              <strong>No open risks</strong>
            </div>
          )}

          {recommendedActions.length > 0 ? (
            <div className="status-list stacked-list">
              {recommendedActions.map((action) => (
                <div className="status-row" key={action.id}>
                  <strong>{action.title}</strong>
                  <span>{action.owner ?? action.priority}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact stacked-list">
              <strong>No recommended actions</strong>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
