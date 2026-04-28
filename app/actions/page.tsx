import { ActionTable } from "@/components/actions/ActionTable";
import { getActionQueue, getOperatingRiskEvents } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const [actions, risks] = await Promise.all([getActionQueue(), getOperatingRiskEvents()]);
  const openCount = actions.filter((action) => action.status === "open").length;
  const inProgressCount = actions.filter((action) => action.status === "in_progress").length;
  const highPriorityOpenRiskCount = risks.filter((risk) => risk.status === "open" && risk.severity === "high").length;

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Actions</p>
        <h1 className="page-title">Recommended action queue</h1>
        <p className="page-description">
          Track owner follow-up, priority, due dates, status, and linked risk events from the automation workflow.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Action queue</h2>
            <p>Actions move from open to in progress, then done or dismissed.</p>
          </div>
          <span className="tag">
            {openCount} open / {inProgressCount} in progress
          </span>
        </div>
        <ActionTable
          actions={actions}
          risks={risks}
          emptyDetail={
            highPriorityOpenRiskCount === 0
              ? "No actions exist because there are no open high-priority risks. Run forecast/risk first, then action automation."
              : "Open high-priority risks exist; run action automation to create owner follow-up."
          }
        />
      </section>
    </>
  );
}
