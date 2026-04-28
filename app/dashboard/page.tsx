import { ActionTable } from "@/components/actions/ActionTable";
import { KpiTile } from "@/components/kpi/KpiTile";
import { RiskFeed } from "@/components/risks/RiskFeed";
import { formatShortDate } from "@/lib/formatting/dates";
import { buildKpiTiles } from "@/lib/metrics/transforms";
import {
  getLatestAiReport,
  getLatestImports,
  getLatestMetricSnapshot,
  getOperatingRiskEvents,
  getRecommendedActions,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snapshot, riskEvents, aiReport, recommendedActions, latestImports] = await Promise.all([
    getLatestMetricSnapshot(),
    getOperatingRiskEvents(),
    getLatestAiReport(),
    getRecommendedActions(),
    getLatestImports(),
  ]);
  const kpiTiles = buildKpiTiles(snapshot, latestImports);
  const urgentRisks = riskEvents.filter((risk) => risk.status === "open").slice(0, 3);
  const recentActions = recommendedActions.slice(0, 4);

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
              <h2>Urgent risks</h2>
              <p>Open operating risks that need attention before the next workflow cycle.</p>
            </div>
          </div>
          <RiskFeed risks={urgentRisks} emptyLabel="No open risks" />
        </section>
      </div>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Recent actions</h2>
            <p>Active follow-up created from operating risks.</p>
          </div>
          <span className="tag">{recentActions.length} active</span>
        </div>
        <ActionTable actions={recentActions} risks={riskEvents} />
      </section>
    </>
  );
}
