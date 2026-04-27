import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client.ts";
import {
  normalizeAiReport,
  normalizeImportHealth,
  normalizeMetricSnapshot,
  normalizeRecommendedAction,
  normalizeRiskEvent,
} from "../metrics/transforms.ts";
import type {
  AiReport,
  ImportHealth,
  MetricSnapshot,
  RecommendedAction,
  RiskEvent,
} from "../metrics/types.ts";

type QueryClient = Pick<SupabaseClient, "from">;

function unwrapData<T>(result: { data: T; error: { message: string } | null }, label: string) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.data;
}

function unwrapRows<T>(result: { data: T[] | null; error: { message: string } | null }, label: string) {
  return unwrapData(result, label) ?? [];
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

  return unwrapRows(result, "Unable to load open risk events").map(normalizeRiskEvent);
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

  return unwrapRows(result, "Unable to load recommended actions").map(normalizeRecommendedAction);
}

export async function getLatestImports(
  client: QueryClient = getSupabaseClient(),
): Promise<ImportHealth[]> {
  const result = await client
    .from("raw_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return unwrapRows(result, "Unable to load latest imports").map(normalizeImportHealth);
}
