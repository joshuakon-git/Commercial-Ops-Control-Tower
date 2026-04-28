# AI Commercial Ops Control Tower

A portfolio-grade operating layer for small businesses that turns sales, costs, pipeline, and capacity data into KPIs, forecasts, risk events, AI management summaries, and recommended actions.

The MVP uses safe seeded demo data, Supabase, n8n-as-code workflows, deterministic forecasting/risk rules, and a Next.js dashboard.

## Portfolio Positioning

This project demonstrates an end-to-end commercial operations loop:

1. Ingest messy operating data.
2. Normalize it into an operational database.
3. Calculate commercial KPIs.
4. Forecast revenue and detect risks.
5. Generate a validated AI management report.
6. Create recommended actions for operator follow-up.
7. Present the current operating picture in a dashboard.

It is intentionally explainable. The forecasting and risk layer favors deterministic business rules over opaque ML so a reviewer can trace each recommendation back to demo data.

## Architecture

```text
Seed CSVs / demo payloads
  -> n8n ingestion workflow
  -> Supabase source tables
  -> n8n daily metrics workflow
  -> metric snapshots
  -> n8n forecast and risk workflow
  -> forecasts + risk events
  -> n8n weekly AI report workflow
  -> AI reports + action log
  -> n8n action automation workflow
  -> recommended actions + action log
  -> Next.js dashboard on Vercel
```

Core documentation:

- [Demo script](docs/demo-script.md)
- [Architecture guide](docs/architecture.md)
- [Implementation plan](docs/superpowers/plans/2026-04-27-ai-commercial-ops-control-tower.md)

## MVP Scope

- Seeded demo commercial data.
- Supabase operational database with RLS enabled.
- n8n-as-code automation workflows.
- Explainable forecasting and risk rules.
- Validated weekly AI ops summary.
- Recommended action queue.
- Next.js operator dashboard with four views.

## Dashboard Views

- `/dashboard`: KPI tiles, latest AI summary, urgent risks, and recent actions.
- `/forecasts-risks`: revenue forecast chart, target pacing, slipping deals, margin pressure, expense pressure, and capacity risks.
- `/actions`: full recommended action queue with owner, due date, priority, status, and linked risk.
- `/data-health`: import history, source table coverage, workflow recency, and stale data warnings.

## Screenshots

Capture these after the seeded demo run has populated metrics, forecasts, risks, AI report, actions, and data-health records.

| Slot | Dashboard route | Capture |
| --- | --- | --- |
| Overview | `/dashboard` | KPI tiles, AI summary, urgent risks, and recent actions. |
| Forecasts & Risks | `/forecasts-risks` | Revenue forecast chart plus risk sections for pacing, deals, margin/expenses, and capacity. |
| Actions | `/actions` | Action queue showing priority, owner, due date, status, and linked risk context. |
| Data Health | `/data-health` | Import history, source table coverage, stale data warnings, and workflow/report readiness. |

## Setup

Install dependencies:

```powershell
npm install
```

Create or select a hosted Supabase project containing only safe demo data. Apply:

```text
supabase/migrations/001_initial_schema.sql
supabase/seed/seed.sql
```

Configure the dashboard with public Supabase read settings:

```powershell
NEXT_PUBLIC_SUPABASE_URL=<your-demo-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-demo-anon-key>
```

Confirm the n8n-as-code workspace is initialized before running workflow commands:

```powershell
npx --yes n8nac list
```

The active local workflow directory is:

```text
workflows/local_5678_joshua_k/personal
```

## Demo

Use [docs/demo-script.md](docs/demo-script.md) as the reviewer run-through.

Short version:

1. Reset or load the Supabase demo schema and seed data.
2. Run `Commercial Ops Ingestion`.
3. Run `Commercial Ops Daily Metrics`.
4. Run `Commercial Ops Forecast and Risk`.
5. Run `Commercial Ops Weekly AI Report`.
6. Run `Commercial Ops Action Automation`.
7. Start the dashboard and review the four dashboard pages.

Workflow IDs:

| Workflow | ID |
| --- | --- |
| Commercial Ops Ingestion | `k8jxAQfrhxP7i3vQ` |
| Commercial Ops Daily Metrics | `W4ZVf4l9JtpNhbH1` |
| Commercial Ops Forecast and Risk | `cQtgLAXrNmvbcbVX` |
| Commercial Ops Weekly AI Report | `NwsCx9dJMP1uOYOc` |
| Commercial Ops Action Automation | `zLSmXRKeh51hJjhO` |

Run the dashboard locally:

```powershell
npm run dev
```

## Verification

```powershell
npm run typecheck
npm run build
python -m pytest services/forecasting/test_forecast.py -v
npx --yes n8nac list
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/ingestion.workflow.ts
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/action-automation.workflow.ts
```

## Deployment

- Dashboard: deploy the Next.js app to Vercel.
- Database: use a hosted Supabase project seeded with safe demo data.
- n8n: run local/self-hosted for a recorded demo, or hosted n8n if available.
- Screenshots/video: capture only after the seeded demo run has populated the operating outputs.
- Public demo: expose only safe demo data through the Supabase anon key.

## Security

- Dashboard reads safe demo data through the Supabase anon key.
- Supabase RLS is enabled in the schema.
- Public portfolio artifacts should use seeded demo records only.
- Local environment files and private connection values are never committed.

## Phase-Two Roadmap

- Add live connectors for commerce, payments, CRM, finance, and spreadsheet sources.
- Add operator controls for acknowledging risks and updating action status from the dashboard.
- Add richer audit history for workflow runs and action lifecycle changes.
- Add scenario modeling for target changes, constrained inventory, and pipeline pull-forward.
- Add tenant-aware access controls if this becomes a hosted multi-business product.
- Expand report generation into role-specific executive, sales, finance, and operations summaries.
