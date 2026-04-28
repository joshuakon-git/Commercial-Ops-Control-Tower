import { formatCurrencyAmountsInText } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/dates";
import type { RecommendedAction, RiskEvent } from "@/lib/metrics/types";

type ActionTableProps = {
  actions: RecommendedAction[];
  risks?: RiskEvent[];
  emptyDetail?: string;
};

function getRiskLabel(action: RecommendedAction, riskById: Map<string, RiskEvent>) {
  if (!action.riskEventId) {
    return "Unlinked";
  }

  return riskById.get(action.riskEventId)?.title ?? `Risk ${action.riskEventId.slice(0, 8)}`;
}

export function ActionTable({ actions, risks = [], emptyDetail }: ActionTableProps) {
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));

  if (actions.length === 0) {
    return (
      <div className="empty-panel">
        <strong>No recommended actions</strong>
        <span>{emptyDetail ?? "Action automation will add owner follow-up as risks are detected."}</span>
      </div>
    );
  }

  return (
    <div className="table-frame">
      <table className="ops-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Priority</th>
            <th>Owner</th>
            <th>Due date</th>
            <th>Status</th>
            <th>Linked risk</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>
                <strong>{formatCurrencyAmountsInText(action.title)}</strong>
                <span>{formatCurrencyAmountsInText(action.description)}</span>
              </td>
              <td>
                <span className={`priority-pill ${action.priority}`}>{action.priority}</span>
              </td>
              <td>{action.owner ?? "Unassigned"}</td>
              <td>{action.dueDate ? formatShortDate(action.dueDate) : "No due date"}</td>
              <td>{action.status.replaceAll("_", " ")}</td>
              <td>{formatCurrencyAmountsInText(getRiskLabel(action, riskById))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
