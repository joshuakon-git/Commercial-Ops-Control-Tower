export default function ActionsPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Actions</p>
        <h1 className="page-title">Recommended action queue</h1>
        <p className="page-description">
          Track owner follow-up, priority, due dates, and linked risk events once automation starts creating actions.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Action queue</h2>
            <p>Actions will use their own lifecycle: open, in progress, done, or dismissed.</p>
          </div>
          <span className="tag">Empty</span>
        </div>
        <div className="empty-panel">
          <strong>No recommended actions</strong>
          <span>High-severity risks will create action records in Task 10.</span>
        </div>
      </section>
    </>
  );
}
