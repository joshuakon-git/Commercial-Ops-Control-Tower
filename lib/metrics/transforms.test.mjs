import assert from "node:assert/strict";
import { test } from "node:test";

import { buildKpiTiles, normalizeMetricSnapshot } from "./transforms.ts";

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
      ["Revenue MTD", "$31,120", "good"],
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
      ["Revenue MTD", "$0", "neutral"],
      ["Gross margin", "0.0%", "neutral"],
      ["Pipeline coverage", "0.0x", "neutral"],
      ["Last import", "No imports", "warning"],
    ],
  );
});
