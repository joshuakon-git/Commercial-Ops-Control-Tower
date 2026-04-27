truncate table
  action_log,
  recommended_actions,
  ai_reports,
  risk_events,
  forecasts,
  metric_snapshots,
  targets,
  expenses,
  crm_pipeline,
  capacity_positions,
  sales_orders,
  raw_uploads
restart identity cascade;

insert into raw_uploads (
  id,
  source_name,
  source_type,
  file_name,
  status,
  rows_received,
  rows_imported,
  rows_failed,
  error_summary,
  created_at
) values
  ('00000000-0000-4000-8000-000000000101', 'Seeded sales orders', 'csv', 'sales_orders.csv', 'succeeded', 12, 12, 0, null, '2026-04-27 09:00:00+00'),
  ('00000000-0000-4000-8000-000000000102', 'Seeded capacity positions', 'csv', 'capacity.csv', 'succeeded', 4, 4, 0, null, '2026-04-27 09:01:00+00'),
  ('00000000-0000-4000-8000-000000000103', 'Seeded CRM pipeline', 'csv', 'pipeline.csv', 'succeeded', 4, 4, 0, null, '2026-04-27 09:02:00+00'),
  ('00000000-0000-4000-8000-000000000104', 'Seeded expenses', 'csv', 'expenses.csv', 'succeeded', 10, 10, 0, null, '2026-04-27 09:03:00+00'),
  ('00000000-0000-4000-8000-000000000105', 'Seeded targets', 'csv', 'targets.csv', 'succeeded', 3, 3, 0, null, '2026-04-27 09:04:00+00');

insert into sales_orders (
  raw_upload_id,
  order_date,
  customer,
  product,
  sku,
  units,
  revenue,
  discount,
  channel,
  unit_cost
) values
  ('00000000-0000-4000-8000-000000000101', '2026-03-23', 'Apex Cafe', 'Starter Pack', 'SKU-001', 20, 3200.00, 0.00, 'direct', 70.00),
  ('00000000-0000-4000-8000-000000000101', '2026-03-25', 'Beacon Retail', 'Core Bundle', 'SKU-002', 15, 4500.00, 150.00, 'partner', 160.00),
  ('00000000-0000-4000-8000-000000000101', '2026-03-27', 'Heritage Market', 'Signal Kit', 'SKU-003', 18, 5400.00, 0.00, 'direct', 170.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-01', 'Apex Cafe', 'Starter Pack', 'SKU-001', 18, 2880.00, 0.00, 'direct', 72.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-03', 'City Dental', 'Implementation Sprint', 'SKU-004', 10, 5200.00, 250.00, 'direct', 260.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-08', 'Beacon Retail', 'Core Bundle', 'SKU-002', 10, 3000.00, 100.00, 'partner', 165.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-10', 'Heritage Market', 'Signal Kit', 'SKU-003', 16, 4800.00, 0.00, 'direct', 175.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-15', 'City Dental', 'Implementation Sprint', 'SKU-004', 7, 3640.00, 0.00, 'direct', 270.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-17', 'Apex Cafe', 'Starter Pack', 'SKU-001', 12, 1920.00, 0.00, 'direct', 75.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-22', 'Heritage Market', 'Signal Kit', 'SKU-003', 22, 6600.00, 400.00, 'direct', 240.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-24', 'Beacon Retail', 'Core Bundle', 'SKU-002', 6, 1800.00, 200.00, 'partner', 190.00),
  ('00000000-0000-4000-8000-000000000101', '2026-04-27', 'Apex Cafe', 'Starter Pack', 'SKU-001', 8, 1280.00, 0.00, 'direct', 90.00);

insert into capacity_positions (
  raw_upload_id,
  resource_code,
  resource_name,
  quantity_on_hand,
  reorder_point,
  lead_time_days,
  unit_cost
) values
  ('00000000-0000-4000-8000-000000000102', 'SKU-001', 'Starter Pack Capacity', 120, 40, 7, 75.00),
  ('00000000-0000-4000-8000-000000000102', 'SKU-002', 'Core Bundle Capacity', 42, 30, 10, 170.00),
  ('00000000-0000-4000-8000-000000000102', 'SKU-003', 'Signal Kit Capacity', 8, 25, 14, 220.00),
  ('00000000-0000-4000-8000-000000000102', 'SKU-004', 'Implementation Sprint Capacity', 28, 12, 5, 260.00);

insert into crm_pipeline (
  raw_upload_id,
  deal_name,
  stage,
  value,
  probability,
  expected_close_date,
  owner,
  status
) values
  ('00000000-0000-4000-8000-000000000103', 'Wholesale Expansion', 'Proposal', 28000.00, 0.70, '2026-04-20', 'Maya Chen', 'open'),
  ('00000000-0000-4000-8000-000000000103', 'North Region Pilot', 'Discovery', 16000.00, 0.35, '2026-05-08', 'Amir Patel', 'open'),
  ('00000000-0000-4000-8000-000000000103', 'Retainer Renewal', 'Negotiation', 12000.00, 0.80, '2026-05-15', 'Maya Chen', 'open'),
  ('00000000-0000-4000-8000-000000000103', 'Legacy Account Recovery', 'Closed Lost', 9000.00, 0.00, '2026-04-12', 'Jordan Lee', 'lost');

insert into expenses (
  raw_upload_id,
  expense_date,
  category,
  supplier,
  amount,
  fixed_or_variable
) values
  ('00000000-0000-4000-8000-000000000104', '2026-03-24', 'Rent', 'Workspace Co', 2500.00, 'fixed'),
  ('00000000-0000-4000-8000-000000000104', '2026-03-26', 'Software', 'StackSuite', 1200.00, 'fixed'),
  ('00000000-0000-4000-8000-000000000104', '2026-03-27', 'Fulfillment', 'ShipRight', 1800.00, 'variable'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-02', 'Rent', 'Workspace Co', 2500.00, 'fixed'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-06', 'Software', 'StackSuite', 1250.00, 'fixed'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-09', 'Fulfillment', 'ShipRight', 2300.00, 'variable'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-14', 'Contract Labor', 'Ops Bench', 3100.00, 'variable'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-20', 'Marketing', 'Local Ads', 1900.00, 'variable'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-23', 'Fulfillment', 'ShipRight', 3400.00, 'variable'),
  ('00000000-0000-4000-8000-000000000104', '2026-04-27', 'Contract Labor', 'Ops Bench', 4200.00, 'variable');

insert into targets (
  period_start,
  period_end,
  revenue_target,
  gross_margin_target,
  pipeline_coverage_target
) values
  ('2026-03-01', '2026-03-31', 52000.00, 0.45, 2.50),
  ('2026-04-01', '2026-04-30', 70000.00, 0.45, 2.50),
  ('2026-05-01', '2026-05-31', 76000.00, 0.46, 2.75);
