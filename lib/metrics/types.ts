export type KpiState = "good" | "neutral" | "warning" | "danger";

export type KpiTileModel = {
  label: string;
  value: string;
  deltaLabel?: string;
  state: KpiState;
};

export type MetricSnapshot = {
  id: string;
  snapshotDate: string;
  periodStart: string;
  periodEnd: string;
  period: string;
  revenue: number;
  grossMargin: number;
  grossMarginPct: number;
  operatingCosts: number;
  netContribution: number;
  averageOrderValue: number;
  salesVelocity: number;
  weightedPipeline: number;
  pipelineCoverage: number;
  stockRiskCount: number;
  cashPressureScore: number;
  createdAt: string;
};

export type Forecast = {
  id: string;
  forecastDate: string;
  forecastType: string;
  periodStart: string;
  periodEnd: string;
  predictedValue: number;
  lowerBound: number | null;
  upperBound: number | null;
  method: string;
  inputsSummary: Record<string, unknown>;
  createdAt: string;
};

export type RevenueForecastPoint = {
  date: string;
  label: string;
  actualRevenue: number | null;
  forecastRevenue: number | null;
  targetRevenue: number | null;
};

export type RiskSeverity = "low" | "medium" | "high";
export type RiskStatus = "open" | "acknowledged" | "resolved";

export type RiskEvent = {
  id: string;
  riskType: string;
  severity: RiskSeverity;
  status: RiskStatus;
  dedupeKey: string;
  metricName: string | null;
  metricValue: number | null;
  thresholdValue: number | null;
  title: string;
  explanation: string;
  recommendedAction: string;
  sourceTable: string | null;
  sourceRecordId: string | null;
  detectedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type AiReport = {
  id: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  summary: string;
  whatChanged: string;
  needsAttention: string;
  likelyCauses: string;
  recommendedActions: string;
  next7DaysPriorities: string;
  slackText: string;
  model: string;
  inputPayload: Record<string, unknown>;
  createdAt: string;
};

export type ActionPriority = "low" | "medium" | "high";
export type ActionStatus = "open" | "in_progress" | "done" | "dismissed";

export type RecommendedAction = {
  id: string;
  riskEventId: string | null;
  title: string;
  description: string;
  owner: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ActionLog = {
  id: string;
  actionType: string;
  target: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
};

export type SourceTableCount = {
  tableName: string;
  rowCount: number;
};

export type SampleSalesOrder = {
  id: string;
  orderDate: string;
  customer: string;
  product: string;
  sku: string;
  units: number;
  revenue: number;
  discount: number;
  channel: string;
  unitCost: number;
  grossMargin: number;
};

export type SamplePipelineDeal = {
  id: string;
  dealName: string;
  stage: string;
  value: number;
  probability: number;
  weightedValue: number;
  expectedCloseDate: string;
  owner: string;
  status: string;
};

export type SampleExpense = {
  id: string;
  expenseDate: string;
  category: string;
  supplier: string;
  amount: number;
  fixedOrVariable: string;
};

export type SampleCapacityPosition = {
  id: string;
  resourceCode: string;
  resourceName: string;
  quantityOnHand: number;
  reorderPoint: number;
  leadTimeDays: number;
  unitCost: number;
};

export type SampleTarget = {
  id: string;
  periodStart: string;
  periodEnd: string;
  revenueTarget: number;
  grossMarginTarget: number;
  pipelineCoverageTarget: number;
};

export type SampleData = {
  salesOrders: SampleSalesOrder[];
  pipelineDeals: SamplePipelineDeal[];
  expenses: SampleExpense[];
  capacityPositions: SampleCapacityPosition[];
  targets: SampleTarget[];
};

export type DataHealthCheck = {
  label: string;
  state: "ok" | "warning" | "danger";
  detail: string;
};

export type ImportStatus = "pending" | "succeeded" | "failed";

export type ImportHealth = {
  id: string;
  sourceName: string;
  sourceType: string;
  fileName: string | null;
  status: ImportStatus;
  rowsReceived: number;
  rowsImported: number;
  rowsFailed: number;
  errorSummary: string | null;
  createdAt: string;
};
