# AI Commercial Ops Control Tower Design

## Purpose

AI Commercial Ops Control Tower is a portfolio-grade operating layer for small businesses that currently run on spreadsheets, CRM exports, sales reports, and owner intuition. The project ingests messy commercial data, normalizes it into a Supabase operational database, calculates KPIs and forecasts, detects commercial risks, generates AI management summaries, and triggers follow-up actions.

The portfolio signal is not "AI dashboard." The signal is a closed operating loop:

1. Reporting: what happened.
2. Forecasting: what is likely to happen.
3. Actioning: what someone should do next.

## Target User

The target user is an owner, operator, finance lead, or commercial manager at a generic small business. They care about revenue pacing, margin pressure, pipeline coverage, stock or capacity risk, and whether next week has enough clear actions.

The first version uses realistic seeded demo data instead of live third-party authentication. Later versions can add connectors for Shopify, Stripe, Google Sheets, Pipedrive, HubSpot, Xero, Notion, Airtable, or email exports.

## System Boundary

Version one includes:

- Seeded CSV/demo data for sales, expenses, pipeline, inventory or capacity, and targets.
- Supabase Postgres schema and seed scripts.
- n8n-as-code workflows for ingestion, metric calculation, forecasting/risk creation, weekly AI reports, and action automation.
- Next.js dashboard with operational views.
- OpenAI-generated weekly summary from structured metrics and risks.
- Slack/email-ready notification path, with Slack first.
- Action queue and action log.

Version one excludes:

- Production authentication.
- Multi-tenant account management.
- Live billing, accounting, or CRM OAuth.
- Complex machine-learning forecasting.
- Full CRM writeback beyond a planned phase-two extension.

## Architecture

```text
CSV / Demo Data / Future Connectors
        |
        v
n8n Ingestion Workflows
        |
        v
Supabase Postgres
  - import logs
  - cleaned operational tables
  - metric snapshots
  - forecasts
  - risk events
  - AI reports
  - recommended actions
  - action log
        |
        +--> Forecasting + Risk Engine
        |
        +--> AI Insight Generator
        |
        v
Next.js Dashboard
        |
        +--> Slack / Email Reports
        +--> Action Queue / Audit Trail
```

## Technology Choices

- Frontend: Next.js, React, TypeScript.
- Styling: Tailwind CSS, with restrained operational UI.
- Charts: Recharts.
- Database: Supabase Postgres.
- Automation: n8n workflows managed as TypeScript files with n8n-as-code.
- AI: OpenAI, called from n8n for weekly reports and risk explanations.
- Forecasting: Python script/service using Pandas-style time-series calculations in version one.
- Notifications: Slack first, email second.

## Repository Layout

```text
/
  AGENTS.md
  n8nac-config.json
  package.json

  app/
    dashboard/
    forecasts/
    pipeline/
    costs-margin/
    capacity/
    actions/
    data-health/

  components/
    layout/
    kpi/
    charts/
    risks/
    actions/

  lib/
    supabase/
    metrics/
    formatting/
    demo-data/

  supabase/
    migrations/
    seed/

  services/
    forecasting/

  workflows/
    local_5678_joshua_k/
      personal/
        ingestion.workflow.ts
        daily-metrics.workflow.ts
        forecast-risk.workflow.ts
        weekly-ai-report.workflow.ts
        action-automation.workflow.ts

  docs/
    superpowers/
      specs/
      plans/
```

The active n8n-as-code workflow directory is `workflows/local_5678_joshua_k/personal`, as defined by `n8nac-config.json`. New workflow files must be created there, never at repo root.

## Data Sources

Version one uses seeded CSVs or equivalent seed records:

- `sales_orders.csv`: `order_date`, `customer`, `product`, `sku`, `units`, `revenue`, `discount`, `channel`, `unit_cost`.
- `inventory.csv`: `sku`, `stock_on_hand`, `reorder_point`, `supplier_lead_time_days`, `unit_cost`.
- `pipeline.csv`: `deal_name`, `stage`, `value`, `probability`, `expected_close_date`, `owner`.
- `expenses.csv`: `expense_date`, `category`, `supplier`, `amount`, `fixed_or_variable`.
- `targets.csv`: `period_start`, `period_end`, `revenue_target`, `gross_margin_target`, `pipeline_coverage_target`.

## Database Design

### `raw_uploads`

Tracks each import attempt.

Fields:

- `id`
- `source_name`
- `source_type`
- `file_name`
- `status`
- `rows_received`
- `rows_imported`
- `rows_failed`
- `error_summary`
- `created_at`

### `sales_orders`

Cleaned sales/order data.

Fields:

- `id`
- `raw_upload_id`
- `order_date`
- `customer`
- `product`
- `sku`
- `units`
- `revenue`
- `discount`
- `channel`
- `unit_cost`
- `gross_margin`
- `created_at`

### `inventory_positions`

Current stock or generic capacity state.

Fields:

- `id`
- `raw_upload_id`
- `sku`
- `stock_on_hand`
- `reorder_point`
- `supplier_lead_time_days`
- `unit_cost`
- `created_at`

