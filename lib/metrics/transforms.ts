import { formatCurrency } from "../formatting/currency.ts";
import { formatShortDate } from "../formatting/dates.ts";
import type {
  AiReport,
  ImportHealth,
  KpiState,
  KpiTileModel,
  MetricSnapshot,
  RecommendedAction,
  RiskEvent,
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
