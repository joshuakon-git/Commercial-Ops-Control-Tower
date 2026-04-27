import type { KpiTileModel } from "@/lib/metrics/types";

const stateLabels: Record<KpiTileModel["state"], string> = {
  good: "On track",
  neutral: "Watching",
  warning: "Needs attention",
  danger: "Critical",
};

export function KpiTile({ label, value, deltaLabel, state }: KpiTileModel) {
  return (
    <article className="metric-cell kpi-tile" data-state={state}>
      <div className="kpi-tile-header">
        <span className="metric-label">{label}</span>
        <span className="kpi-state">{stateLabels[state]}</span>
      </div>
      <div>
        <strong className="metric-value">{value}</strong>
        {deltaLabel ? <p className="kpi-delta">{deltaLabel}</p> : null}
      </div>
    </article>
  );
}
