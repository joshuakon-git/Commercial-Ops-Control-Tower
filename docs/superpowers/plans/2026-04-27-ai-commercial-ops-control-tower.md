# AI Commercial Ops Control Tower Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portfolio-grade small-business commercial ops system that turns demo commercial data into KPIs, forecasts, risks, AI summaries, and recommended actions.

**Architecture:** Supabase is the operational store, n8n-as-code owns automation workflows, a Python forecasting service/script calculates explainable forecasts and risks, and a Next.js dashboard presents the operating layer. The MVP starts with seeded demo data and leaves live third-party connectors for phase two.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Recharts, Supabase Postgres, n8n-as-code, OpenAI, Python forecasting scripts.

---

## Planning Notes

The active n8n-as-code workflow directory is:

```text
workflows/local_5678_joshua_k/personal
```

Before creating or editing any `.workflow.ts` file, follow the repo n8n protocol:

1. Run `npx --yes n8nac list`.
2. Search relevant examples with `npx --yes n8nac skills examples search "<topic>"`.
3. Search exact nodes with `npx --yes n8nac skills search "<node or capability>"`.
4. Inspect schemas with `npx --yes n8nac skills node-info <node>`.
5. Validate with `npx --yes n8nac skills validate <workflow-file>`.
6. Push using the full workflow path.
7. Verify live workflow with `npx --yes n8nac verify <workflowId>` or `push --verify`.
8. For webhook/chat/form workflows, run `test-plan`, activate, and test with `--prod`.

## File Structure

Create or modify these areas:

```text
/
  .gitignore
  README.md
  package.json
  tsconfig.json
  next.config.ts
  postcss.config.js
  tailwind.config.ts

  app/
    layout.tsx
    page.tsx
    dashboard/page.tsx
    forecasts-risks/page.tsx
    actions/page.tsx
    data-health/page.tsx

  components/
    layout/AppShell.tsx
    kpi/KpiTile.tsx
    charts/RevenueForecastChart.tsx
    risks/RiskFeed.tsx
    actions/ActionTable.tsx

  lib/
    supabase/client.ts
    supabase/queries.ts
    metrics/types.ts
    metrics/transforms.ts
    formatting/currency.ts
    formatting/dates.ts

  supabase/
    migrations/001_initial_schema.sql
    seed/sales_orders.csv
    seed/capacity.csv
    seed/pipeline.csv
    seed/expenses.csv
    seed/targets.csv
    seed/seed.sql

  services/
    forecasting/README.md
    forecasting/requirements.txt
    forecasting/forecast.py
    forecasting/test_forecast.py

  workflows/local_5678_joshua_k/personal/
    ingestion.workflow.ts
    daily-metrics.workflow.ts
    forecast-risk.workflow.ts
    weekly-ai-report.workflow.ts
    action-automation.workflow.ts

  docs/
    demo-script.md
    architecture.md
```

## Task 1: Baseline Repository Hygiene

**Files:**

- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Modify: `package.json`

- [x] **Step 1: Create `.gitignore`**

Add:

```gitignore
node_modules/
.next/
out/
dist/
coverage/
.env
.env.*
!.env.example
__pycache__/
*.pyc
.pytest_cache/
.venv/
venv/
```

- [x] **Step 2: Create `.env.example`**

Add:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
DATABASE_URL=
```

Rules:

- Browser dashboard code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- n8n workflows and server-side scripts use `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` for privileged writes.
- OpenAI workflows use `OPENAI_API_KEY`.
- Slack workflows use `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`.
- No `.env` file or secret value is committed.

- [x] **Step 3: Update `README.md` with project positioning**

Add:

```markdown
# AI Commercial Ops Control Tower

A portfolio-grade operating layer for small businesses that turns sales, costs, pipeline, and capacity data into KPIs, forecasts, risk events, AI management summaries, and recommended actions.

## MVP

- Seeded demo commercial data
- Supabase operational database
- n8n-as-code automation workflows
- Explainable forecasting and risk rules
- AI weekly ops summary
- Next.js operator dashboard with four polished views

