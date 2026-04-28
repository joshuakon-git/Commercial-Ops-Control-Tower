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
