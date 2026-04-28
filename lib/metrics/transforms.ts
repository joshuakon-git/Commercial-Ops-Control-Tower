import { formatCurrency } from "../formatting/currency.ts";
import { formatShortDate } from "../formatting/dates.ts";
import type {
  ActionLog,
  AiReport,
  DataHealthCheck,
  Forecast,
  ImportHealth,
  KpiState,
  KpiTileModel,
  CapacityRiskPoint,
  MarginCostPoint,
  MetricSnapshot,
  PipelineStagePoint,
  RevenueForecastPoint,
  RecommendedAction,
  RiskEvent,
  SampleCapacityPosition,
  SampleExpense,
  SamplePipelineDeal,
  SampleSalesOrder,
  SourceTableCount,
} from "./types.ts";

type MetricSnapshotRow = {
  id: string;
  snapshot_date: string;
  period_start: string;
  period_end: string;
  period: string;
  revenue: number | string;
  gross_margin: number | string;
  gross_margin_pct: number | string;
  operating_costs: number | string;
  net_contribution: number | string;
  average_order_value: number | string;
  sales_velocity: number | string;
  weighted_pipeline: number | string;
  pipeline_coverage: number | string;
  stock_risk_count: number;
  cash_pressure_score: number | string;
  created_at: string;
};

