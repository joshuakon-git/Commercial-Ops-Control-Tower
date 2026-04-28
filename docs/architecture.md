# Architecture

AI Commercial Ops Control Tower is a portfolio-grade operating layer for small-business commercial data. It uses seeded demo data, Supabase, n8n-as-code workflows, deterministic forecasting/risk rules, and a Next.js dashboard.

## Data Flow

```text
Seed CSVs / demo payloads
  -> ingestion workflow
  -> Supabase source tables
  -> daily metrics workflow
  -> metric snapshots
  -> forecast and risk workflow
  -> forecasts + risk events
  -> weekly AI report workflow
  -> AI reports + action log
  -> action automation workflow
  -> recommended actions + action log
  -> Next.js dashboard
```

The public demo should run against a hosted Supabase project that contains only safe seeded records. The dashboard reads through the Supabase anon key and RLS-protected demo tables.

## Database Tables

Source and import tables:

- `raw_uploads`: import source, status, row counts, and error summaries.
- `sales_orders`: cleaned order data with generated gross margin.
- `capacity_positions`: inventory/capacity position by resource or SKU.
- `crm_pipeline`: open/won/lost pipeline with generated weighted value.
- `expenses`: fixed and variable operating expenses.
- `targets`: revenue, margin, and pipeline coverage targets by period.

Operating output tables:

- `metric_snapshots`: daily KPI snapshots for revenue, margin, costs, pipeline, stock risk, and cash pressure.
- `forecasts`: explainable forecast rows, bounds, method name, and input summary.
- `risk_events`: deduped operating risks with severity, status, threshold, explanation, and recommended action.
- `ai_reports`: validated weekly management summaries.
- `recommended_actions`: owner-facing follow-up generated from risk events.
- `action_log`: workflow activity, notifications, invalid AI responses, and no-action outcomes.

RLS is enabled on every table. The demo read policies expose only safe seeded demo data.

## Workflows

All workflows are managed as TypeScript files in `workflows/local_5678_joshua_k/personal`.

| Workflow | ID | Responsibility |
| --- | --- | --- |
| Commercial Ops Ingestion | `k8jxAQfrhxP7i3vQ` | Accept demo payloads or webhook uploads, validate rows, clean sales order data, write import log records. |
| Commercial Ops Daily Metrics | `W4ZVf4l9JtpNhbH1` | Query source tables, calculate KPI snapshots, insert `metric_snapshots`, log workflow result. |
| Commercial Ops Forecast and Risk | `cQtgLAXrNmvbcbVX` | Load commercial inputs, calculate revenue forecast, detect operating risks, upsert deduped risks, insert forecasts. |
| Commercial Ops Weekly AI Report | `NwsCx9dJMP1uOYOc` | Pull a structured operating payload, generate a JSON weekly report, validate fields, store `ai_reports`, log/report notification activity. |
| Commercial Ops Action Automation | `zLSmXRKeh51hJjhO` | Find new high-priority risks, classify actions, create `recommended_actions`, notify/log when configured. |

Each workflow has a manual demo path so the portfolio run does not depend on waiting for schedules.

## Forecasting and Risk Rules

Forecasting is deterministic and explainable. The current service uses a four-week average revenue method with lower and upper bounds derived from observed weekly revenue.

Risk detection uses explicit rules:

- `revenue_pacing`: projected revenue falls below the target tolerance.
- `margin_drop`: gross margin percentage drops by at least five percentage points.
- `stockout_risk`: capacity cover days fall inside lead time, demonstrated by `SKU-003`.
- `deal_slippage`: an open deal is past expected close, demonstrated by `Wholesale Expansion`.
- `expense_pressure`: expense growth exceeds revenue growth.

This keeps the MVP easy to audit. Heavier ML or connector-specific scoring belongs in phase two.

## Dashboard Views

- `/dashboard`: executive operating picture with KPI tiles, latest AI summary, urgent risks, and recent actions.
- `/forecasts-risks`: revenue forecast chart, target pacing, pipeline coverage, margin trend, expense pressure, and capacity cover risks.
- `/actions`: action queue with priority, owner, due date, status, and linked risk context.
- `/data-health`: import history, source table row coverage, workflow readiness, report recency, and stale data warnings.

The dashboard is a read-only public surface over demo data. It uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Deployment Posture

- Dashboard: deploy to Vercel.
- Database: hosted Supabase project seeded with safe demo data.
- n8n: local/self-hosted demo, or hosted n8n if available.
- Screenshots/video: capture after the seeded demo run has populated metrics, forecasts, risks, AI report, actions, and data-health records.
- Public demo: expose only safe demo data through the Supabase anon key.

## Verification Posture

Local verification for the current MVP:

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

When workflow files are changed and pushed, live verification should be recorded with the workflow IDs listed above.
