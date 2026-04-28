import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCapacityRiskSeries,
  buildDataHealthChecks,
  buildKpiTiles,
  buildMarginCostSeries,
  buildPipelineStageSeries,
  buildRevenueForecastSeries,
  getMissingDemoRiskTypes,
  normalizeForecast,
  normalizeMetricSnapshot,
} from "./transforms.ts";

test("normalizes numeric metric snapshot fields from Supabase rows", () => {
  const snapshot = normalizeMetricSnapshot({
    id: "snapshot-1",
    snapshot_date: "2026-04-27",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    period: "month",
    revenue: "31120.45",
    gross_margin: "11266.12",
    gross_margin_pct: "0.36",
    operating_costs: "18650.00",
    net_contribution: "-7383.88",
    average_order_value: "3457.83",
    sales_velocity: "5.72",
    weighted_pipeline: "34800.00",
    pipeline_coverage: "0.46",
    stock_risk_count: 1,
    cash_pressure_score: "64.2",
    created_at: "2026-04-27T09:30:00.000Z",
  });

  assert.equal(snapshot?.revenue, 31120.45);
  assert.equal(snapshot?.grossMarginPct, 0.36);
  assert.equal(snapshot?.stockRiskCount, 1);
  assert.equal(snapshot?.cashPressureScore, 64.2);
});

test("builds compact KPI tiles from the latest snapshot and import health", () => {
  const tiles = buildKpiTiles(
    {
      id: "snapshot-1",
      snapshotDate: "2026-04-27",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      period: "month",
      revenue: 31120,
      grossMargin: 11266,
      grossMarginPct: 0.362,
      operatingCosts: 18650,
      netContribution: -7384,
      averageOrderValue: 3458,
      salesVelocity: 5.72,
      weightedPipeline: 34800,
      pipelineCoverage: 0.46,
      stockRiskCount: 1,
      cashPressureScore: 64.2,
      createdAt: "2026-04-27T09:30:00.000Z",
    },
    [
      {
        id: "import-1",
        sourceName: "Seeded sales orders",
        sourceType: "csv",
        fileName: "sales_orders.csv",
        status: "succeeded",
        rowsReceived: 12,
        rowsImported: 12,
        rowsFailed: 0,
        errorSummary: null,
        createdAt: "2026-04-27T09:00:00.000Z",
      },
    ],
  );

  assert.deepEqual(
    tiles.map((tile) => [tile.label, tile.value, tile.state]),
    [
      ["Revenue MTD", "£31.12k", "good"],
      ["Gross margin", "36.2%", "neutral"],
      ["Pipeline coverage", "0.5x", "warning"],
      ["Last import", "Apr 27", "good"],
    ],
  );
});

test("builds empty KPI tiles when no snapshot or imports exist", () => {
  const tiles = buildKpiTiles(null, []);

  assert.deepEqual(
    tiles.map((tile) => [tile.label, tile.value, tile.state]),
    [
      ["Revenue MTD", "£0", "neutral"],
      ["Gross margin", "0.0%", "neutral"],
      ["Pipeline coverage", "0.0x", "neutral"],
      ["Last import", "No imports", "warning"],
    ],
  );
});

test("normalizes revenue forecasts and builds chart points with a derived target", () => {
  const forecast = normalizeForecast({
    id: "forecast-1",
    forecast_date: "2026-04-30",
    forecast_type: "revenue",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    predicted_value: "42000.00",
    lower_bound: "39000.00",
    upper_bound: null,
    method: "recent-average",
    inputs_summary: {},
    created_at: "2026-04-27T10:00:00.000Z",
  });

  assert.equal(forecast.predictedValue, 42000);
  assert.equal(forecast.lowerBound, 39000);
  assert.equal(forecast.upperBound, null);

  const series = buildRevenueForecastSeries(
    [
      {
        id: "snapshot-1",
        snapshotDate: "2026-04-26",
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        period: "month",
        revenue: 32000,
        grossMargin: 12800,
        grossMarginPct: 0.4,
        operatingCosts: 18000,
        netContribution: -5200,
        averageOrderValue: 3200,
        salesVelocity: 6,
        weightedPipeline: 55000,
        pipelineCoverage: 1.3,
        stockRiskCount: 1,
        cashPressureScore: 42,
        createdAt: "2026-04-26T10:00:00.000Z",
      },
    ],
    [forecast],
  );

  assert.deepEqual(series, [
    {
      date: "2026-04-26",
      label: "Apr 26",
      actualRevenue: 32000,
      forecastRevenue: null,
      targetRevenue: null,
    },
    {
      date: "2026-04-30",
      label: "Apr 30",
      actualRevenue: null,
      forecastRevenue: 42000,
      targetRevenue: 46200,
    },
  ]);
});

