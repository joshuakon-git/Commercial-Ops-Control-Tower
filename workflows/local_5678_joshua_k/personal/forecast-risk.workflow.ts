import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Commercial Ops Forecast and Risk
// Nodes   : 7  |  Connections: 6
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualDemoTrigger                  manualTrigger
// ForecastRiskSchedule               scheduleTrigger
// LoadCommercialInputs               postgres                   [creds]
// ForecastAndRiskRules               code
// UpsertRiskEvents                   postgres                   [creds]
// InsertForecasts                    postgres                   [creds]
// LogResult                          postgres                   [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualDemoTrigger
//    → LoadCommercialInputs
//      → ForecastAndRiskRules
//        → UpsertRiskEvents
//          → InsertForecasts
//            → LogResult
// ForecastRiskSchedule
//    → LoadCommercialInputs (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'cQtgLAXrNmvbcbVX',
    name: 'Commercial Ops Forecast and Risk',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: true,
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
        timeSavedMode: 'fixed',
    },
})
export class CommercialOpsForecastAndRiskWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'badf4af3-7562-4856-9602-398bdd25b9f3',
        name: 'Manual Demo Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, 240],
    })
    ManualDemoTrigger = {};

    @node({
        id: '670962b8-173e-4e1a-85e9-83c70ef2d3dc',
        name: 'Forecast Risk Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [0, 0],
    })
    ForecastRiskSchedule = {
        rule: {
            interval: [
                {
                    field: 'days',
                    daysInterval: 1,
                    triggerAtHour: '8',
                    triggerAtMinute: 0,
                },
            ],
        },
    };

    @node({
        id: '54eedeb3-d67a-4902-87cb-6b586bada284',
        name: 'Load Commercial Inputs',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [304, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    LoadCommercialInputs = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'metric_snapshots',
        },
        query: `WITH source_dates AS (
  SELECT MAX(order_date)::date AS source_date FROM sales_orders
  UNION ALL
  SELECT MAX(expense_date)::date AS source_date FROM expenses
  UNION ALL
  SELECT MAX(snapshot_date)::date AS source_date FROM metric_snapshots
),
as_of AS (
  SELECT COALESCE(MAX(source_date), current_date)::date AS as_of_date
  FROM source_dates
),
bounds AS (
  SELECT
    as_of.as_of_date,
    date_trunc('month', as_of.as_of_date)::date AS period_start,
    as_of.as_of_date AS period_end,
    (date_trunc('month', as_of.as_of_date) - interval '1 month')::date AS previous_start,
    LEAST(
      (date_trunc('month', as_of.as_of_date) - interval '1 month')::date
        + (as_of.as_of_date - date_trunc('month', as_of.as_of_date)::date),
      (date_trunc('month', as_of.as_of_date) - interval '1 day')::date
    )::date AS previous_end
  FROM as_of
),
current_sales AS (
  SELECT
    COALESCE(SUM(revenue), 0)::numeric AS revenue,
    COALESCE(SUM(gross_margin), 0)::numeric AS gross_margin
  FROM sales_orders, bounds
  WHERE order_date BETWEEN bounds.period_start AND bounds.period_end
),
previous_sales AS (
  SELECT
    COALESCE(SUM(revenue), 0)::numeric AS revenue,
    COALESCE(SUM(gross_margin), 0)::numeric AS gross_margin
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
weekly_sales AS (
  SELECT
    date_trunc('week', order_date)::date AS week_start,
    COALESCE(SUM(revenue), 0)::numeric AS revenue
  FROM sales_orders, bounds
  WHERE order_date BETWEEN (bounds.as_of_date - 27) AND bounds.as_of_date
  GROUP BY date_trunc('week', order_date)::date
  ORDER BY week_start
),
sku_velocity AS (
  SELECT
    sku,
    COALESCE(SUM(units), 0)::numeric AS four_week_units,
    COALESCE(SUM(units), 0)::numeric / 4 AS weekly_units
  FROM sales_orders, bounds
  WHERE order_date BETWEEN (bounds.as_of_date - 27) AND bounds.as_of_date
  GROUP BY sku
),
open_pipeline AS (
  SELECT
    id::text,
    deal_name,
    stage,
    value,
    probability,
    weighted_value,
    expected_close_date,
    owner,
    status
  FROM crm_pipeline
  WHERE status = 'open'
),
capacity AS (
  SELECT
    capacity_positions.id::text,
    capacity_positions.resource_code,
    capacity_positions.resource_name,
    capacity_positions.quantity_on_hand,
    capacity_positions.reorder_point,
    capacity_positions.lead_time_days,
    capacity_positions.unit_cost,
    COALESCE(sku_velocity.weekly_units, 0)::numeric AS weekly_units,
    COALESCE(sku_velocity.four_week_units, 0)::numeric AS four_week_units
  FROM capacity_positions
  LEFT JOIN sku_velocity ON sku_velocity.sku = capacity_positions.resource_code
),
current_target AS (
  SELECT
    targets.id::text,
    targets.period_start,
    targets.period_end,
    targets.revenue_target,
    targets.gross_margin_target,
    targets.pipeline_coverage_target
  FROM targets, bounds
  WHERE bounds.as_of_date BETWEEN targets.period_start AND targets.period_end
  ORDER BY targets.period_start DESC
  LIMIT 1
)
SELECT
  bounds.as_of_date AS snapshot_date,
  bounds.period_start,
  bounds.period_end,
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'week_start', weekly_sales.week_start,
    'revenue', ROUND(weekly_sales.revenue, 2)
  ) ORDER BY weekly_sales.week_start) FROM weekly_sales), '[]'::jsonb) AS weekly_revenue,
  jsonb_build_object(
    'period_start', bounds.period_start,
    'period_end', bounds.period_end,
    'revenue', ROUND(current_sales.revenue, 2),
    'gross_margin', ROUND(current_sales.gross_margin, 2),
    'gross_margin_pct', ROUND(CASE WHEN current_sales.revenue = 0 THEN 0 ELSE current_sales.gross_margin / current_sales.revenue END, 4),
    'operating_costs', ROUND(current_expenses.operating_costs, 2)
  ) AS current_summary,
  jsonb_build_object(
    'period_start', bounds.previous_start,
    'period_end', bounds.previous_end,
    'revenue', ROUND(previous_sales.revenue, 2),
    'gross_margin', ROUND(previous_sales.gross_margin, 2),
    'gross_margin_pct', ROUND(CASE WHEN previous_sales.revenue = 0 THEN 0 ELSE previous_sales.gross_margin / previous_sales.revenue END, 4),
    'operating_costs', ROUND(previous_expenses.operating_costs, 2)
  ) AS previous_summary,
  COALESCE((SELECT to_jsonb(current_target) FROM current_target), '{}'::jsonb) AS current_target,
  COALESCE((SELECT jsonb_agg(to_jsonb(open_pipeline) ORDER BY open_pipeline.expected_close_date) FROM open_pipeline), '[]'::jsonb) AS open_pipeline,
  COALESCE((SELECT jsonb_agg(to_jsonb(capacity) ORDER BY capacity.resource_code) FROM capacity), '[]'::jsonb) AS capacity_positions,
  COALESCE((
    SELECT jsonb_agg(to_jsonb(metric_snapshots) ORDER BY metric_snapshots.snapshot_date DESC)
    FROM (
      SELECT *
      FROM metric_snapshots
      ORDER BY snapshot_date DESC, created_at DESC
      LIMIT 8
    ) metric_snapshots
  ), '[]'::jsonb) AS recent_metric_snapshots,
  COALESCE((
    SELECT jsonb_agg(to_jsonb(sales_orders) ORDER BY sales_orders.order_date DESC)
    FROM (
      SELECT *
      FROM sales_orders, bounds
      WHERE sales_orders.order_date BETWEEN (bounds.as_of_date - 27) AND bounds.as_of_date
      ORDER BY sales_orders.order_date DESC
      LIMIT 50
    ) sales_orders
  ), '[]'::jsonb) AS recent_sales_orders
FROM bounds, current_sales, previous_sales, current_expenses, previous_expenses;`,
        options: {},
    };

    @node({
        id: '67fbba66-3d65-46f9-98da-efc8d0c4cdf0',
        name: 'Forecast and Risk Rules',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [608, 128],
    })
    ForecastAndRiskRules = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const row = $input.first()?.json;

if (!row) {
  throw new Error('Load Commercial Inputs did not return a row');
}

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return JSON.parse(value);
  return [];
};

const toObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return JSON.parse(value);
  return {};
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
};

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const dateOnly = (value) => String(value || '').slice(0, 10);
const addDays = (dateValue, days) => {
  const date = new Date(dateOnly(dateValue) + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const today = dateOnly(row.snapshot_date) || new Date().toISOString().slice(0, 10);
const periodStart = dateOnly(row.period_start || toObject(row.current_summary).period_start);
const periodEnd = dateOnly(row.period_end || toObject(row.current_summary).period_end);
const weeklyRevenueRows = toArray(row.weekly_revenue);
const currentSummary = toObject(row.current_summary);
const previousSummary = toObject(row.previous_summary);
const currentTarget = toObject(row.current_target);
const openPipeline = toArray(row.open_pipeline);
const capacityPositions = toArray(row.capacity_positions);
const recentMetricSnapshots = toArray(row.recent_metric_snapshots);

const weeklyValues = weeklyRevenueRows
  .map((week) => round(week.revenue))
  .filter((value) => value > 0);

if (weeklyValues.length === 0) {
  weeklyValues.push(round(currentSummary.revenue));
}

const averageWeeklyRevenue = round(weeklyValues.reduce((sum, value) => sum + value, 0) / weeklyValues.length);
const projectedRevenue = round(averageWeeklyRevenue * 4);
const lowerBound = round(Math.min(...weeklyValues) * 4);
const upperBound = round(Math.max(...weeklyValues) * 4);

const forecasts = [1, 2, 3, 4].map((horizonWeeks) => ({
  forecast_date: addDays(today, (horizonWeeks - 1) * 7),
  forecast_type: 'revenue',
  period_start: periodStart,
  period_end: periodEnd,
  predicted_value: round(averageWeeklyRevenue * horizonWeeks),
  lower_bound: round(Math.min(...weeklyValues) * horizonWeeks),
  upper_bound: round(Math.max(...weeklyValues) * horizonWeeks),
  method: 'four_week_average',
  inputs_summary: {
    weekly_revenue: weeklyValues,
    weeks_observed: weeklyValues.length,
    horizon_weeks: horizonWeeks,
    average_weekly_revenue: averageWeeklyRevenue,
    current_revenue: round(currentSummary.revenue),
    target_revenue: round(currentTarget.revenue_target),
    reference: 'services/forecasting/forecast.py'
  }
}));

const risks = [];
const addRisk = (risk) => {
  if (risk) risks.push(risk);
};

const revenueTarget = toNumber(currentTarget.revenue_target);
if (revenueTarget > 0) {
  const threshold = round(revenueTarget * 0.9);
  if (projectedRevenue < threshold) {
    const shortfallPct = round(((revenueTarget - projectedRevenue) / revenueTarget) * 100, 1);
    addRisk({
      risk_type: 'revenue_pacing',
      severity: 'high',
      dedupe_key: \`revenue_pacing:targets:\${periodStart}\`,
      metric_name: 'projected_revenue',
      metric_value: projectedRevenue,
      threshold_value: threshold,
      title: 'Revenue is pacing below target',
      explanation: \`Projected revenue of \${projectedRevenue.toFixed(2)} is \${shortfallPct.toFixed(1)}% below the target of \${revenueTarget.toFixed(2)}.\`,
      recommended_action: 'Review open pipeline and prioritize recoverable revenue for the current period.',
      source_table: 'targets',
      source_record_id: null
    });
  }
}

const currentMarginPct = toNumber(currentSummary.gross_margin_pct);
const previousMarginPct = toNumber(previousSummary.gross_margin_pct);
const marginDrop = previousMarginPct - currentMarginPct;
if (marginDrop >= 0.04) {
  const threshold = round(previousMarginPct - 0.04, 2);
  const dropPoints = round(marginDrop * 100, 1);
  addRisk({
    risk_type: 'margin_drop',
    severity: 'medium',
    dedupe_key: \`margin_drop:metric_snapshots:\${periodStart}\`,
    metric_name: 'gross_margin_pct',
    metric_value: round(currentMarginPct, 2),
    threshold_value: threshold,
    title: 'Gross margin percentage dropped',
    explanation: \`Gross margin fell by \${dropPoints.toFixed(1)} percentage points from \${(previousMarginPct * 100).toFixed(1)}% to \${(currentMarginPct * 100).toFixed(1)}%.\`,
    recommended_action: 'Inspect discounts, product mix, and unit costs before approving new promotions.',
    source_table: 'metric_snapshots',
    source_record_id: recentMetricSnapshots[0]?.id || null
  });
}

const currentRevenue = toNumber(currentSummary.revenue);
const previousRevenue = toNumber(previousSummary.revenue);
const currentExpenses = toNumber(currentSummary.operating_costs);
const previousExpenses = toNumber(previousSummary.operating_costs);
const revenueGrowth = previousRevenue === 0 ? 0 : (currentRevenue - previousRevenue) / previousRevenue;
const expenseGrowth = previousExpenses === 0 ? 0 : (currentExpenses - previousExpenses) / previousExpenses;
const expensePressure = expenseGrowth - revenueGrowth;
if (expensePressure > 0) {
  const pressurePoints = round(expensePressure * 100, 1);
  addRisk({
    risk_type: 'expense_pressure',
    severity: 'medium',
    dedupe_key: \`expense_pressure:expenses:\${periodStart}\`,
    metric_name: 'expense_growth_minus_revenue_growth',
    metric_value: round(expensePressure, 2),
    threshold_value: 0,
    title: 'Expenses are growing faster than revenue',
    explanation: \`Expense growth is \${pressurePoints.toFixed(1)} percentage points higher than revenue growth.\`,
    recommended_action: 'Review variable costs and defer discretionary spend until revenue catches up.',
    source_table: 'expenses',
    source_record_id: null
  });
}

for (const capacity of capacityPositions) {
  const weeklyUnits = toNumber(capacity.weekly_units);
  const leadTimeDays = toNumber(capacity.lead_time_days);
  const quantityOnHand = toNumber(capacity.quantity_on_hand);
  const dailyUnits = weeklyUnits / 7;

  if (weeklyUnits <= 0 || leadTimeDays <= 0 || dailyUnits <= 0) {
    continue;
  }

  const coverDays = round(quantityOnHand / dailyUnits, 1);
  if (coverDays <= leadTimeDays || quantityOnHand <= toNumber(capacity.reorder_point)) {
    addRisk({
      risk_type: 'stockout_risk',
      severity: 'high',
      dedupe_key: \`stockout_risk:capacity_positions:\${capacity.id}\`,
      metric_name: 'capacity_cover_days',
      metric_value: coverDays,
      threshold_value: leadTimeDays,
      title: 'Inventory cover is inside lead time',
      explanation: \`\${capacity.resource_code} has \${coverDays.toFixed(1)} days of cover at current velocity, below the \${leadTimeDays} day lead time.\`,
      recommended_action: 'Reorder inventory or shift demand away from the constrained SKU.',
      source_table: 'capacity_positions',
      source_record_id: capacity.id
    });
  }
}

const asOfDate = new Date(\`\${today}T00:00:00.000Z\`);
for (const deal of openPipeline) {
  const expectedCloseDate = dateOnly(deal.expected_close_date);
  if (String(deal.status || '').toLowerCase() !== 'open' || !expectedCloseDate) {
    continue;
  }

  const closeDate = new Date(\`\${expectedCloseDate}T00:00:00.000Z\`);
  if (closeDate < asOfDate) {
    const dealValue = round(deal.value);
    addRisk({
      risk_type: 'deal_slippage',
      severity: 'high',
      dedupe_key: \`deal_slippage:crm_pipeline:\${deal.id}\`,
      metric_name: 'deal_value',
      metric_value: dealValue,
      threshold_value: 0,
      title: 'Open deal is past its expected close date',
      explanation: \`\${deal.deal_name} worth \${dealValue.toFixed(2)} is still open after its expected close date of \${expectedCloseDate}.\`,
      recommended_action: 'Confirm next step, update close date, or remove the deal from near-term forecast.',
      source_table: 'crm_pipeline',
      source_record_id: deal.id
    });
  }
}

return [{
  json: {
    snapshot_date: today,
    period_start: periodStart,
    period_end: periodEnd,
    forecasts,
    risks,
    risk_types: risks.map((risk) => risk.risk_type),
    summary: {
      projected_revenue: projectedRevenue,
      target_revenue: revenueTarget,
      current_margin_pct: currentMarginPct,
      previous_margin_pct: previousMarginPct,
      revenue_growth: round(revenueGrowth, 4),
      expense_growth: round(expenseGrowth, 4),
      risk_count: risks.length
    }
  }
}];`,
    };

    @node({
        id: '87136083-fc51-4d93-84c1-06fad73105ce',
        name: 'Upsert Risk Events',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [912, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    UpsertRiskEvents = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'risk_events',
        },
        query: `WITH input_risks AS (
  SELECT *
  FROM jsonb_to_recordset('{{ JSON.stringify($json.risks).replace(/'/g, "''") }}'::jsonb) AS risk(
    risk_type text,
    severity text,
    dedupe_key text,
    metric_name text,
    metric_value numeric,
    threshold_value numeric,
    title text,
    explanation text,
    recommended_action text,
    source_table text,
    source_record_id uuid
  )
),
updated AS (
  UPDATE risk_events existing
  SET
    severity = input_risks.severity,
    metric_name = input_risks.metric_name,
    metric_value = input_risks.metric_value,
    threshold_value = input_risks.threshold_value,
    title = input_risks.title,
    explanation = input_risks.explanation,
    recommended_action = input_risks.recommended_action,
    source_table = input_risks.source_table,
    source_record_id = input_risks.source_record_id,
    detected_at = now(),
    updated_at = now(),
    resolved_at = NULL
  FROM input_risks
  WHERE existing.dedupe_key = input_risks.dedupe_key
    AND existing.status IN ('open', 'acknowledged')
  RETURNING existing.dedupe_key
),
inserted AS (
  INSERT INTO risk_events (
    risk_type,
    severity,
    status,
    dedupe_key,
    metric_name,
    metric_value,
    threshold_value,
    title,
    explanation,
    recommended_action,
    source_table,
    source_record_id
  )
  SELECT
    input_risks.risk_type,
    input_risks.severity,
    'open',
    input_risks.dedupe_key,
    input_risks.metric_name,
    input_risks.metric_value,
    input_risks.threshold_value,
    input_risks.title,
    input_risks.explanation,
    input_risks.recommended_action,
    input_risks.source_table,
    input_risks.source_record_id
  FROM input_risks
  WHERE NOT EXISTS (
    SELECT 1
    FROM updated
    WHERE updated.dedupe_key = input_risks.dedupe_key
  )
    AND NOT EXISTS (
      SELECT 1
      FROM risk_events existing
      WHERE existing.dedupe_key = input_risks.dedupe_key
        AND existing.status IN ('open', 'acknowledged')
    )
  RETURNING dedupe_key
)
SELECT
  (SELECT COUNT(*) FROM input_risks)::int AS risk_count,
  (SELECT COUNT(*) FROM updated)::int AS risks_updated,
  (SELECT COUNT(*) FROM inserted)::int AS risks_inserted,
  '{{ $json.risk_types.join(",") }}' AS risk_types,
  '{{ $json.snapshot_date }}'::date AS snapshot_date,
  '{{ $json.period_start }}'::date AS period_start,
  '{{ $json.period_end }}'::date AS period_end;`,
        options: {},
    };

    @node({
        id: '6f4ef335-45ac-41d6-82cf-3483ccf3ae9c',
        name: 'Insert Forecasts',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1216, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    InsertForecasts = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'forecasts',
        },
        query: `WITH input_forecasts AS (
  SELECT *
  FROM jsonb_to_recordset('{{ JSON.stringify($('Forecast and Risk Rules').item.json.forecasts).replace(/'/g, "''") }}'::jsonb) AS forecast(
    forecast_date date,
    forecast_type text,
    period_start date,
    period_end date,
    predicted_value numeric,
    lower_bound numeric,
    upper_bound numeric,
    method text,
    inputs_summary jsonb
  )
),
inserted AS (
  INSERT INTO forecasts (
    forecast_date,
    forecast_type,
    period_start,
    period_end,
    predicted_value,
    lower_bound,
    upper_bound,
    method,
    inputs_summary
  )
  SELECT
    forecast_date,
    forecast_type,
    period_start,
    period_end,
    predicted_value,
    lower_bound,
    upper_bound,
    method,
    inputs_summary
  FROM input_forecasts
  RETURNING id, forecast_type, predicted_value
)
SELECT
  COUNT(*)::int AS forecast_count,
  COALESCE(jsonb_agg(jsonb_build_object(
    'forecast_id', inserted.id::text,
    'forecast_type', inserted.forecast_type,
    'predicted_value', inserted.predicted_value
  )), '[]'::jsonb) AS inserted_forecasts,
  '{{ $("Upsert Risk Events").item.json.risk_count }}'::int AS risk_count,
  '{{ $("Upsert Risk Events").item.json.risks_updated }}'::int AS risks_updated,
  '{{ $("Upsert Risk Events").item.json.risks_inserted }}'::int AS risks_inserted,
  '{{ $("Upsert Risk Events").item.json.risk_types }}' AS risk_types,
  '{{ new Date($("Upsert Risk Events").item.json.snapshot_date).toISOString().slice(0, 10) }}'::date AS snapshot_date,
  '{{ new Date($("Upsert Risk Events").item.json.period_start).toISOString().slice(0, 10) }}'::date AS period_start,
  '{{ new Date($("Upsert Risk Events").item.json.period_end).toISOString().slice(0, 10) }}'::date AS period_end
FROM inserted;`,
        options: {},
    };

    @node({
        id: 'd6a69f1a-11d8-4e26-8c6f-de71996d9345',
        name: 'Log Result',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1520, 128],
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
  'forecast_risk',
  'forecasts,risk_events',
  'succeeded',
  jsonb_build_object(
    'snapshot_date', '{{ $json.snapshot_date }}',
    'period_start', '{{ $json.period_start }}',
    'period_end', '{{ $json.period_end }}'
  ),
  jsonb_build_object(
    'forecast_count', {{ $json.forecast_count }},
    'risk_count', {{ $json.risk_count }},
    'risks_inserted', {{ $json.risks_inserted }},
    'risks_updated', {{ $json.risks_updated }},
    'risk_types', string_to_array('{{ $json.risk_types }}', ','),
    'inserted_forecasts', '{{ JSON.stringify($json.inserted_forecasts).replace(/'/g, "''") }}'::jsonb
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
        this.ManualDemoTrigger.out(0).to(this.LoadCommercialInputs.in(0));
        this.ForecastRiskSchedule.out(0).to(this.LoadCommercialInputs.in(0));
        this.LoadCommercialInputs.out(0).to(this.ForecastAndRiskRules.in(0));
        this.ForecastAndRiskRules.out(0).to(this.UpsertRiskEvents.in(0));
        this.UpsertRiskEvents.out(0).to(this.InsertForecasts.in(0));
        this.InsertForecasts.out(0).to(this.LogResult.in(0));
    }
}