## Operating Loop

1. Ingest messy commercial data.
2. Normalize it into an operational database.
3. Calculate metrics and forecasts.
4. Detect risks.
5. Generate AI summaries.
6. Trigger recommended actions and alerts.

## Security

- Dashboard reads safe demo data through the Supabase anon key.
- Workflows and server scripts use service role or database credentials.
- Supabase RLS is enabled in the schema.
- Secrets are never committed.
```

- [x] **Step 4: Update `package.json` scripts**

Keep existing dependencies and add scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "n8n:list": "npx --yes n8nac list"
  },
  "dependencies": {
    "@n8n-as-code/skills": "^1.10.0"
  }
}
```

If Next.js dependencies are not installed yet, install them in Task 3.

- [x] **Step 5: Verify baseline files**

Run:

```powershell
git status --short
```

Expected: new README, `.gitignore`, and `.env.example`, existing n8n files still present.

- [x] **Step 6: Commit**

Run:

```powershell
git add .gitignore .env.example README.md package.json
git commit -m "chore: add project baseline"
```

## Task 2: Supabase Schema and Demo Data

**Files:**

- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed/sales_orders.csv`
- Create: `supabase/seed/capacity.csv`
- Create: `supabase/seed/pipeline.csv`
- Create: `supabase/seed/expenses.csv`
- Create: `supabase/seed/targets.csv`
- Create: `supabase/seed/seed.sql`

- [x] **Step 1: Write database migration**

Create `supabase/migrations/001_initial_schema.sql` with tables from the design spec:

```sql
create extension if not exists pgcrypto;

create table if not exists raw_uploads (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  file_name text,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  rows_received integer not null default 0,
  rows_imported integer not null default 0,
  rows_failed integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  raw_upload_id uuid references raw_uploads(id) on delete set null,
  order_date date not null,
  customer text not null,
  product text not null,
  sku text not null,
  units integer not null check (units >= 0),
  revenue numeric(12,2) not null check (revenue >= 0),
  discount numeric(12,2) not null default 0,
  channel text not null,
  unit_cost numeric(12,2) not null default 0,
  gross_margin numeric(12,2) generated always as (revenue - (units * unit_cost)) stored,
  created_at timestamptz not null default now()
);

