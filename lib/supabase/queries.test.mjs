import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getActionQueue,
  getLatestAiReport,
  getLatestRevenueForecasts,
  getLatestImports,
  getLatestMetricSnapshot,
  getLatestWorkflowRun,
  getOpenRiskEvents,
  getOperatingRiskEvents,
  getRecentMetricSnapshots,
  getRecommendedActions,
  getRequiredSourceTableCounts,
  getSampleData,
} from "./queries.ts";

function createQueryStub(responses) {
  const calls = [];

  const makeBuilder = (table) => ({
    select(columns, options) {
      calls.push(["select", table, columns, options]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", table, column, value]);
      return this;
    },
    in(column, value) {
      calls.push(["in", table, column, value]);
      return this;
    },
    order(column, options) {
      calls.push(["order", table, column, options]);
      return this;
    },
    limit(count) {
      calls.push(["limit", table, count]);
      return this;
    },
    maybeSingle() {
      calls.push(["maybeSingle", table]);
      return Promise.resolve(responses[table] ?? { data: null, error: null });
    },
    then(resolve, reject) {
      calls.push(["execute", table]);
      return Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve, reject);
    },
  });

  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      return makeBuilder(table);
    },
  };
}

test("getLatestMetricSnapshot reads the newest metric snapshot", async () => {
  const client = createQueryStub({
    metric_snapshots: { data: null, error: null },
  });

  await getLatestMetricSnapshot(client);

  assert.deepEqual(client.calls, [
    ["from", "metric_snapshots"],
    ["select", "metric_snapshots", "*", undefined],
    ["order", "metric_snapshots", "snapshot_date", { ascending: false }],
    ["order", "metric_snapshots", "created_at", { ascending: false }],
    ["limit", "metric_snapshots", 1],
    ["maybeSingle", "metric_snapshots"],
  ]);
});

test("list queries filter active operating records and cap result counts", async () => {
  const client = createQueryStub({
    risk_events: { data: [], error: null },
    recommended_actions: { data: [], error: null },
    raw_uploads: { data: [], error: null },
  });

  await getOpenRiskEvents(client);
  await getRecommendedActions(client);
  await getLatestImports(client);

  assert(client.calls.some((call) => call.join("|") === "eq|risk_events|status|open"));
  assert(client.calls.some((call) => call[0] === "in" && call[1] === "recommended_actions" && call[2] === "status"));
  assert(client.calls.some((call) => call.join("|") === "limit|risk_events|5"));
  assert(client.calls.some((call) => call.join("|") === "limit|recommended_actions|5"));
  assert(client.calls.some((call) => call.join("|") === "limit|raw_uploads|5"));
});

test("single-row queries return null for missing records", async () => {
  const client = createQueryStub({
    ai_reports: { data: null, error: null },
  });

  assert.equal(await getLatestAiReport(client), null);
});

test("forecast and recent snapshot queries provide chart inputs", async () => {
  const client = createQueryStub({
    forecasts: {
      data: [
        {
          id: "forecast-newer",
          forecast_date: "2026-05-05",
          forecast_type: "revenue",
          period_start: "2026-04-01",
          period_end: "2026-04-30",
          predicted_value: "46000",
          lower_bound: "40000",
          upper_bound: "52000",
          method: "four_week_average",
          inputs_summary: {},
          created_at: "2026-04-28T10:00:00.000Z",
        },
        {
          id: "forecast-older",
          forecast_date: "2026-04-28",
          forecast_type: "revenue",
          period_start: "2026-04-01",
          period_end: "2026-04-30",
          predicted_value: "11500",
          lower_bound: "10000",
          upper_bound: "13000",
          method: "four_week_average",
          inputs_summary: {},
          created_at: "2026-04-28T10:00:00.000Z",
        },
      ],
      error: null,
    },
    metric_snapshots: { data: [], error: null },
  });

  const forecasts = await getLatestRevenueForecasts(client);
  await getRecentMetricSnapshots(client);

  assert(client.calls.some((call) => call.join("|") === "eq|forecasts|forecast_type|revenue"));
  assert(client.calls.some((call) => call.join("|") === "limit|forecasts|8"));
  assert(client.calls.some((call) => call.join("|") === "order|forecasts|created_at|[object Object]"));
  assert.deepEqual(
    forecasts.map((forecast) => forecast.forecastDate),
    ["2026-04-28", "2026-05-05"],
  );
  assert(client.calls.some((call) => call.join("|") === "limit|metric_snapshots|8"));
});