test("prorates monthly revenue target across four-week forecast horizons", () => {
  const snapshots = [
    {
      id: "snapshot-1",
      snapshotDate: "2026-04-28",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      period: "month",
      revenue: 37000,
      grossMargin: 16000,
      grossMarginPct: 0.43,
      operatingCosts: 21000,
      netContribution: -5000,
      averageOrderValue: 3300,
      salesVelocity: 6,
      weightedPipeline: 42000,
      pipelineCoverage: 0.6,
      stockRiskCount: 1,
      cashPressureScore: 64,
      createdAt: "2026-04-28T09:00:00.000Z",
    },
  ];
  const forecasts = [1, 2, 3, 4].map((horizon) =>
    normalizeForecast({
      id: `forecast-${horizon}`,
      forecast_date: `2026-05-${String(5 + (horizon - 1) * 7).padStart(2, "0")}`,
      forecast_type: "revenue",
      period_start: "2026-04-01",
      period_end: "2026-04-30",
      predicted_value: String(7500 * horizon),
      lower_bound: null,
      upper_bound: null,
      method: "four_week_average",
      inputs_summary: { revenueTarget: 70000 },
      created_at: "2026-04-28T10:00:00.000Z",
    }),
  );

  assert.deepEqual(buildRevenueForecastSeries(snapshots, forecasts), [
    {
      date: "2026-04-28",
      label: "Apr 28",
      actualRevenue: 37000,
      forecastRevenue: null,
      targetRevenue: null,
    },
    {
      date: "2026-05-05",
      label: "May 5",
      actualRevenue: null,
      forecastRevenue: 7500,
      targetRevenue: 17500,
    },
    {
      date: "2026-05-12",
      label: "May 12",
      actualRevenue: null,
      forecastRevenue: 15000,
      targetRevenue: 35000,
    },
    {
      date: "2026-05-19",
      label: "May 19",
      actualRevenue: null,
      forecastRevenue: 22500,
      targetRevenue: 52500,
    },
    {
      date: "2026-05-26",
      label: "May 26",
      actualRevenue: null,
      forecastRevenue: 30000,
      targetRevenue: 70000,
    },
  ]);
});

test("aggregates raw and weighted pipeline by active deal stage", () => {
  const series = buildPipelineStageSeries([
    {
      id: "deal-1",
      dealName: "North expansion",
      stage: "Proposal",
      value: 40000,
      probability: 0.5,
      weightedValue: 20000,
      expectedCloseDate: "2026-05-15",
      owner: "Ava",
      status: "open",
    },
    {
      id: "deal-2",
      dealName: "Renewal",
      stage: "Proposal",
      value: 25000,
      probability: 0.6,
      weightedValue: 15000,
      expectedCloseDate: "2026-05-20",
      owner: "Mina",
      status: "open",
    },
    {
      id: "deal-3",
      dealName: "Dormant opportunity",
      stage: "Discovery",
      value: 100000,
      probability: 0.2,
      weightedValue: 20000,
      expectedCloseDate: "2026-06-01",
      owner: "Sam",
      status: "lost",
    },
  ]);

  assert.deepEqual(series, [
    {
      stage: "Proposal",
      rawValue: 65000,
      weightedValue: 35000,
      dealCount: 2,
    },
  ]);
});

test("builds margin and cost trend points from source sales and expense date ranges", () => {
  const series = buildMarginCostSeries(
    [
      {
        id: "order-1",
        orderDate: "2026-03-27",
        customer: "Heritage Market",
        product: "Signal Kit",
        sku: "SKU-003",
        units: 18,
        revenue: 5400,
        discount: 0,
        channel: "direct",
        unitCost: 170,
        grossMargin: 2340,
      },
      {
        id: "order-2",
        orderDate: "2026-04-27",
        customer: "Apex Cafe",
        product: "Starter Pack",
        sku: "SKU-001",
        units: 8,
        revenue: 1280,
        discount: 0,
        channel: "direct",
        unitCost: 90,
        grossMargin: 560,
      },
    ],
    [
      {
        id: "expense-1",
        expenseDate: "2026-04-09",
        category: "Fulfillment",
        supplier: "ShipRight",
        amount: 2300,
        fixedOrVariable: "variable",
      },
      {
        id: "expense-2",
        expenseDate: "2026-05-27",
        category: "Contract Labor",
        supplier: "Ops Bench",
        amount: 4200,
        fixedOrVariable: "variable",
      },
    ],
  );

  assert.deepEqual(
    series.map((point) => [point.date, point.revenue, point.grossMargin, point.operatingCosts, point.netContribution]),
    [
      ["2026-03-23", 5400, 2340, 0, 2340],
      ["2026-04-06", 0, 0, 2300, -2300],
      ["2026-04-27", 1280, 560, 0, 560],
      ["2026-05-25", 0, 0, 4200, -4200],
    ],
  );
});

