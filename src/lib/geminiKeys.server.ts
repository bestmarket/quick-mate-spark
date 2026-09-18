/**
 * Pool of Google Gemini API keys with round-robin rotation.
 * Every Gemini call (writing and pictures) takes the least recently used
 * active key, so free-tier limits are spread across all saved keys.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type GeminiKeyRow = {
  id: string;
  label: string;
  api_key: string;
  active: boolean;
  failures: number;
  last_used_at: string | null;
  created_at: string;
};

const CACHE_MS = 10_000;
let cache: { at: number; rows: GeminiKeyRow[] } | null = null;
let cursor = 0;

export function clearGeminiKeyCache() {
  cache = null;
}

async function activeKeys(): Promise<GeminiKeyRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const { data } = await supabaseAdmin
    .from("gemini_keys")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  const rows = ((data ?? []) as unknown as GeminiKeyRow[]).filter((r) => r.api_key.trim());
  cache = { at: Date.now(), rows };
  return rows;
}

/** All usable keys in rotation order, starting at the next one up. */
export async function geminiKeyRotation(fallback?: string | null): Promise<string[]> {
  const rows = await activeKeys();
  if (rows.length === 0) return fallback?.trim() ? [fallback.trim()] : [];
  const start = cursor % rows.length;
  cursor = (cursor + 1) % rows.length;
  const ordered = [...rows.slice(start), ...rows.slice(0, start)];
  void markUsed(ordered[0]!.id);
  return ordered.map((r) => r.api_key);
}

async function markUsed(id: string) {
  try {
    await supabaseAdmin
      .from("gemini_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* rotation must never break a generation */
  }
}

/** Counts a failed call against the key so admins can spot exhausted ones. */
export async function markGeminiKeyFailure(apiKey: string) {
  try {
    const rows = await activeKeys();
    const row = rows.find((r) => r.api_key === apiKey);
    if (!row) return;
    await supabaseAdmin
      .from("gemini_keys")
      .update({ failures: row.failures + 1 })
      .eq("id", row.id);
    clearGeminiKeyCache();
  } catch {
    /* ignore */
  }
}

/**
 * Runs `call` with each key in turn until one succeeds.
 * Keeps generations alive when a key hits its free-tier limit.
 */
export async function withGeminiKey<T>(
  fallbackKey: string | null | undefined,
  call: (key: string) => Promise<T>,
  /** Used when the pool is empty, so the app keeps working before keys are added. */
  onNoKeys?: () => Promise<T>,
): Promise<T> {
  const keys = await geminiKeyRotation(fallbackKey);
  if (keys.length === 0) {
    if (onNoKeys) return onNoKeys();
    throw new Error("No Google Gemini API key has been added yet.");
  }
  let lastError: unknown;
  for (const key of keys) {
    try {
      return await call(key);
    } catch (error) {
      lastError = error;
      void markGeminiKeyFailure(key);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Gemini keys failed.");
}