test("operating risks include open and acknowledged risks", async () => {
  const client = createQueryStub({
    risk_events: { data: [], error: null },
  });

  await getOperatingRiskEvents(client);

  assert(
    client.calls.some(
      (call) =>
        call[0] === "in" &&
        call[1] === "risk_events" &&
        call[2] === "status" &&
        call[3].join(",") === "open,acknowledged",
    ),
  );
});

test("action queue includes the action lifecycle and latest workflow run reads action log", async () => {
  const client = createQueryStub({
    recommended_actions: { data: [], error: null },
    action_log: { data: null, error: null },
  });

  await getActionQueue(client);
  await getLatestWorkflowRun(client);

  assert(
    client.calls.some(
      (call) =>
        call[0] === "in" &&
        call[1] === "recommended_actions" &&
        call[2] === "status" &&
        call[3].join(",") === "open,in_progress,done,dismissed",
    ),
  );
  assert(client.calls.some((call) => call.join("|") === "limit|recommended_actions|25"));
  assert(client.calls.some((call) => call.join("|") === "maybeSingle|action_log"));
});

test("required source table counts use exact head counts", async () => {
  const client = createQueryStub({
    sales_orders: { data: null, count: 12, error: null },
    crm_pipeline: { data: null, count: 4, error: null },
    expenses: { data: null, count: 10, error: null },
    capacity_positions: { data: null, count: 4, error: null },
    targets: { data: null, count: 3, error: null },
  });

  const counts = await getRequiredSourceTableCounts(client);

  assert.deepEqual(counts, [
    { tableName: "sales_orders", rowCount: 12 },
    { tableName: "crm_pipeline", rowCount: 4 },
    { tableName: "expenses", rowCount: 10 },
    { tableName: "capacity_positions", rowCount: 4 },
    { tableName: "targets", rowCount: 3 },
  ]);
  assert(
    client.calls.some(
      (call) =>
        call[0] === "select" &&
        call[1] === "sales_orders" &&
        call[2] === "id" &&
        call[3].count === "exact" &&
        call[3].head === true,
    ),
  );
});

test("sample data helper reads seeded source tables with compact limits", async () => {
  const client = createQueryStub({
    sales_orders: {
      data: [
        {
          id: "order-1",
          order_date: "2026-04-01",
          customer: "Apex Cafe",
          product: "Starter Pack",
          sku: "SKU-001",
          units: 18,
          revenue: "2880.00",
          discount: "0.00",
          channel: "direct",
          unit_cost: "72.00",
          gross_margin: "1584.00",
        },
      ],
      error: null,
    },
    crm_pipeline: { data: [], error: null },
    expenses: { data: [], error: null },
    capacity_positions: { data: [], error: null },
    targets: { data: [], error: null },
  });

  const sampleData = await getSampleData(client);

  assert.deepEqual(sampleData.salesOrders[0], {
    id: "order-1",
    orderDate: "2026-04-01",
    customer: "Apex Cafe",
    product: "Starter Pack",
    sku: "SKU-001",
    units: 18,
    revenue: 2880,
    discount: 0,
    channel: "direct",
    unitCost: 72,
    grossMargin: 1584,
  });
  assert(client.calls.some((call) => call.join("|") === "order|sales_orders|order_date|[object Object]"));
  assert(client.calls.some((call) => call.join("|") === "order|crm_pipeline|expected_close_date|[object Object]"));
  assert(client.calls.some((call) => call.join("|") === "order|expenses|expense_date|[object Object]"));
  assert(client.calls.some((call) => call.join("|") === "order|capacity_positions|resource_code|[object Object]"));
  assert(client.calls.some((call) => call.join("|") === "order|targets|period_start|[object Object]"));
  assert.equal(client.calls.filter((call) => call[0] === "limit" && call[2] === 12).length, 5);
});
