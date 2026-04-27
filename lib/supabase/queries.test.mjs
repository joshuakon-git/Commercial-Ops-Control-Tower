import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getLatestAiReport,
  getLatestImports,
  getLatestMetricSnapshot,
  getOpenRiskEvents,
  getRecommendedActions,
} from "./queries.ts";

function createQueryStub(responses) {
  const calls = [];

  const makeBuilder = (table) => ({
    select(columns) {
      calls.push(["select", table, columns]);
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
    ["select", "metric_snapshots", "*"],
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
