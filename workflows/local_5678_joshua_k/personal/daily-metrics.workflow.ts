import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Commercial Ops Daily Metrics
// Nodes   : 6  |  Connections: 5
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualDemoTrigger                  manualTrigger
// DailySchedule                      scheduleTrigger
// QueryCleanTables                   postgres                   [creds]
// CalculateKpiSnapshot               code
// InsertMetricSnapshots              postgres                   [creds]
// LogResult                          postgres                   [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualDemoTrigger
//    → QueryCleanTables
//      → CalculateKpiSnapshot
//        → InsertMetricSnapshots
//          → LogResult
// DailySchedule
//    → QueryCleanTables (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'W4ZVf4l9JtpNhbH1',
    name: 'Commercial Ops Daily Metrics',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true, callerPolicy: 'workflowsFromSameOwner' },
})
export class CommercialOpsDailyMetricsWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '92129ce8-1809-49e0-ba73-8a6d0fa3fbb5',
        name: 'Manual Demo Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, 240],
    })
    ManualDemoTrigger = {};

    @node({
        id: '251e8e4f-4d2c-4da6-ac5b-ef1d287bb6ea',
        name: 'Daily Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [0, 0],
    })
    DailySchedule = {
        rule: {
            interval: [
                {
                    field: 'days',
                    daysInterval: 1,
                    triggerAtHour: '7',
                    triggerAtMinute: 0,
                },
            ],
        },
    };

    @node({
        id: '303b4b5e-5f89-45b2-807e-8ff4a09779ec',
        name: 'Query Clean Tables',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [304, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    QueryCleanTables = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'metric_snapshots',
        },
        query: `WITH bounds AS (
  SELECT
    current_date::date AS snapshot_date,
    date_trunc('month', current_date)::date AS period_start,
    current_date::date AS period_end,
    (date_trunc('month', current_date) - interval '1 month')::date AS previous_start,
    LEAST(
      (date_trunc('month', current_date) - interval '1 month')::date
        + (current_date::date - date_trunc('month', current_date)::date),
      (date_trunc('month', current_date) - interval '1 day')::date
    )::date AS previous_end
),
current_sales AS (
  SELECT
    COALESCE(SUM(revenue), 0)::numeric AS revenue,
    COALESCE(SUM(gross_margin), 0)::numeric AS gross_margin,
    COUNT(*)::numeric AS order_count,
    COALESCE(SUM(units), 0)::numeric AS units_sold,
    COUNT(DISTINCT order_date)::numeric AS active_selling_days
  FROM sales_orders, bounds
  WHERE order_date BETWEEN bounds.period_start AND bounds.period_end
),
previous_sales AS (
  SELECT COALESCE(SUM(revenue), 0)::numeric AS revenue
  FROM sales_orders, bounds
  WHERE order_date BETWEEN bounds.previous_start AND bounds.previous_end
),
current_expenses AS (
  SELECT COALESCE(SUM(amount), 0)::numeric AS operating_costs
  FROM expenses, bounds
  WHERE expense_date BETWEEN bounds.period_start AND bounds.period_end
),
previous_expenses AS (
  SELECT COALESCE(SUM(amount), 0)::numeric AS operating_costs
  FROM expenses, bounds
  WHERE expense_date BETWEEN bounds.previous_start AND bounds.previous_end
),
pipeline AS (
  SELECT COALESCE(SUM(weighted_value), 0)::numeric AS weighted_pipeline
  FROM crm_pipeline
  WHERE status = 'open'
),
next_target AS (
  SELECT COALESCE((
    SELECT revenue_target
    FROM targets, bounds
    WHERE targets.period_start > bounds.period_start
    ORDER BY targets.period_start ASC
    LIMIT 1
  ), (
    SELECT revenue_target
    FROM targets, bounds
    WHERE bounds.snapshot_date BETWEEN targets.period_start AND targets.period_end
    ORDER BY targets.period_start DESC
    LIMIT 1
  ), 0)::numeric AS revenue_target
),
sku_velocity AS (
  SELECT
    sku,
    COALESCE(SUM(units), 0)::numeric / 28 AS average_daily_units
  FROM sales_orders, bounds
  WHERE order_date BETWEEN (bounds.snapshot_date - 27) AND bounds.snapshot_date
  GROUP BY sku
),
stock_risk AS (
  SELECT COUNT(*)::int AS stock_risk_count
  FROM capacity_positions capacity
  LEFT JOIN sku_velocity velocity ON velocity.sku = capacity.resource_code
  WHERE capacity.quantity_on_hand <= capacity.reorder_point
    OR (
      COALESCE(velocity.average_daily_units, 0) > 0
      AND (capacity.quantity_on_hand::numeric / velocity.average_daily_units) <= capacity.lead_time_days
    )
),
growth AS (
  SELECT
    CASE
      WHEN previous_sales.revenue = 0 THEN 0
      ELSE (current_sales.revenue - previous_sales.revenue) / previous_sales.revenue
    END AS revenue_growth,
    CASE
      WHEN previous_expenses.operating_costs = 0 THEN 0
      ELSE (current_expenses.operating_costs - previous_expenses.operating_costs) / previous_expenses.operating_costs
    END AS expense_growth
  FROM current_sales, previous_sales, current_expenses, previous_expenses
)
SELECT
  bounds.snapshot_date,
  bounds.period_start,
  bounds.period_end,
  'month_to_date' AS period,
  ROUND(current_sales.revenue, 2) AS revenue,
  ROUND(current_sales.gross_margin, 2) AS gross_margin,
  ROUND(
    CASE WHEN current_sales.revenue = 0 THEN 0 ELSE current_sales.gross_margin / current_sales.revenue END,
    4
  ) AS gross_margin_pct,
  ROUND(current_expenses.operating_costs, 2) AS operating_costs,
  ROUND(current_sales.gross_margin - current_expenses.operating_costs, 2) AS net_contribution,
  ROUND(
    CASE WHEN current_sales.order_count = 0 THEN 0 ELSE current_sales.revenue / current_sales.order_count END,
    2
  ) AS average_order_value,
  ROUND(
    CASE WHEN current_sales.active_selling_days = 0 THEN 0 ELSE current_sales.units_sold / current_sales.active_selling_days END,
    2
  ) AS sales_velocity,
  ROUND(pipeline.weighted_pipeline, 2) AS weighted_pipeline,
  ROUND(
    CASE WHEN next_target.revenue_target = 0 THEN 0 ELSE pipeline.weighted_pipeline / next_target.revenue_target END,
    4
  ) AS pipeline_coverage,
  stock_risk.stock_risk_count,
  ROUND(
    GREATEST(0, LEAST(100, (growth.expense_growth - growth.revenue_growth) * 100)),
    2
  ) AS cash_pressure_score
FROM bounds, current_sales, current_expenses, pipeline, next_target, stock_risk, growth;`,
        options: {},
    };

    @node({
        id: '621715fe-6b0b-4e28-bddd-d1acd58a8cf6',
        name: 'Calculate KPI Snapshot',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [608, 128],
    })
    CalculateKpiSnapshot = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const row = $input.first()?.json;

if (!row) {
  throw new Error('Query Clean Tables did not return a metric row');
}

const numericFields = [
  'revenue',
  'gross_margin',
  'gross_margin_pct',
  'operating_costs',
  'net_contribution',
  'average_order_value',
  'sales_velocity',
  'weighted_pipeline',
  'pipeline_coverage',
  'cash_pressure_score'
];

const snapshot = {
  snapshot_date: row.snapshot_date,
  period_start: row.period_start,
  period_end: row.period_end,
  period: row.period,
  stock_risk_count: Number(row.stock_risk_count || 0)
};

for (const field of numericFields) {
  const value = Number(row[field] || 0);
  if (Number.isNaN(value)) {
    throw new Error(\`Metric \${field} is not numeric\`);
  }
  snapshot[field] = value;
}

return [{ json: snapshot }];`,
    };

    @node({
        id: '4f7b5f32-2187-497a-b263-bdf2cdc8083d',
        name: 'Insert metric_snapshots',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [912, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    InsertMetricSnapshots = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'metric_snapshots',
        },
        query: `INSERT INTO metric_snapshots (
  snapshot_date,
  period_start,
  period_end,
  period,
  revenue,
  gross_margin,
  gross_margin_pct,
  operating_costs,
  net_contribution,
  average_order_value,
  sales_velocity,
  weighted_pipeline,
  pipeline_coverage,
  stock_risk_count,
  cash_pressure_score
)
VALUES (
  '{{ $json.snapshot_date }}'::date,
  '{{ $json.period_start }}'::date,
  '{{ $json.period_end }}'::date,
  '{{ $json.period }}',
  {{ $json.revenue }},
  {{ $json.gross_margin }},
  {{ $json.gross_margin_pct }},
  {{ $json.operating_costs }},
  {{ $json.net_contribution }},
  {{ $json.average_order_value }},
  {{ $json.sales_velocity }},
  {{ $json.weighted_pipeline }},
  {{ $json.pipeline_coverage }},
  {{ $json.stock_risk_count }},
  {{ $json.cash_pressure_score }}
)
RETURNING
  id::text AS metric_snapshot_id,
  snapshot_date,
  period_start,
  period_end,
  period,
  revenue,
  gross_margin,
  gross_margin_pct,
  operating_costs,
  net_contribution,
  average_order_value,
  sales_velocity,
  weighted_pipeline,
  pipeline_coverage,
  stock_risk_count,
  cash_pressure_score;`,
        options: {},
    };

    @node({
        id: '21e973e6-aaba-4739-8f6c-bc4330b1a54d',
        name: 'Log Result',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1216, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    LogResult = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'action_log',
        },
        query: `INSERT INTO action_log (
  action_type,
  target,
  status,
  payload,
  result
)
VALUES (
  'daily_metrics',
  'metric_snapshots',
  'succeeded',
  jsonb_build_object(
    'snapshot_date', '{{ $json.snapshot_date }}',
    'period_start', '{{ $json.period_start }}',
    'period_end', '{{ $json.period_end }}',
    'period', '{{ $json.period }}'
  ),
  jsonb_build_object(
    'metric_snapshot_id', '{{ $json.metric_snapshot_id }}',
    'revenue', {{ $json.revenue }},
    'gross_margin', {{ $json.gross_margin }},
    'gross_margin_pct', {{ $json.gross_margin_pct }},
    'operating_costs', {{ $json.operating_costs }},
    'net_contribution', {{ $json.net_contribution }},
    'average_order_value', {{ $json.average_order_value }},
    'sales_velocity', {{ $json.sales_velocity }},
    'weighted_pipeline', {{ $json.weighted_pipeline }},
    'pipeline_coverage', {{ $json.pipeline_coverage }},
    'stock_risk_count', {{ $json.stock_risk_count }},
    'cash_pressure_score', {{ $json.cash_pressure_score }}
  )
)
RETURNING
  id::text AS action_log_id,
  status,
  target,
  created_at;`,
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ManualDemoTrigger.out(0).to(this.QueryCleanTables.in(0));
        this.DailySchedule.out(0).to(this.QueryCleanTables.in(0));
        this.QueryCleanTables.out(0).to(this.CalculateKpiSnapshot.in(0));
        this.CalculateKpiSnapshot.out(0).to(this.InsertMetricSnapshots.in(0));
        this.InsertMetricSnapshots.out(0).to(this.LogResult.in(0));
    }
}