type RiskEventRow = {
  id: string;
  risk_type: RiskEvent["riskType"];
  severity: RiskEvent["severity"];
  status: RiskEvent["status"];
  dedupe_key: string;
  metric_name: string | null;
  metric_value: number | string | null;
  threshold_value: number | string | null;
  title: string;
  explanation: string;
  recommended_action: string;
  source_table: string | null;
  source_record_id: string | null;
  detected_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type ForecastRow = {
  id: string;
  forecast_date: string;
  forecast_type: string;
  period_start: string;
  period_end: string;
  predicted_value: number | string;
  lower_bound: number | string | null;
  upper_bound: number | string | null;
  method: string;
  inputs_summary: Record<string, unknown>;
  created_at: string;
};

type AiReportRow = {
  id: string;
  report_period_start: string;
  report_period_end: string;
  summary: string;
  what_changed: string;
  needs_attention: string;
  likely_causes: string;
  recommended_actions: string;
  next_7_days_priorities: string;
  slack_text: string;
  model: string;
  input_payload: Record<string, unknown>;
  created_at: string;
};

type RecommendedActionRow = {
  id: string;
  risk_event_id: string | null;
  title: string;
  description: string;
  owner: string | null;
  priority: RecommendedAction["priority"];
  status: RecommendedAction["status"];
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ImportHealthRow = {
  id: string;
  source_name: string;
  source_type: string;
  file_name: string | null;
  status: ImportHealth["status"];
  rows_received: number;
  rows_imported: number;
  rows_failed: number;
  error_summary: string | null;
  created_at: string;
};

type ActionLogRow = {
  id: string;
  action_type: string;
  target: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
};

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

function toRequiredNumber(value: number | string) {
  return toNumber(value) ?? 0;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCoverage(value: number) {
  return `${value.toFixed(1)}x`;
}

function stateFromPipelineCoverage(value: number): KpiState {
  if (value <= 0) {
    return "neutral";
  }

  if (value < 1) {
    return "warning";
  }

  return "good";
}

export function normalizeMetricSnapshot(row: MetricSnapshotRow | null): MetricSnapshot | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    period: row.period,
    revenue: toRequiredNumber(row.revenue),
    grossMargin: toRequiredNumber(row.gross_margin),
    grossMarginPct: toRequiredNumber(row.gross_margin_pct),
    operatingCosts: toRequiredNumber(row.operating_costs),
    netContribution: toRequiredNumber(row.net_contribution),
    averageOrderValue: toRequiredNumber(row.average_order_value),
    salesVelocity: toRequiredNumber(row.sales_velocity),
    weightedPipeline: toRequiredNumber(row.weighted_pipeline),
    pipelineCoverage: toRequiredNumber(row.pipeline_coverage),
    stockRiskCount: row.stock_risk_count,
    cashPressureScore: toRequiredNumber(row.cash_pressure_score),
    createdAt: row.created_at,
  };
}

export function normalizeRiskEvent(row: RiskEventRow): RiskEvent {
  return {
    id: row.id,
    riskType: row.risk_type,
    severity: row.severity,
    status: row.status,
    dedupeKey: row.dedupe_key,
    metricName: row.metric_name,
    metricValue: toNumber(row.metric_value),
    thresholdValue: toNumber(row.threshold_value),
    title: row.title,
    explanation: row.explanation,
    recommendedAction: row.recommended_action,
    sourceTable: row.source_table,
    sourceRecordId: row.source_record_id,
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

export function normalizeForecast(row: ForecastRow): Forecast {
  return {
    id: row.id,
    forecastDate: row.forecast_date,
    forecastType: row.forecast_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    predictedValue: toRequiredNumber(row.predicted_value),
    lowerBound: toNumber(row.lower_bound),
    upperBound: toNumber(row.upper_bound),
    method: row.method,
    inputsSummary: row.inputs_summary,
    createdAt: row.created_at,
  };
}

export function normalizeAiReport(row: AiReportRow | null): AiReport | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    summary: row.summary,
    whatChanged: row.what_changed,
    needsAttention: row.needs_attention,
    likelyCauses: row.likely_causes,
    recommendedActions: row.recommended_actions,
    next7DaysPriorities: row.next_7_days_priorities,
    slackText: row.slack_text,
    model: row.model,
    inputPayload: row.input_payload,
    createdAt: row.created_at,
  };
}

export function normalizeRecommendedAction(row: RecommendedActionRow): RecommendedAction {
  return {
    id: row.id,
    riskEventId: row.risk_event_id,
    title: row.title,
    description: row.description,
    owner: row.owner,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function normalizeImportHealth(row: ImportHealthRow): ImportHealth {
  return {
    id: row.id,
    sourceName: row.source_name,
    sourceType: row.source_type,
    fileName: row.file_name,
    status: row.status,
    rowsReceived: row.rows_received,
    rowsImported: row.rows_imported,
    rowsFailed: row.rows_failed,
    errorSummary: row.error_summary,
    createdAt: row.created_at,
  };
}

export function normalizeActionLog(row: ActionLogRow | null): ActionLog | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    actionType: row.action_type,
    target: row.target,
    status: row.status,
    payload: row.payload,
    result: row.result,
    createdAt: row.created_at,
  };
}

export function buildKpiTiles(
  snapshot: MetricSnapshot | null,
  latestImports: ImportHealth[],
): KpiTileModel[] {
  const latestImport = latestImports[0];
  const revenue = snapshot?.revenue ?? 0;
  const grossMarginPct = snapshot?.grossMarginPct ?? 0;
  const pipelineCoverage = snapshot?.pipelineCoverage ?? 0;

  return [
    {
      label: "Revenue MTD",
      value: formatCurrency(revenue),
      deltaLabel: snapshot ? `Snapshot ${formatShortDate(snapshot.snapshotDate)}` : "No snapshot yet",
      state: revenue > 0 ? "good" : "neutral",
    },
    {
      label: "Gross margin",
      value: formatPercent(grossMarginPct),
      deltaLabel: snapshot ? `${formatCurrency(snapshot.grossMargin)} gross margin` : "No snapshot yet",
      state: grossMarginPct < 0.3 && grossMarginPct > 0 ? "warning" : "neutral",
    },
    {
      label: "Pipeline coverage",
      value: formatCoverage(pipelineCoverage),
      deltaLabel: snapshot ? `${formatCurrency(snapshot.weightedPipeline)} weighted pipeline` : "No snapshot yet",
      state: stateFromPipelineCoverage(pipelineCoverage),
    },
    {
      label: "Last import",
      value: latestImport ? formatShortDate(latestImport.createdAt) : "No imports",
      deltaLabel: latestImport ? latestImport.sourceName : "Waiting for source data",
      state: latestImport?.status === "failed" ? "danger" : latestImport ? "good" : "warning",
    },
  ];
}

function readNumericInput(summary: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = summary[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

const expectedDemoRiskTypes = [
  "revenue_pacing",
  "margin_drop",
  "stockout_risk",
  "deal_slippage",
  "expense_pressure",
] as const;

export function getMissingDemoRiskTypes(risks: Pick<RiskEvent, "riskType">[]) {
  const presentTypes = new Set(risks.map((risk) => risk.riskType));

  return expectedDemoRiskTypes.filter((riskType) => !presentTypes.has(riskType));
}

function deriveTargetRevenue(snapshots: MetricSnapshot[], forecasts: Forecast[]) {
  const explicitTarget = forecasts
    .map((forecast) =>
      readNumericInput(forecast.inputsSummary, ["revenueTarget", "revenue_target", "targetRevenue", "target_revenue"]),
    )
    .find((value): value is number => value !== null);

  if (explicitTarget !== undefined) {
    return explicitTarget;
  }

  const maxVisibleValue = Math.max(
    0,
    ...snapshots.map((snapshot) => snapshot.revenue),
    ...forecasts.map((forecast) => forecast.predictedValue),
  );

  // Forecast rows do not persist targets yet, so this gives the chart a stable pacing reference.
  return maxVisibleValue > 0 ? Math.round(maxVisibleValue * 1.1) : null;
}

export function buildRevenueForecastSeries(
  snapshots: MetricSnapshot[],
  forecasts: Forecast[],
): RevenueForecastPoint[] {
  const targetRevenue = deriveTargetRevenue(snapshots, forecasts);
  const pointsByDate = new Map<string, RevenueForecastPoint>();
  const forecastRun = getLatestForecastRun(forecasts).sort((left, right) =>
    left.forecastDate.localeCompare(right.forecastDate),
  );

  for (const snapshot of snapshots) {
    pointsByDate.set(snapshot.snapshotDate, {
      date: snapshot.snapshotDate,
      label: formatShortDate(snapshot.snapshotDate),
      actualRevenue: snapshot.revenue,
      forecastRevenue: null,
      targetRevenue: forecastRun.length > 0 ? null : targetRevenue,
    });
  }

  forecastRun.forEach((forecast, index) => {
    const existing = pointsByDate.get(forecast.forecastDate);
    pointsByDate.set(forecast.forecastDate, {
      date: forecast.forecastDate,
      label: formatShortDate(forecast.forecastDate),
      actualRevenue: existing?.actualRevenue ?? null,
      forecastRevenue: forecast.predictedValue,
      targetRevenue: prorateTargetRevenue(targetRevenue, index, forecastRun.length),
    });
  });

  return Array.from(pointsByDate.values()).sort((left, right) => left.date.localeCompare(right.date));
}

function getLatestForecastRun(forecasts: Forecast[]) {
  if (forecasts.length === 0) {
    return [];
  }

  const latestCreatedAt = forecasts.reduce((latest, forecast) =>
    forecast.createdAt.localeCompare(latest) > 0 ? forecast.createdAt : latest,
  forecasts[0].createdAt);

  return forecasts.filter((forecast) => forecast.createdAt === latestCreatedAt);
}

function prorateTargetRevenue(targetRevenue: number | null, forecastIndex: number, forecastCount: number) {
  if (targetRevenue === null || forecastCount <= 1) {
    return targetRevenue;
  }

  return Math.round(targetRevenue * ((forecastIndex + 1) / forecastCount));
}

const inactiveDealStatuses = new Set(["lost", "closed_lost", "dead", "cancelled", "canceled"]);

export function buildPipelineStageSeries(deals: SamplePipelineDeal[]): PipelineStagePoint[] {
  const stageTotals = new Map<string, PipelineStagePoint>();

  for (const deal of deals) {
    if (inactiveDealStatuses.has(deal.status.toLowerCase())) {
      continue;
    }

    const existing = stageTotals.get(deal.stage) ?? {
      stage: deal.stage,
      rawValue: 0,
      weightedValue: 0,
      dealCount: 0,
    };

    existing.rawValue += deal.value;
    existing.weightedValue += deal.weightedValue;
    existing.dealCount += 1;
    stageTotals.set(deal.stage, existing);
  }

  return Array.from(stageTotals.values()).sort((left, right) => {
    const weightedDelta = right.weightedValue - left.weightedValue;
    if (weightedDelta !== 0) {
      return weightedDelta;
    }

    return right.rawValue - left.rawValue;
  });
}

function startOfWeekIso(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);

  return date.toISOString().slice(0, 10);
}

export function buildMarginCostSeries(
  salesOrders: SampleSalesOrder[],
  expenses: SampleExpense[],
  fallbackSnapshots: MetricSnapshot[] = [],
): MarginCostPoint[] {
  if (salesOrders.length === 0 && expenses.length === 0) {
    return fallbackSnapshots
      .map((snapshot) => ({
        date: snapshot.snapshotDate,
        label: formatShortDate(snapshot.snapshotDate),
        revenue: snapshot.revenue,
        grossMargin: snapshot.grossMargin,
        operatingCosts: snapshot.operatingCosts,
        netContribution: snapshot.netContribution,
      }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  const pointsByWeek = new Map<string, MarginCostPoint>();

  function getOrCreatePoint(date: string) {
    const weekStart = startOfWeekIso(date);
    const existing = pointsByWeek.get(weekStart) ?? {
      date: weekStart,
      label: formatShortDate(weekStart),
      revenue: 0,
      grossMargin: 0,
      operatingCosts: 0,
      netContribution: 0,
    };

    pointsByWeek.set(weekStart, existing);
    return existing;
  }

  for (const order of salesOrders) {
    const point = getOrCreatePoint(order.orderDate);
    point.revenue += order.revenue;
    point.grossMargin += order.grossMargin;
  }

  for (const expense of expenses) {
    const point = getOrCreatePoint(expense.expenseDate);
    point.operatingCosts += expense.amount;
  }

  return Array.from(pointsByWeek.values())
    .map((point) => ({
      ...point,
      netContribution: point.grossMargin - point.operatingCosts,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function buildCapacityRiskSeries(positions: SampleCapacityPosition[]): CapacityRiskPoint[] {
  return positions
    .map((position) => ({
      label: position.resourceCode,
      resourceName: position.resourceName,
      quantityOnHand: position.quantityOnHand,
      reorderPoint: position.reorderPoint,
      reorderGap: position.quantityOnHand - position.reorderPoint,
      leadTimeDays: position.leadTimeDays,
    }))
    .sort((left, right) => {
      const gapDelta = left.reorderGap - right.reorderGap;
      if (gapDelta !== 0) {
        return gapDelta;
      }

      return right.leadTimeDays - left.leadTimeDays;
    });
}

function hoursSince(value: string, now: Date) {
  return (now.getTime() - new Date(value).getTime()) / (1000 * 60 * 60);
}

function daysSince(value: string, now: Date) {
  return hoursSince(value, now) / 24;
}

export function buildDataHealthChecks({
  latestImports,
  latestSnapshot,
  latestWorkflowRun,
  sourceTableCounts,
  latestAiReport,
  now = new Date(),
}: {
  latestImports: ImportHealth[];
  latestSnapshot: MetricSnapshot | null;
  latestWorkflowRun: ActionLog | null;
  sourceTableCounts: SourceTableCount[];
  latestAiReport: AiReport | null;
  now?: Date;
}): DataHealthCheck[] {
  const latestSuccessfulImport = latestImports.find((item) => item.status === "succeeded");
  const emptyTables = sourceTableCounts.filter((item) => item.rowCount === 0);

  return [
    {
      label: "Successful import freshness",
      state: latestSuccessfulImport && daysSince(latestSuccessfulImport.createdAt, now) <= 7 ? "ok" : "danger",
      detail: latestSuccessfulImport
        ? `Latest successful import: ${latestSuccessfulImport.sourceName} on ${formatShortDate(latestSuccessfulImport.createdAt)}`
        : "No successful import found.",
    },
    {
      label: "Metric snapshot freshness",
      state: latestSnapshot && hoursSince(latestSnapshot.createdAt, now) <= 48 ? "ok" : "danger",
      detail: latestSnapshot
        ? `Latest metric snapshot created ${formatShortDate(latestSnapshot.createdAt)}`
        : "No metric snapshot found.",
    },
    {
      label: "Latest workflow run",
      state: latestWorkflowRun ? (latestWorkflowRun.status === "failed" ? "danger" : "ok") : "warning",
      detail: latestWorkflowRun
        ? `${latestWorkflowRun.actionType} ${latestWorkflowRun.status} on ${formatShortDate(latestWorkflowRun.createdAt)}`
        : "No workflow run has been logged yet.",
    },
    {
      label: "Required source table coverage",
      state: emptyTables.length > 0 ? "danger" : "ok",
      detail:
        emptyTables.length > 0
          ? `Zero rows in ${emptyTables.map((item) => item.tableName).join(", ")}.`
          : "Required source tables contain rows.",
    },
    {
      label: "AI report freshness",
      state: latestAiReport && daysSince(latestAiReport.createdAt, now) <= 8 ? "ok" : "warning",
      detail: latestAiReport
        ? `Latest report created ${formatShortDate(latestAiReport.createdAt)}`
        : "No AI report generated yet.",
    },
  ];
}
