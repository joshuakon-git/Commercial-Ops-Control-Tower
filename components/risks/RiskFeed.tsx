import type { RiskEvent } from "@/lib/metrics/types";
import { formatCurrencyAmountsInText } from "@/lib/formatting/currency";

type RiskFeedProps = {
  risks: RiskEvent[];
  emptyLabel?: string;
};

export function RiskFeed({ risks, emptyLabel = "No operating risks" }: RiskFeedProps) {
  if (risks.length === 0) {
    return (
      <div className="empty-panel compact">
        <strong>{emptyLabel}</strong>
      </div>
    );
  }

  return (
    <div className="risk-feed">
      {risks.map((risk) => (
        <article className="risk-item" data-severity={risk.severity} key={risk.id}>
          <div className="risk-item-header">
            <div>
              <h3>{risk.title}</h3>
              <p>{formatCurrencyAmountsInText(risk.explanation)}</p>
            </div>
            <div className="risk-badges">
              <span className="tag">{risk.severity}</span>
              <span className={risk.status === "open" ? "tag warning" : "tag"}>{risk.status}</span>
            </div>
          </div>
          <div className="risk-action">
            <strong>Recommended action</strong>
            <span>{formatCurrencyAmountsInText(risk.recommendedAction)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