create table if not exists capacity_positions (
  id uuid primary key default gen_random_uuid(),
  raw_upload_id uuid references raw_uploads(id) on delete set null,
  resource_code text not null,
  resource_name text not null,
  quantity_on_hand integer not null check (quantity_on_hand >= 0),
  reorder_point integer not null check (reorder_point >= 0),
  lead_time_days integer not null check (lead_time_days >= 0),
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists crm_pipeline (
  id uuid primary key default gen_random_uuid(),
  raw_upload_id uuid references raw_uploads(id) on delete set null,
  deal_name text not null,
  stage text not null,
  value numeric(12,2) not null check (value >= 0),
  probability numeric(5,2) not null check (probability >= 0 and probability <= 1),
  weighted_value numeric(12,2) generated always as (value * probability) stored,
  expected_close_date date not null,
  owner text not null,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  raw_upload_id uuid references raw_uploads(id) on delete set null,
  expense_date date not null,
  category text not null,
  supplier text not null,
  amount numeric(12,2) not null check (amount >= 0),
  fixed_or_variable text not null check (fixed_or_variable in ('fixed', 'variable')),
  created_at timestamptz not null default now()
);

create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  revenue_target numeric(12,2) not null,
  gross_margin_target numeric(5,2) not null,
  pipeline_coverage_target numeric(5,2) not null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  period text not null,
  revenue numeric(12,2) not null default 0,
  gross_margin numeric(12,2) not null default 0,
  gross_margin_pct numeric(5,2) not null default 0,
  operating_costs numeric(12,2) not null default 0,
  net_contribution numeric(12,2) not null default 0,
  average_order_value numeric(12,2) not null default 0,
  sales_velocity numeric(12,2) not null default 0,
  weighted_pipeline numeric(12,2) not null default 0,
  pipeline_coverage numeric(5,2) not null default 0,
  stock_risk_count integer not null default 0,
  cash_pressure_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists forecasts (
  id uuid primary key default gen_random_uuid(),
  forecast_date date not null,
  forecast_type text not null,
  period_start date not null,
  period_end date not null,
  predicted_value numeric(12,2) not null,
  lower_bound numeric(12,2),
  upper_bound numeric(12,2),
  method text not null,
  inputs_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists risk_events (
  id uuid primary key default gen_random_uuid(),
  risk_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  dedupe_key text not null,
  metric_name text,
  metric_value numeric(12,2),
  threshold_value numeric(12,2),
  title text not null,
  explanation text not null,
  recommended_action text not null,
  source_table text,
  source_record_id uuid,
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  report_period_start date not null,
  report_period_end date not null,
  summary text not null,
  what_changed text not null,
  needs_attention text not null,
  likely_causes text not null,
  recommended_actions text not null,
  next_7_days_priorities text not null,
  slack_text text not null,
  model text not null,
  input_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists recommended_actions (
  id uuid primary key default gen_random_uuid(),
  risk_event_id uuid references risk_events(id) on delete set null,
  title text not null,
  description text not null,
  owner text,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'dismissed')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists action_log (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  target text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_orders_order_date on sales_orders(order_date);
create index if not exists idx_expenses_expense_date on expenses(expense_date);
create index if not exists idx_crm_pipeline_expected_close on crm_pipeline(expected_close_date);
create index if not exists idx_metric_snapshots_date on metric_snapshots(snapshot_date);
create index if not exists idx_risk_events_status on risk_events(status);
create unique index if not exists idx_risk_events_open_dedupe on risk_events(dedupe_key) where status in ('open', 'acknowledged');
create index if not exists idx_recommended_actions_status on recommended_actions(status);

alter table raw_uploads enable row level security;
alter table sales_orders enable row level security;
alter table capacity_positions enable row level security;
alter table crm_pipeline enable row level security;
alter table expenses enable row level security;
alter table targets enable row level security;
alter table metric_snapshots enable row level security;
alter table forecasts enable row level security;
alter table risk_events enable row level security;
alter table ai_reports enable row level security;
alter table recommended_actions enable row level security;
alter table action_log enable row level security;

create policy "demo read raw uploads" on raw_uploads for select using (true);
create policy "demo read sales orders" on sales_orders for select using (true);
create policy "demo read capacity positions" on capacity_positions for select using (true);
create policy "demo read crm pipeline" on crm_pipeline for select using (true);
create policy "demo read expenses" on expenses for select using (true);
create policy "demo read targets" on targets for select using (true);
create policy "demo read metric snapshots" on metric_snapshots for select using (true);
create policy "demo read forecasts" on forecasts for select using (true);
create policy "demo read risk events" on risk_events for select using (true);
create policy "demo read ai reports" on ai_reports for select using (true);
create policy "demo read recommended actions" on recommended_actions for select using (true);
create policy "demo read action log" on action_log for select using (true);
```

- [x] **Step 2: Create demo CSVs**

Create enough rows to demonstrate:

- Revenue pacing below target.
- One margin drop.
- One slipping deal named `Wholesale Expansion`.
- One stockout/capacity risk for `SKU-003`.
- Expenses rising faster than revenue.

Use dates around the current month and the previous four weeks.

Expected demo risks:

| Risk type | Expected severity | Required source condition |
| --- | --- | --- |
| `revenue_pacing` | `high` | Current month revenue projects more than 10% below target. |
| `margin_drop` | `medium` | Latest gross margin percentage is at least 5 percentage points below the previous comparable period. |
| `stockout_risk` | `high` | `SKU-003` projects to run out inside `lead_time_days`. |
| `deal_slippage` | `high` | `Wholesale Expansion` is open and past expected close date. |
| `expense_pressure` | `medium` | Latest expense growth exceeds latest revenue growth. |

- [x] **Step 3: Create `supabase/seed/seed.sql`**

Seed data with explicit `copy` commands or insert statements matching the CSVs.

- [x] **Step 4: Verify SQL parses locally**

Run:

```powershell
Get-Content .\supabase\migrations\001_initial_schema.sql | Select-String "create table"
```

Expected: all core table names appear.

- [x] **Step 5: Verify expected demo outputs are represented**

Run:

```powershell
Select-String -Path .\supabase\seed\*.csv -Pattern "SKU-003|Wholesale Expansion"
```

Expected: `SKU-003` appears in `capacity.csv`, and `Wholesale Expansion` appears in `pipeline.csv`.

- [x] **Step 6: Commit**

Run:

```powershell
git add supabase
git commit -m "feat: add commercial ops schema and demo data"
```

## Task 3: Next.js Dashboard Foundation

**Files:**

- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/forecasts-risks/page.tsx`
- Create: `app/actions/page.tsx`
- Create: `app/data-health/page.tsx`
- Create: `components/layout/AppShell.tsx`
- Create: `lib/formatting/currency.ts`
- Create: `lib/formatting/dates.ts`
- Modify: `package.json`

- [x] **Step 1: Install frontend dependencies**

Run:

```powershell
npm install next react react-dom typescript @types/react @types/node tailwindcss postcss autoprefixer recharts lucide-react @supabase/supabase-js
```

Expected: dependencies are added to `package.json` and `package-lock.json`.

- [x] **Step 2: Initialize config files**

Create `tsconfig.json`, `next.config.ts`, `postcss.config.js`, and `tailwind.config.ts` using standard Next.js TypeScript configuration.

- [x] **Step 3: Create app shell**

Create `components/layout/AppShell.tsx` with navigation for:

```text
Overview
Forecasts & Risks
Actions
Data Health
```

Use compact navigation and restrained styling.

- [x] **Step 4: Create dashboard route stubs**

Create four MVP pages with page titles and empty-state content. Pipeline, Costs & Margin, and Capacity are sections within Forecasts & Risks for MVP, not separate routes.

- [x] **Step 5: Verify build**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands pass.

- [x] **Step 6: Commit**

Run:

```powershell
git add app components lib package.json package-lock.json tsconfig.json next.config.ts postcss.config.js tailwind.config.ts
git commit -m "feat: add dashboard foundation"
```

## Task 4: Supabase Query Layer and KPI Components

**Files:**

- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/queries.ts`
- Create: `lib/metrics/types.ts`
- Create: `lib/metrics/transforms.ts`
- Create: `components/kpi/KpiTile.tsx`
- Modify: `app/dashboard/page.tsx`

- [x] **Step 1: Define metric types**

Create types for KPI tiles, metric snapshots, forecasts, risk events, AI reports, recommended actions, and import health.

Use these metric formulas across dashboard transforms, workflows, and forecasting tests:

| Metric | Formula |
| --- | --- |
| `revenue` | `sum(sales_orders.revenue)` for the selected period. |
| `gross_margin` | `sum(sales_orders.gross_margin)`. |
| `gross_margin_pct` | `gross_margin / revenue`, stored as `0` when revenue is `0`. |
| `operating_costs` | `sum(expenses.amount)` for the selected period. |
| `net_contribution` | `gross_margin - operating_costs`. |
| `average_order_value` | `revenue / order_count`, stored as `0` when order count is `0`. |
| `sales_velocity` | `units sold / active selling days`. |
| `weighted_pipeline` | `sum(crm_pipeline.value * crm_pipeline.probability)` for open deals. |
| `pipeline_coverage` | `weighted_pipeline / next_period_revenue_target`, stored as `0` when target is `0`. |
| `capacity_cover_days` | `quantity_on_hand / average_daily_units`, treated as unlimited when average daily units are `0`. |
| `cash_pressure_score` | `expense_growth - revenue_growth`, normalized to `0-100`. |

- [x] **Step 2: Create Supabase client**

Read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables. Throw a clear error when missing.

The dashboard client must never read `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL`.

- [x] **Step 3: Create query functions**

Implement:

```typescript
getLatestMetricSnapshot()
getOpenRiskEvents()
getLatestAiReport()
getRecommendedActions()
getLatestImports()
```

- [x] **Step 4: Create KPI tile**

Build a compact `KpiTile` component with label, value, delta, and state.

- [x] **Step 5: Wire Overview page**

Show KPI tiles, an empty AI summary state that reads "No weekly report generated yet", an empty risk feed state that reads "No open risks", and an empty actions state that reads "No recommended actions".

- [x] **Step 6: Run verification**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [x] **Step 7: Commit**

Run:

```powershell
git add app components lib
git commit -m "feat: add dashboard data layer and KPIs"
```

## Task 5: Forecasting Service

**Files:**

- Create: `services/forecasting/README.md`
- Create: `services/forecasting/requirements.txt`
- Create: `services/forecasting/forecast.py`
- Create: `services/forecasting/test_forecast.py`

- [x] **Step 1: Create deterministic test data in `test_forecast.py`**

Include tests for:

- Four-week revenue projection.
- Revenue pacing risk.
- Margin drop risk.
- Expense pressure risk.
- Stockout risk.
- Deal slippage risk.

- [x] **Step 2: Run tests and confirm they fail**

Run:

```powershell
python -m pytest services/forecasting/test_forecast.py -v
```

Expected: fail because implementation does not exist yet.

- [x] **Step 3: Implement `forecast.py`**

Implement pure functions:

```python
forecast_revenue(weekly_revenue: list[float]) -> dict
detect_revenue_pacing(projected: float, target: float) -> dict | None
detect_margin_drop(current_pct: float, previous_pct: float) -> dict | None
detect_expense_pressure(revenue_growth: float, expense_growth: float) -> dict | None
detect_stockout(quantity_on_hand: int, weekly_units: float, lead_time_days: int) -> dict | None
detect_deal_slippage(expected_close_date: str, status: str, value: float) -> dict | None
```

- [x] **Step 4: Run tests**

Run:

```powershell
python -m pytest services/forecasting/test_forecast.py -v
```

Expected: all tests pass.

- [x] **Step 5: Commit**

Run:

```powershell
git add services/forecasting
git commit -m "feat: add explainable forecasting and risk rules"
```

## Task 6: Ingestion Workflow

**Files:**

- Create: `workflows/local_5678_joshua_k/personal/ingestion.workflow.ts`

- [x] **Step 1: Check n8n status**

Run:

```powershell
npx --yes n8nac list
```

Expected: workspace lists local and/or remote workflows without initialization errors.

- [x] **Step 2: Research patterns and nodes**

Run:

```powershell
npx --yes n8nac skills examples search "webhook supabase ingestion"
npx --yes n8nac skills search "webhook"
npx --yes n8nac skills search "postgres"
npx --yes n8nac skills search "code"
```

- [x] **Step 3: Inspect node schemas**

Run `node-info` for each chosen node. Use exact `type`, highest valid `typeVersion`, and exact parameter names.

- [x] **Step 4: Build workflow**

Create a workflow with:

```text
Webhook or Manual Trigger -> Validate Payload -> Clean Rows -> Write Supabase/Postgres -> Log Import -> Respond
```

Use Code nodes only for validation and row normalization that cannot be expressed cleanly with Set nodes.

The workflow must have a manual/demo execution path so the portfolio demo does not depend on an external upload event.

- [x] **Step 5: Validate locally**

Run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/ingestion.workflow.ts
```

Expected: validation passes.

- [x] **Step 6: Confirm local listing**

Run:

```powershell
npx --yes n8nac list --local
```

Expected: `ingestion.workflow.ts` appears.

- [x] **Step 7: Push and verify**

Run:

```powershell
npx --yes n8nac push workflows/local_5678_joshua_k/personal/ingestion.workflow.ts --verify
```

Expected: workflow is created/updated and live verification passes.

- [x] **Step 8: Test if HTTP-triggered**

Run:

```powershell
npx --yes n8nac test-plan <workflowId> --json
npx --yes n8nac workflow activate <workflowId>
npx --yes n8nac test <workflowId> --prod
```

If a Class A configuration gap appears, stop and document required credentials. If a Class B wiring error appears, fix and retest.

- [x] **Step 9: Commit**

Run:

```powershell
git add workflows/local_5678_joshua_k/personal/ingestion.workflow.ts
git commit -m "feat: add ingestion workflow"
```

## Task 7: Daily Metrics Workflow

**Files:**

- Create: `workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts`

- [ ] **Step 1: Run n8n list**

Run:

```powershell
npx --yes n8nac list
```

- [ ] **Step 2: Research scheduled database workflow patterns**

Run:

```powershell
npx --yes n8nac skills examples search "scheduled postgres metrics"
npx --yes n8nac skills search "schedule trigger"
npx --yes n8nac skills search "postgres"
npx --yes n8nac skills search "code"
```

- [ ] **Step 3: Inspect node schemas**

Run `node-info` for chosen Schedule, Postgres/Supabase, and Code nodes.

- [ ] **Step 4: Build workflow**

Create:

```text
Manual/Schedule Trigger -> Query Clean Tables -> Calculate KPI Snapshot -> Insert metric_snapshots -> Log Result
```

Metrics must include revenue, gross margin, gross margin percentage, operating costs, net contribution, average order value, sales velocity, weighted pipeline, pipeline coverage, stock risk count, and cash pressure score.

- [ ] **Step 5: Validate, push, verify**

Run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts
npx --yes n8nac push workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts --verify
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add workflows/local_5678_joshua_k/personal/daily-metrics.workflow.ts
git commit -m "feat: add daily metrics workflow"
```

## Task 8: Forecast and Risk Workflow

**Files:**

- Create: `workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts`
- Modify: `services/forecasting/forecast.py` if CLI wrapper is needed

- [x] **Step 1: Decide execution method**

Choose one:

- Run forecasting logic inside an n8n Code node for MVP simplicity.
- Call the Python script/service from an HTTP endpoint in phase two.

Recommendation for MVP: use n8n Code node with logic equivalent to the tested Python functions, and keep Python as the documented reference implementation.

- [x] **Step 2: Research nodes**

Run:

```powershell
npx --yes n8nac skills examples search "scheduled risk detection postgres"
npx --yes n8nac skills search "schedule trigger"
npx --yes n8nac skills search "postgres"
npx --yes n8nac skills search "code"
```

- [x] **Step 3: Build workflow**

Create:

```text
Manual/Schedule Trigger -> Load Recent Metrics/Targets/Pipeline/Capacity -> Forecast -> Risk Rules -> Upsert risk_events -> Insert forecasts
```

Avoid duplicate open risks for the same `risk_type`, `source_table`, and `source_record_id`.
Use `risk_events.dedupe_key` with format `<risk_type>:<source_table>:<source_record_id-or-period>` and update open risks with the same key instead of inserting duplicates.

- [x] **Step 4: Validate, push, verify**

Run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts
npx --yes n8nac push workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts --verify
```

- [x] **Step 5: Commit**

Run:

```powershell
git add workflows/local_5678_joshua_k/personal/forecast-risk.workflow.ts services/forecasting
git commit -m "feat: add forecast and risk workflow"
```

## Task 9: Weekly AI Report Workflow

**Files:**

- Create: `workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts`

- [x] **Step 1: Research OpenAI and Slack nodes**

Run:

```powershell
npx --yes n8nac skills examples search "weekly openai slack report"
npx --yes n8nac skills search "openai"
npx --yes n8nac skills search "slack"
npx --yes n8nac skills search "postgres"
npx --yes n8nac skills search "schedule trigger"
```

- [x] **Step 2: Inspect schemas**

Run `node-info` for selected OpenAI, Slack, Schedule, Postgres, and Code nodes.

- [x] **Step 3: Build prompt payload**

The prompt builder must send:

```json
{
  "latest_metrics": {},
  "forecasts": [],
  "open_risks": [],
  "recommended_actions": []
}
```

Do not send raw operational tables.

The OpenAI response must be valid JSON matching:

```json
{
  "summary": "...",
  "what_changed": "...",
  "needs_attention": "...",
  "likely_causes": "...",
  "recommended_actions": "...",
  "next_7_days_priorities": "...",
  "slack_text": "..."
}
```

Validate all fields before inserting into `ai_reports`. If the response is invalid, write an `action_log` entry and fail the workflow instead of inserting malformed data.

- [x] **Step 4: Build workflow**

Create:

```text
Manual/Monday Schedule -> Pull Structured Payload -> OpenAI JSON Summary -> Validate JSON -> Save ai_reports -> Send Slack -> Write action_log
```

- [x] **Step 5: Validate, push, verify**

Run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts
npx --yes n8nac push workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts --verify
```

- [x] **Step 6: Handle Class A gaps**

If OpenAI or Slack credentials are missing, do not rewrite workflow code. Document the missing credential type and continue.

- [x] **Step 7: Commit**

Run:

```powershell
git add workflows/local_5678_joshua_k/personal/weekly-ai-report.workflow.ts
git commit -m "feat: add weekly AI report workflow"
```

## Task 10: Action Automation Workflow

**Files:**

- Create: `workflows/local_5678_joshua_k/personal/action-automation.workflow.ts`

- [x] **Step 1: Research workflow pattern**

Run:

```powershell
npx --yes n8nac skills examples search "postgres risk slack task"
npx --yes n8nac skills search "schedule trigger"
npx --yes n8nac skills search "postgres"
npx --yes n8nac skills search "slack"
npx --yes n8nac skills search "if"
```

- [x] **Step 2: Build workflow**

Create:

```text
Manual/Schedule Trigger -> Query New High Risks -> Classify -> Insert recommended_actions -> Slack Alert -> action_log
```

Use a scheduled poll for MVP instead of a database trigger.
Resolving a risk must not automatically resolve linked actions in MVP. Actions keep their own lifecycle: `open -> in_progress -> done` or `open -> dismissed`.

- [x] **Step 3: Validate, push, verify**

Run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/action-automation.workflow.ts
npx --yes n8nac push workflows/local_5678_joshua_k/personal/action-automation.workflow.ts --verify
```

- [x] **Step 4: Commit**

Run:

```powershell
git add workflows/local_5678_joshua_k/personal/action-automation.workflow.ts
git commit -m "feat: add action automation workflow"
```

## Task 11: Dashboard Operational Views

**Files:**

- Create: `components/charts/RevenueForecastChart.tsx`
- Create: `components/risks/RiskFeed.tsx`
- Create: `components/actions/ActionTable.tsx`
- Modify: all route pages under `app/`
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/metrics/transforms.ts`

- [ ] **Step 1: Add forecast chart**

Use Recharts to show actual revenue, forecast revenue, and target.

- [ ] **Step 2: Add risk feed**

Render risk title, severity, explanation, recommended action, and status.

- [ ] **Step 3: Add action table**

Render title, priority, owner, due date, status, and linked risk.

- [ ] **Step 4: Populate pages**

Map pages:

- Overview: KPIs, AI summary, urgent risks, recent actions.
- Forecasts & Risks: forecast chart, pacing notes, weighted pipeline, slipping deals, margin trend, expense pressure, and capacity cover risks.
- Actions: action table.
- Data Health: import history and stale data warnings.

Early UI work may use static mock objects to unblock component development. Final demo mode must read from Supabase.

Data Health must flag:

- No successful import in the last 7 days.
- No metric snapshot in the last 48 hours.
- Latest workflow run failed.
- Required source table has zero rows.
- Latest AI report is older than 8 days.

- [ ] **Step 5: Verify responsive layout**

Run:

```powershell
npm run dev
```

Open the local URL and check desktop and mobile widths. Text must not overlap, and dashboard pages should not look like a marketing landing page.

- [ ] **Step 6: Build**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add app components lib
git commit -m "feat: build operational dashboard views"
```

## Task 12: Demo Script and Portfolio Polish

**Files:**

- Create: `docs/demo-script.md`
- Create: `docs/architecture.md`
- Modify: `README.md`

- [ ] **Step 1: Write demo script**

Include:

1. Reset/load demo data.
2. Run ingestion workflow.
3. Run daily metrics.
4. Run forecast/risk workflow.
5. Generate AI report.
6. View dashboard.
7. Explain action queue.

- [ ] **Step 2: Write architecture doc**

Summarize data flow, database tables, workflows, forecasting/risk rules, and dashboard views.
Include deployment posture:

- Dashboard: Vercel.
- Database: hosted Supabase project for seeded demo data.
- n8n: local/self-hosted demo, or hosted n8n if available.
- Screenshots/video: captured after seeded demo run.
- Public demo exposes only safe demo data through the anon key.

- [ ] **Step 3: Update README**

Add:

- Architecture diagram.
- Screenshot section with labeled slots for Overview, Forecasts, Risks, and Actions; each slot should state which screenshot to capture after the dashboard is running.
- Setup instructions.
- Demo instructions.
- Deployment instructions.
- Portfolio positioning.
- Phase-two roadmap.

- [ ] **Step 4: Final verification**

Run:

```powershell
npm run typecheck
npm run build
python -m pytest services/forecasting/test_forecast.py -v
npx --yes n8nac list
```

For each workflow created, run:

```powershell
npx --yes n8nac skills validate workflows/local_5678_joshua_k/personal/<name>.workflow.ts
```

Expected: all local checks pass. Live workflow verification should be documented with each pushed workflow ID.

- [ ] **Step 5: Commit**

Run:

```powershell
git add README.md docs
git commit -m "docs: add demo and architecture guide"
```

## Risk Register

- Supabase credentials may not be available during early local development. Use demo/static fallbacks for dashboard skeleton only, but do not fake final workflow verification.
- Dashboard code must use only the Supabase anon key. Service role credentials and `DATABASE_URL` are restricted to n8n workflows and server-side scripts.
- RLS must be enabled even for the demo schema so the public portfolio posture is clear.
- n8n workflow nodes must not be guessed. Always inspect n8nac schema before writing node config.
- OpenAI and Slack credentials may produce Class A gaps. Treat them as configuration tasks, not code failures.
- Forecasting should remain explainable. Avoid introducing heavy ML until the deterministic version is complete.
- Do not commit `.env` files or credentials.

## Definition of Done

The MVP is done when:

- Schema and seed data can recreate a credible demo state.
- n8n workflows exist as version-controlled TypeScript files.
- Workflows validate locally and verify live after push.
- Metrics, forecasts, risks, AI reports, actions, and import health are visible in the dashboard.
- Seeded data deterministically produces the expected demo risks: `revenue_pacing`, `margin_drop`, `stockout_risk` for `SKU-003`, `deal_slippage` for `Wholesale Expansion`, and `expense_pressure`.
- AI reports are stored only after JSON schema validation.
- Public dashboard access uses the anon key and RLS-protected demo data.
- The dashboard builds successfully.
- The forecasting tests pass.
- README and demo script can guide a reviewer through the operating loop.

## Execution Options

After this plan is approved:

1. Subagent-Driven: dispatch fresh workers per task, review between tasks, fastest for independent slices.
2. Inline Execution: implement tasks in this session with checkpoints.

Recommendation: use Subagent-Driven once Task 1 and Task 2 are complete, because dashboard, forecasting, and n8n workflows can progress in parallel with clean file ownership.
