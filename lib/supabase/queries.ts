import { getSupabaseClient } from "./client.ts";
import {
  normalizeActionLog,
  normalizeAiReport,
  normalizeForecast,
  normalizeImportHealth,
  normalizeMetricSnapshot,
  normalizeRecommendedAction,
  normalizeRiskEvent,
} from "../metrics/transforms.ts";
import type {
  ActionLog,
  AiReport,
  Forecast,
  ImportHealth,
  MetricSnapshot,
  RecommendedAction,
  RiskEvent,
  SampleCapacityPosition,
  SampleData,
  SampleExpense,
  SamplePipelineDeal,
  SampleSalesOrder,
  SampleTarget,
  SourceTableCount,
} from "../metrics/types.ts";

type QueryClient = {
  from: (table: string) => any;
};

const requiredSourceTables = ["sales_orders", "crm_pipeline", "expenses", "capacity_positions", "targets"] as const;

const severityRank: Record<RiskEvent["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const priorityRank: Record<RecommendedAction["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function unwrapData<T>(result: { data: T; error: { message: string } | null }, label: string) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.data;
}

function unwrapRows<T>(result: { data: T[] | null; error: { message: string } | null }, label: string) {
  return unwrapData(result, label) ?? [];
}

function unwrapCount(result: { count: number | null; error: { message: string } | null }, label: string) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.count ?? 0;
}

function toRequiredNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function sortRisksByUrgency(risks: RiskEvent[]) {
  return risks.sort((left, right) => {
    const severityDelta = severityRank[right.severity] - severityRank[left.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
  });
}

function sortActionsByPriority(actions: RecommendedAction[]) {
  return actions.sort((left, right) => {
    const priorityDelta = priorityRank[right.priority] - priorityRank[left.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export async function getLatestMetricSnapshot(
  client: QueryClient = getSupabaseClient(),
): Promise<MetricSnapshot | null> {
  const result = await client
    .from("metric_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeMetricSnapshot(unwrapData(result, "Unable to load latest metric snapshot"));
}

export async function getOpenRiskEvents(
  client: QueryClient = getSupabaseClient(),
): Promise<RiskEvent[]> {
  const result = await client
    .from("risk_events")
    .select("*")
    .eq("status", "open")
    .order("severity", { ascending: false })
    .order("detected_at", { ascending: false })
    .limit(5);

  return sortRisksByUrgency(
    unwrapRows(result, "Unable to load open risk events").map((row) =>
      normalizeRiskEvent(row as Parameters<typeof normalizeRiskEvent>[0]),
    ),
  );
}

export async function getOperatingRiskEvents(
  client: QueryClient = getSupabaseClient(),
): Promise<RiskEvent[]> {
  const result = await client
    .from("risk_events")
    .select("*")
    .in("status", ["open", "acknowledged"])
    .order("detected_at", { ascending: false })
    .limit(20);

  return sortRisksByUrgency(
    unwrapRows(result, "Unable to load operating risk events").map((row) =>
      normalizeRiskEvent(row as Parameters<typeof normalizeRiskEvent>[0]),
    ),
  );
}

export async function getLatestAiReport(
  client: QueryClient = getSupabaseClient(),
): Promise<AiReport | null> {
  const result = await client
    .from("ai_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeAiReport(unwrapData(result, "Unable to load latest AI report"));
}

export async function getRecommendedActions(
  client: QueryClient = getSupabaseClient(),
): Promise<RecommendedAction[]> {
  const result = await client
    .from("recommended_actions")
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return sortActionsByPriority(
    unwrapRows(result, "Unable to load recommended actions").map((row) =>
      normalizeRecommendedAction(row as Parameters<typeof normalizeRecommendedAction>[0]),
    ),
  );
}

export async function getActionQueue(
  client: QueryClient = getSupabaseClient(),
): Promise<RecommendedAction[]> {
  const result = await client
    .from("recommended_actions")
    .select("*")
    .in("status", ["open", "in_progress", "done", "dismissed"])
    .order("created_at", { ascending: false })
    .limit(25);

  return sortActionsByPriority(
    unwrapRows(result, "Unable to load action queue").map((row) =>
      normalizeRecommendedAction(row as Parameters<typeof normalizeRecommendedAction>[0]),
    ),
  );
}

export async function getLatestImports(
  client: QueryClient = getSupabaseClient(),
): Promise<ImportHealth[]> {
  const result = await client
    .from("raw_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return unwrapRows(result, "Unable to load latest imports").map((row) =>
    normalizeImportHealth(row as Parameters<typeof normalizeImportHealth>[0]),
  );
}

export async function getRecentMetricSnapshots(
  client: QueryClient = getSupabaseClient(),
): Promise<MetricSnapshot[]> {
  const result = await client
    .from("metric_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  return unwrapRows(result, "Unable to load recent metric snapshots")
    .map((row) => normalizeMetricSnapshot(row as Parameters<typeof normalizeMetricSnapshot>[0]))
    .filter((snapshot): snapshot is MetricSnapshot => snapshot !== null);
}

export async function getLatestRevenueForecasts(
  client: QueryClient = getSupabaseClient(),
): Promise<Forecast[]> {
  const result = await client
    .from("forecasts")
    .select("*")
    .eq("forecast_type", "revenue")
    .order("forecast_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  return unwrapRows(result, "Unable to load revenue forecasts")
    .map((row) => normalizeForecast(row as Parameters<typeof normalizeForecast>[0]))
    .sort((left, right) => {
      const dateDelta = left.forecastDate.localeCompare(right.forecastDate);
      if (dateDelta !== 0) {
        return dateDelta;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
}

export async function getLatestWorkflowRun(
  client: QueryClient = getSupabaseClient(),
): Promise<ActionLog | null> {
  const result = await client
    .from("action_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeActionLog(unwrapData(result, "Unable to load latest workflow run"));
}

async function getSourceTableCount(client: QueryClient, tableName: string): Promise<SourceTableCount> {
  const result = await client.from(tableName).select("id", { count: "exact", head: true });

  return {
    tableName,
    rowCount: unwrapCount(result, `Unable to count ${tableName}`),
  };
}

export async function getRequiredSourceTableCounts(
  client: QueryClient = getSupabaseClient(),
): Promise<SourceTableCount[]> {
  return Promise.all(requiredSourceTables.map((tableName) => getSourceTableCount(client, tableName)));
}

type SampleSalesOrderRow = {
  id: string;
  order_date: string;
  customer: string;
  product: string;
  sku: string;
  units: number;
  revenue: number | string;
  discount: number | string;
  channel: string;
  unit_cost: number | string;
  gross_margin: number | string;
};

type SamplePipelineDealRow = {
  id: string;
  deal_name: string;
  stage: string;
  value: number | string;
  probability: number | string;
  weighted_value: number | string;
  expected_close_date: string;
  owner: string;
  status: string;
};

type SampleExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  supplier: string;
  amount: number | string;
  fixed_or_variable: string;
};

type SampleCapacityPositionRow = {
  id: string;
  resource_code: string;
  resource_name: string;
  quantity_on_hand: number;
  reorder_point: number;
  lead_time_days: number;
  unit_cost: number | string;
};

type SampleTargetRow = {
  id: string;
  period_start: string;
  period_end: string;
  revenue_target: number | string;
  gross_margin_target: number | string;
  pipeline_coverage_target: number | string;
};

function normalizeSampleSalesOrder(row: SampleSalesOrderRow): SampleSalesOrder {
  return {
    id: row.id,
    orderDate: row.order_date,
    customer: row.customer,
    product: row.product,
    sku: row.sku,
    units: row.units,
    revenue: toRequiredNumber(row.revenue),
    discount: toRequiredNumber(row.discount),
    channel: row.channel,
    unitCost: toRequiredNumber(row.unit_cost),
    grossMargin: toRequiredNumber(row.gross_margin),
  };
}

function normalizeSamplePipelineDeal(row: SamplePipelineDealRow): SamplePipelineDeal {
  return {
    id: row.id,
    dealName: row.deal_name,
    stage: row.stage,
    value: toRequiredNumber(row.value),
    probability: toRequiredNumber(row.probability),
    weightedValue: toRequiredNumber(row.weighted_value),
    expectedCloseDate: row.expected_close_date,
    owner: row.owner,
    status: row.status,
  };
}

function normalizeSampleExpense(row: SampleExpenseRow): SampleExpense {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    category: row.category,
    supplier: row.supplier,
    amount: toRequiredNumber(row.amount),
    fixedOrVariable: row.fixed_or_variable,
  };
}

function normalizeSampleCapacityPosition(row: SampleCapacityPositionRow): SampleCapacityPosition {
  return {
    id: row.id,
    resourceCode: row.resource_code,
    resourceName: row.resource_name,
    quantityOnHand: row.quantity_on_hand,
    reorderPoint: row.reorder_point,
    leadTimeDays: row.lead_time_days,
    unitCost: toRequiredNumber(row.unit_cost),
  };
}

function normalizeSampleTarget(row: SampleTargetRow): SampleTarget {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    revenueTarget: toRequiredNumber(row.revenue_target),
    grossMarginTarget: toRequiredNumber(row.gross_margin_target),
    pipelineCoverageTarget: toRequiredNumber(row.pipeline_coverage_target),
  };
}

export async function getSampleData(client: QueryClient = getSupabaseClient()): Promise<SampleData> {
  const [salesOrders, pipelineDeals, expenses, capacityPositions, targets] = await Promise.all([
    client
      .from("sales_orders")
      .select("id, order_date, customer, product, sku, units, revenue, discount, channel, unit_cost, gross_margin")
      .order("order_date", { ascending: false })
      .limit(12),
    client
      .from("crm_pipeline")
      .select("id, deal_name, stage, value, probability, weighted_value, expected_close_date, owner, status")
      .order("expected_close_date", { ascending: true })
      .limit(12),
    client
      .from("expenses")
      .select("id, expense_date, category, supplier, amount, fixed_or_variable")
      .order("expense_date", { ascending: false })
      .limit(12),
    client
      .from("capacity_positions")
      .select("id, resource_code, resource_name, quantity_on_hand, reorder_point, lead_time_days, unit_cost")
      .order("resource_code", { ascending: true })
      .limit(12),
    client
      .from("targets")
      .select("id, period_start, period_end, revenue_target, gross_margin_target, pipeline_coverage_target")
      .order("period_start", { ascending: true })
      .limit(12),
  ]);

  return {
    salesOrders: unwrapRows(salesOrders, "Unable to load sample sales orders").map((row) =>
      normalizeSampleSalesOrder(row as SampleSalesOrderRow),
    ),
    pipelineDeals: unwrapRows(pipelineDeals, "Unable to load sample CRM pipeline").map((row) =>
      normalizeSamplePipelineDeal(row as SamplePipelineDealRow),
    ),
    expenses: unwrapRows(expenses, "Unable to load sample expenses").map((row) =>
      normalizeSampleExpense(row as SampleExpenseRow),
    ),
    capacityPositions: unwrapRows(capacityPositions, "Unable to load sample capacity positions").map((row) =>
      normalizeSampleCapacityPosition(row as SampleCapacityPositionRow),
    ),
    targets: unwrapRows(targets, "Unable to load sample targets").map((row) =>
      normalizeSampleTarget(row as SampleTargetRow),
    ),
  };
}