test("builds margin and cost trend points from metric snapshots when source rows are unavailable", () => {
  const series = buildMarginCostSeries([], [], [
    {
      id: "snapshot-2",
      snapshotDate: "2026-04-14",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      period: "month",
      revenue: 44000,
      grossMargin: 18000,
      grossMarginPct: 0.41,
      operatingCosts: 16000,
      netContribution: 2000,
      averageOrderValue: 4000,
      salesVelocity: 6,
      weightedPipeline: 72000,
      pipelineCoverage: 1.2,
      stockRiskCount: 0,
      cashPressureScore: 30,
      createdAt: "2026-04-14T09:00:00.000Z",
    },
    {
      id: "snapshot-1",
      snapshotDate: "2026-04-07",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      period: "month",
      revenue: 32000,
      grossMargin: 12000,
      grossMarginPct: 0.38,
      operatingCosts: 15000,
      netContribution: -3000,
      averageOrderValue: 3200,
      salesVelocity: 5,
      weightedPipeline: 55000,
      pipelineCoverage: 1,
      stockRiskCount: 1,
      cashPressureScore: 42,
      createdAt: "2026-04-07T09:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    series.map((point) => [point.date, point.revenue, point.grossMargin, point.operatingCosts, point.netContribution]),
    [
      ["2026-04-07", 32000, 12000, 15000, -3000],
      ["2026-04-14", 44000, 18000, 16000, 2000],
    ],
  );
});

test("builds capacity risk comparisons and surfaces reorder gaps first", () => {
  const series = buildCapacityRiskSeries([
    {
      id: "capacity-1",
      resourceCode: "SKU-A",
      resourceName: "Flagship bundle",
      quantityOnHand: 12,
      reorderPoint: 30,
      leadTimeDays: 14,
      unitCost: 50,
    },
    {
      id: "capacity-2",
      resourceCode: "SKU-B",
      resourceName: "Accessory kit",
      quantityOnHand: 80,
      reorderPoint: 40,
      leadTimeDays: 5,
      unitCost: 20,
    },
  ]);

  assert.deepEqual(series, [
    {
      label: "SKU-A",
      resourceName: "Flagship bundle",
      quantityOnHand: 12,
      reorderPoint: 30,
      reorderGap: -18,
      leadTimeDays: 14,
    },
    {
      label: "SKU-B",
      resourceName: "Accessory kit",
      quantityOnHand: 80,
      reorderPoint: 40,
      reorderGap: 40,
      leadTimeDays: 5,
    },
  ]);
});

test("builds data health checks from freshness, workflow, source table, and report status", () => {
  const checks = buildDataHealthChecks({
    latestImports: [
      {
        id: "import-1",
        sourceName: "Seeded sales orders",
        sourceType: "csv",
        fileName: "sales_orders.csv",
        status: "succeeded",
        rowsReceived: 12,
        rowsImported: 12,
        rowsFailed: 0,
        errorSummary: null,
        createdAt: "2026-04-26T10:00:00.000Z",
      },
    ],
    latestSnapshot: {
      id: "snapshot-1",
      snapshotDate: "2026-04-26",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      period: "month",
      revenue: 32000,
      grossMargin: 12800,
      grossMarginPct: 0.4,
      operatingCosts: 18000,
      netContribution: -5200,
      averageOrderValue: 3200,
      salesVelocity: 6,
      weightedPipeline: 55000,
      pipelineCoverage: 1.3,
      stockRiskCount: 1,
      cashPressureScore: 42,
      createdAt: "2026-04-26T10:00:00.000Z",
    },
    latestWorkflowRun: {
      id: "action-log-1",
      actionType: "forecast_risk",
      target: "forecasts,risk_events",
      status: "failed",
      payload: {},
      result: {},
      createdAt: "2026-04-27T09:00:00.000Z",
    },
    sourceTableCounts: [
      { tableName: "sales_orders", rowCount: 12 },
      { tableName: "crm_pipeline", rowCount: 0 },
    ],
    latestAiReport: {
      id: "report-1",
      reportPeriodStart: "2026-04-13",
      reportPeriodEnd: "2026-04-19",
      summary: "Revenue is pacing behind target.",
      whatChanged: "Pipeline slipped.",
      needsAttention: "CRM hygiene",
      likelyCauses: "Close dates stale.",
      recommendedActions: "Update deals.",
      next7DaysPriorities: "Review high-value pipeline.",
      slackText: "Report",
      model: "gpt-4o-mini",
      inputPayload: {},
      createdAt: "2026-04-18T10:00:00.000Z",
    },
    now: new Date("2026-04-27T12:00:00.000Z"),
  });

  assert.deepEqual(
    checks.map((check) => [check.label, check.state]),
    [
      ["Successful import freshness", "ok"],
      ["Metric snapshot freshness", "ok"],
      ["Latest workflow run", "danger"],
      ["Required source table coverage", "danger"],
      ["AI report freshness", "warning"],
    ],
  );
});

test("identifies missing seeded demo risk types", () => {
  assert.deepEqual(
    getMissingDemoRiskTypes([
      { riskType: "revenue_pacing" },
      { riskType: "stockout_risk" },
      { riskType: "deal_slippage" },
    ]),
    ["margin_drop", "expense_pressure"],
  );
});
