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

drop policy if exists "demo read raw uploads" on raw_uploads;
drop policy if exists "demo read sales orders" on sales_orders;
drop policy if exists "demo read capacity positions" on capacity_positions;
drop policy if exists "demo read crm pipeline" on crm_pipeline;
drop policy if exists "demo read expenses" on expenses;
drop policy if exists "demo read targets" on targets;
drop policy if exists "demo read metric snapshots" on metric_snapshots;
drop policy if exists "demo read forecasts" on forecasts;
drop policy if exists "demo read risk events" on risk_events;
drop policy if exists "demo read ai reports" on ai_reports;
drop policy if exists "demo read recommended actions" on recommended_actions;
drop policy if exists "demo read action log" on action_log;

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
