# Demo Script

This run-through is written for a portfolio reviewer. It shows the operating loop from demo data through metrics, forecasts, risks, AI reporting, and action follow-up.

## 1. Reset or Load Demo Data

Use a hosted Supabase project that contains only safe demo data.

Apply the schema and seed data from the repo:

```powershell
# Option A: run these files in the Supabase SQL editor
supabase/migrations/001_initial_schema.sql
supabase/seed/seed.sql
```

If using a local database client, run the same SQL files against the demo database. Do not use production business data for the public portfolio run.

The seeded state should include:

- Source records in `sales_orders`, `capacity_positions`, `crm_pipeline`, `expenses`, and `targets`.
- Import history in `raw_uploads`.
- Inputs that produce the expected demo risks: revenue pacing, margin drop, stockout risk for `SKU-003`, deal slippage for `Wholesale Expansion`, and expense pressure.

## 2. Run Ingestion

Workflow: `Commercial Ops Ingestion`  
ID: `k8jxAQfrhxP7i3vQ`  
File: `workflows/local_5678_joshua_k/personal/ingestion.workflow.ts`

Use the manual demo trigger in n8n, or call the production webhook after confirming the workflow is active.

```powershell
npx --yes n8nac workflow activate k8jxAQfrhxP7i3vQ
npx --yes n8nac test-plan k8jxAQfrhxP7i3vQ --json
npx --yes n8nac test k8jxAQfrhxP7i3vQ --prod
```

Expected result: `raw_uploads` records show import status and row counts, and cleaned commercial rows are available for downstream metrics.

## 3. Run Daily Metrics

Workflow: `Commercial Ops Daily Metrics`  
ID: `W4ZVf4l9JtpNhbH1`  
File: `workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts`

Run the manual trigger in n8n for the demo.

Expected result: a new `metric_snapshots` record with revenue, gross margin, operating costs, net contribution, average order value, sales velocity, weighted pipeline, pipeline coverage, stock risk count, and cash pressure score.

## 4. Run Forecast and Risk Detection

Workflow: `Commercial Ops Forecast and Risk`  
ID: `cQtgLAXrNmvbcbVX`  
File: `workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts`

Run the manual trigger in n8n.

Expected result:

- `forecasts` receives revenue forecast rows using the explainable four-week average method.
- `risk_events` receives open or acknowledged risks for revenue pacing, margin drop, stockout risk, deal slippage, and expense pressure.
- Existing open risks are updated through dedupe keys rather than duplicated.

## 5. Generate Weekly AI Report

Workflow: `Commercial Ops Weekly AI Report`  
ID: `NwsCx9dJMP1uOYOc`  
File: `workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts`

Run the manual trigger in n8n after metrics, forecasts, and risks exist.

Expected result:

- The workflow builds a structured operating payload.
- The AI response is validated as JSON before storage.
- A valid report is inserted into `ai_reports`.
- Notification/action activity is recorded in `action_log`.

If the workflow reports a configuration gap in n8n, stop and configure the required n8n connection in the UI. Do not edit workflow code just to work around a missing connection.

## 6. Run Action Automation

Workflow: `Commercial Ops Action Automation`  
ID: `zLSmXRKeh51hJjhO`  
File: `workflows/local_5678_joshua_k/personal/action-automation.workflow.ts`

Run the manual trigger in n8n.

Expected result: high-priority open risks create `recommended_actions` records, Slack notification activity is logged when configured, and no-action cases are also recorded in `action_log`.

## 7. View the Dashboard

Start the dashboard locally:

```powershell
npm run dev
```

Open the local Next.js URL and review:

- `/dashboard`: KPI tiles, latest AI summary, urgent risks, and recent actions.
- `/forecasts-risks`: revenue forecast chart, pacing notes, slipping deals, margin/expense risks, and capacity risks.
- `/actions`: full recommended action queue with owner, due date, priority, status, and linked risk context.
- `/data-health`: import history, source table coverage, workflow recency, and stale data warnings.

## 8. Explain the Action Queue Lifecycle

The action queue turns risk detection into operating follow-up:

1. `forecast-risk.workflow.ts` creates or updates open `risk_events`.
2. `action-automation.workflow.ts` selects new high-priority risks.
3. The workflow classifies each action, inserts `recommended_actions`, and logs the automation result.
4. Operators move actions from `open` to `in_progress`, then `done` or `dismissed`.
5. The dashboard keeps the queue visible alongside the risk that created each action.

For a portfolio recording, capture screenshots only after the seeded run has populated forecasts, risks, reports, actions, and import health.