### `crm_pipeline`

Open commercial pipeline.

Fields:

- `id`
- `raw_upload_id`
- `deal_name`
- `stage`
- `value`
- `probability`
- `weighted_value`
- `expected_close_date`
- `owner`
- `status`
- `created_at`

### `expenses`

Operating expenses.

Fields:

- `id`
- `raw_upload_id`
- `expense_date`
- `category`
- `supplier`
- `amount`
- `fixed_or_variable`
- `created_at`

### `targets`

Business targets by period.

Fields:

- `id`
- `period_start`
- `period_end`
- `revenue_target`
- `gross_margin_target`
- `pipeline_coverage_target`
- `created_at`

### `metric_snapshots`

Daily or weekly KPI rollups.

Fields:

- `id`
- `snapshot_date`
- `period`
- `revenue`
- `gross_margin`
- `gross_margin_pct`
- `operating_costs`
- `net_contribution`
- `average_order_value`
- `sales_velocity`
- `weighted_pipeline`
- `pipeline_coverage`
- `stock_risk_count`
- `cash_pressure_score`
- `created_at`

### `forecasts`

Forward-looking estimates.

Fields:

- `id`
- `forecast_date`
- `forecast_type`
- `period_start`
- `period_end`
- `predicted_value`
- `lower_bound`
- `upper_bound`
- `method`
- `inputs_summary`
- `created_at`

### `risk_events`

Detected risks requiring attention.

Fields:

- `id`
- `risk_type`
- `severity`
- `status`
- `metric_name`
- `metric_value`
- `threshold_value`
- `title`
- `explanation`
- `recommended_action`
- `source_table`
- `source_record_id`
- `detected_at`
- `resolved_at`

### `ai_reports`

AI-generated management summaries.

Fields:

- `id`
- `report_period_start`
- `report_period_end`
- `summary`
- `what_changed`
- `needs_attention`
- `likely_causes`
- `recommended_actions`
- `next_7_days_priorities`
- `slack_text`
- `model`
- `input_payload`
- `created_at`

### `recommended_actions`

Action queue for the operator.

Fields:

- `id`
- `risk_event_id`
- `title`
- `description`
- `owner`
- `priority`
- `status`
- `due_date`
- `created_at`
- `completed_at`

### `action_log`

Audit trail for alerts, reports, and user decisions.

Fields:

- `id`
- `action_type`
- `target`
- `status`
- `payload`
- `result`
- `created_at`

## Metrics

Version one calculates:

- Revenue by week, month, and channel.
- Gross margin and gross margin percentage.
- Operating costs.
- Net contribution.
- Average order value.
- Sales velocity.
- Weighted pipeline value.
- Pipeline coverage against target.
- Stock or capacity cover.
- Forecast versus actual.
- Cash pressure proxy.

## Forecasting

Version one uses intentionally explainable forecasting:

- Four-week revenue forecast based on recent weekly revenue trend.
- Month-end revenue projection based on elapsed days and recent pace.
- Pipeline-adjusted revenue using weighted deal value expected inside the period.
- Stock or capacity cover based on recent unit sales velocity and lead time.
- Cost pressure based on fixed and variable expense trend compared with revenue trend.

The forecasting layer should store the method name and input summary with each forecast so the dashboard can explain why a forecast exists.

## Risk Rules

Version one detects:

- `revenue_pacing`: projected month-end revenue is more than 10% below target.
- `margin_drop`: gross margin percentage drops by at least 5 percentage points week over week.
- `pipeline_gap`: weighted pipeline coverage is below next-period target.
- `stockout_risk`: projected stock or capacity cover falls inside supplier lead time.
- `expense_pressure`: expenses are rising faster than revenue across the latest period.
- `deal_slippage`: high-value deal expected close date is in the past and status is still open.
- `sales_anomaly`: weekly revenue moves more than 30% above or below recent baseline.

Each risk event must include severity, explanation, recommended action, status, timestamp, and a link to the source metric or record where possible.

## AI Summary Design

The AI summary receives structured metrics, forecasts, and risk events. It does not receive raw messy tables.

System role:

```text
You are an operations analyst for a small business. Use only the supplied structured metrics, forecasts, and risk events. Do not invent causes, figures, or actions that are not supported by the payload.
```

Required sections:

1. What changed.
2. What needs attention.
3. Likely causes.
4. Recommended actions.
5. Next 7 days priorities.

The workflow saves both structured report fields and a Slack/email-ready version.

## n8n Workflow Design

All workflows must be created under `workflows/local_5678_joshua_k/personal`.

Before creating or editing any workflow:

1. Run `npx --yes n8nac list`.
2. Search relevant examples with `npx --yes n8nac skills examples search "<topic>"`.
3. Search exact nodes with `npx --yes n8nac skills search "<node or capability>"`.
4. Inspect exact schema with `npx --yes n8nac skills node-info <node>`.
5. Validate with `npx --yes n8nac skills validate <workflow-file>`.
6. Push with the full workflow file path.
7. Verify live workflow with `npx --yes n8nac verify <workflowId>` or `push --verify`.
8. For webhook/chat/form workflows, run `test-plan`, activate, and test with `--prod`.

