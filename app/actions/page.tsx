import { ActionTable } from "@/components/actions/ActionTable";
import { getActionQueue, getOperatingRiskEvents } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const [actions, risks] = await Promise.all([getActionQueue(), getOperatingRiskEvents()]);
  const openCount = actions.filter((action) => action.status === "open").length;
  const inProgressCount = actions.filter((action) => action.status === "in_progress").length;

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
        <ActionTable actions={actions} risks={risks} />
      </section>
    </>
  );
}