### Ingestion Workflow

Pattern:

```text
Manual/Webhook Trigger -> Validate Payload -> Clean Rows -> Upsert Supabase -> Log Import
```

Responsibilities:

- Accept seeded demo payloads or upload webhook data.
- Validate required fields.
- Normalize dates, numbers, currency, and percentages.
- Insert a `raw_uploads` record.
- Upsert cleaned rows into target tables.
- Mark import as succeeded or failed.

### Daily Metrics Workflow

Pattern:

```text
Schedule -> Query Supabase -> Calculate Metrics -> Write metric_snapshots -> Flag Missing Data
```

Responsibilities:

- Run daily.
- Pull cleaned sales, expense, pipeline, inventory/capacity, and target data.
- Calculate current-period metrics.
- Save `metric_snapshots`.
- Create data health risks or import warnings when required data is stale.

### Forecast + Risk Workflow

Pattern:

```text
Schedule -> Load Metrics -> Run Forecast -> Compare Thresholds -> Create risk_events
```

Responsibilities:

- Run daily or weekly.
- Produce four-week forecasts.
- Compare forecasts and metrics against risk rules.
- Create or update open `risk_events`.
- Avoid duplicate open risks for the same risk type/source record.

### Weekly AI Report Workflow

Pattern:

```text
Monday Schedule -> Pull KPIs/Risks -> Build Structured Prompt -> OpenAI Summary -> Save ai_report -> Send Slack/Email
```

Responsibilities:

- Run Monday morning.
- Build a structured JSON payload from recent snapshots, forecasts, and open risks.
- Generate a management summary.
- Save `ai_reports`.
- Send Slack notification if credentials are configured.
- Record output in `action_log`.

### Action Automation Workflow

Pattern:

```text
New High-Severity Risk -> Classify Severity -> Create Recommended Action -> Notify -> Write action_log
```

Responsibilities:

- React to new high-priority risks.
- Create `recommended_actions`.
- Notify Slack/email for high-severity events.
- Preserve an audit trail.

## Dashboard Design

The dashboard should feel like an operator cockpit: dense, calm, and built for repeated use. It should not feel like a landing page.

### Overview

- KPI tiles: revenue this month, gross margin, projected month-end revenue, risk count, pipeline coverage, cash pressure.
- Latest AI weekly summary.
- Urgent risk feed.
- Recent recommended actions.

### Forecasts

- Revenue forecast versus actuals.
- Month-end projection.
- Target pacing.
- Forecast confidence notes.

### Pipeline

- Weighted pipeline.
- Coverage gap.
- Deals expected this period.
- Slipping deals.

### Costs & Margin

- Gross margin trend.
- Operating cost trend.
- Expense pressure alerts.
- Net contribution.

### Capacity / Inventory

- Stock or capacity cover.
- Reorder suggestions.
- Stockout/capacity risks.
- SKU or capacity unit table.

### Actions

- Recommended action queue.
- Status, priority, owner, due date.
- Linked risk event.
- Action history.

### Data Health

- Latest imports.
- Failed imports.
- Missing required fields.
- Last successful workflow timestamps.

## Error Handling

Ingestion errors must be recorded in `raw_uploads` and surfaced in Data Health.

Workflow runtime issues should be classified:

- Configuration gap: missing credentials, missing model, missing environment variable. Stop and tell the operator what must be configured.
- Runtime state issue: webhook is not registered or test URL is not armed. Do not rewrite workflow logic blindly.
- Wiring error: bad expression, wrong field, invalid transformation. Fix, push, verify, and test again.

Dashboard errors should be explicit and operational:

- Empty state when no demo data exists.
- Data freshness warning when imports or snapshots are stale.
- Clear failed state when Supabase queries fail.

## Testing Strategy

Testing should prove the system loop works:

- Database migration applies cleanly.
- Seed data loads repeatably.
- Metric calculations match known expected values.
- Forecast/risk rules produce deterministic outputs from demo data.
- AI prompt builder sends structured data, not raw tables.
- Dashboard renders empty, loading, populated, and error states.
- n8n workflow files validate locally and verify after push.
- Webhook/chat/form workflows use `test-plan`, activation, and production tests after push.

## Portfolio Deliverables

The final project should include:

- README with positioning, screenshots, architecture diagram, and demo script.
- Supabase schema and seed data.
- n8n workflows as TypeScript files.
- Dashboard with seven operational views.
- Example AI weekly report.
- Example risk events and recommended actions.
- Short phase-two roadmap for live connectors and CRM task creation.

## Phase Two

After MVP:

- Google Sheets sync.
- Stripe or Shopify ingestion.
- Pipedrive/HubSpot task creation.
- Xero/QuickBooks expense import.
- Operator feedback loop for accepted/rejected recommendations.
- User-configurable thresholds.
- More advanced forecasting service.
