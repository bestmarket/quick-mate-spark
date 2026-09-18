/**
 * Admin panel server actions: AI provider registry, engine defaults,
 * Zero-Cost Mode and usage telemetry. Every action is admin-gated.
 */
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { FREE_VOICE_ENGINE_IDS } from "./voices";

export type AdminProvider = {
  id: string;
  category: "llm" | "tts" | "image";
  label: string;
  tier: "free" | "premium";
  zero_cost: boolean;
  requires_key: boolean;
  enabled: boolean;
  has_key: boolean;
  sort_order: number;
};

export type AdminTelemetry = {
  totalCalls: number;
  failedCalls: number;
  totalCostUsd: number;
  last30dCalls: number;
  byCategory: { category: string; calls: number; costUsd: number }[];
  byProvider: { provider: string; calls: number; costUsd: number }[];
};

export type AdminData = {
  providers: AdminProvider[];
  defaults: { llm: string; tts: string; image: string };
  voiceEngineIds: string[];
  zeroCostMode: boolean;
  telemetry: AdminTelemetry;
};

type RpcClient = {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => unknown;
};

async function isAdminUser(supabase: unknown, userId: string) {
  const { data } = (await (supabase as RpcClient).rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  })) as { data: boolean | null };
  return data === true;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const ok = await isAdminUser(context.supabase, context.userId);
  if (!ok) throw new Error("Admins only.");
}


async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Tells the UI whether the signed-in person is an admin, and whether the first admin seat is still free. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);

    const admin = await db();
    const { count } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    return { isAdmin, canClaim: !isAdmin && (count ?? 0) === 0 };
  });

/** Grants the admin role to the signed-in account, but only while no admin exists yet. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const { count } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) throw new Error("An admin already exists for this app.");

    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);

    return { isAdmin: true };
  });

/** Everything the admin dashboard renders: providers, defaults, Zero-Cost Mode and telemetry. */
export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminData> => {
    await assertAdmin(context);
    const admin = await db();

    const [providersRes, settingsRes, eventsRes] = await Promise.all([
      admin.from("ai_providers").select("*").order("sort_order"),
      admin.from("ai_settings").select("*"),
      admin
        .from("usage_events")
        .select("category, provider, cost_usd, success, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    const providers: AdminProvider[] = (providersRes.data ?? []).map((row) => {
      const p = row as Record<string, unknown>;
      return {
        id: String(p["id"]),
        category: p["category"] as AdminProvider["category"],
        label: String(p["label"]),
        tier: p["tier"] as AdminProvider["tier"],
        zero_cost: Boolean(p["zero_cost"]),
        requires_key: Boolean(p["requires_key"]),
        enabled: Boolean(p["enabled"]),
        has_key: Boolean(p["api_key"]),
        sort_order: Number(p["sort_order"] ?? 0),
      };
    });

    const settings = new Map(
      (settingsRes.data ?? []).map((row) => {
        const s = row as Record<string, unknown>;
        return [String(s["key"]), s["value"]];
      }),
    );
    const rawDefaults = (settings.get("defaults") ?? {}) as Record<string, string>;
    const defaults = {
      llm: rawDefaults["llm"] ?? "gemini-flash",
      tts: rawDefaults["tts"] ?? "gemini-tts",
      image: rawDefaults["image"] ?? "gemini-image",
    };
    const zeroCostMode = Boolean(
      (settings.get("zero_cost_mode") as { enabled?: boolean } | undefined)?.enabled,
    );
    const rawVoiceEngines = (settings.get("voice_engines") as { ids?: string[] } | undefined)?.ids;
    const voiceEngineIds = rawVoiceEngines?.length ? rawVoiceEngines : FREE_VOICE_ENGINE_IDS;

    const events = (eventsRes.data ?? []) as {
      category: string;
      provider: string;
      cost_usd: number | string;
      success: boolean;
      created_at: string;
    }[];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byCategory = new Map<string, { calls: number; costUsd: number }>();
    const byProvider = new Map<string, { calls: number; costUsd: number }>();
    let totalCostUsd = 0;
    let failedCalls = 0;
    let last30dCalls = 0;

    for (const event of events) {
      const cost = Number(event.cost_usd ?? 0);
      totalCostUsd += cost;
      if (!event.success) failedCalls += 1;
      if (new Date(event.created_at).getTime() >= cutoff) last30dCalls += 1;

      const cat = byCategory.get(event.category) ?? { calls: 0, costUsd: 0 };
      byCategory.set(event.category, { calls: cat.calls + 1, costUsd: cat.costUsd + cost });
      const prov = byProvider.get(event.provider) ?? { calls: 0, costUsd: 0 };
      byProvider.set(event.provider, { calls: prov.calls + 1, costUsd: prov.costUsd + cost });
    }

    return {
      providers,
      defaults,
      voiceEngineIds,
      zeroCostMode,
      telemetry: {
        totalCalls: events.length,
        failedCalls,
        totalCostUsd,
        last30dCalls,
        byCategory: [...byCategory].map(([category, v]) => ({ category, ...v })),
        byProvider: [...byProvider]
          .map(([provider, v]) => ({ provider, ...v }))
          .sort((a, b) => b.calls - a.calls),
      },
    };
  });

const SaveProvider = z.object({
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  clearKey: z.boolean().optional(),
});

/** Saves one provider's on/off switch and its API key. */
export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveProvider.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();

    const patch: { updated_at: string; enabled?: boolean; api_key?: string | null } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (data.clearKey) patch.api_key = null;
    else if (data.apiKey && data.apiKey.trim()) patch.api_key = data.apiKey.trim();

    const { error } = await admin.from("ai_providers").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    const { clearConfigCache } = await import("./aiConfig.server");
    clearConfigCache();
    return { ok: true };
  });

const SetDefaults = z.object({
  llm: z.string().min(1),
  tts: z.string().min(1),
  image: z.string().min(1),
});

/** Chooses which engine each kind of AI work uses. */
export const setEngineDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetDefaults.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const { error } = await admin
      .from("ai_settings")
      .upsert({ key: "defaults", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    const { clearConfigCache } = await import("./aiConfig.server");
    clearConfigCache();
    return { ok: true };
  });

/** Turns Zero-Cost Mode on or off (free engines only). */
export const setZeroCostMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const { error } = await admin.from("ai_settings").upsert({
      key: "zero_cost_mode",
      value: { enabled: data.enabled },
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    const { clearConfigCache } = await import("./aiConfig.server");
    clearConfigCache();
    return { ok: true };
  });

/** Sends one tiny request through the current writing engine so the admin can confirm routing works. */
export const testAiRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { resolveProvider } = await import("./aiConfig.server");
    const { askAI } = await import("./ai.server");
    const provider = await resolveProvider("llm");
    const started = Date.now();
    const reply = await askAI(
      "You are a test probe. Answer with a single short sentence.",
      "Reply with: routing works.",
    );
    return {
      provider: provider.label,
      zeroCostMode: provider.zeroCostMode,
      ms: Date.now() - started,
      reply: reply.slice(0, 200),
    };
  });

/** Chooses which free voice engines people can pick voices from (both may be on at once). */
export const setVoiceEngines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ engineIds: z.array(z.string().min(1).max(40)).max(10) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const ids = data.engineIds.filter((id) => FREE_VOICE_ENGINE_IDS.includes(id));

    const { error } = await admin
      .from("ai_settings")
      .upsert({ key: "voice_engines", value: { ids }, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    // Keep the provider registry in step so narration routing matches the choice.
    for (const id of FREE_VOICE_ENGINE_IDS) {
      await admin
        .from("ai_providers")
        .update({ enabled: ids.includes(id), updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    const { clearConfigCache } = await import("./aiConfig.server");
    clearConfigCache();
    return { ok: true, engineIds: ids };
  });

/** Speaks a sample through the current voice routing so the admin can hear it works. */
export const testVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ voiceId: z.string().min(1).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { generateNarration } = await import("./ai.server");
    const bytes = await generateNarration(
      "Voice check. Your narration engine is working.",
      data.voiceId,
    );
    return { audio: Buffer.from(bytes).toString("base64"), mime: "audio/wav" };
  });

/* ------------------------------------------------- Gemini key pool */

export type AdminGeminiKey = {
  id: string;
  label: string;
  masked: string;
  active: boolean;
  failures: number;
  last_used_at: string | null;
  created_at: string;
};

function maskKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

/** Every saved Gemini key, newest last, with the secret hidden. */
export const listGeminiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminGeminiKey[]> => {
    await assertAdmin(context);
    const admin = await db();
    const { data, error } = await admin
      .from("gemini_keys")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r["id"]),
        label: String(r["label"] ?? "Gemini key"),
        masked: maskKey(String(r["api_key"] ?? "")),
        active: Boolean(r["active"]),
        failures: Number(r["failures"] ?? 0),
        last_used_at: (r["last_used_at"] as string | null) ?? null,
        created_at: String(r["created_at"]),
      };
    });
  });

/** Adds one or more Gemini keys to the rotation (paste several, one per line). */
export const addGeminiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ label: z.string().max(60).optional(), keys: z.string().min(10) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const keys = [
      ...new Set(
        data.keys
          .split(/[\s,]+/)
          .map((k) => k.trim())
          .filter((k) => k.length >= 10),
      ),
    ];
    if (keys.length === 0) throw new Error("No usable key was found in that text.");

    const base = (data.label ?? "").trim();
    const rows = keys.map((api_key, index) => ({
      api_key,
      label: base ? (keys.length > 1 ? `${base} ${index + 1}` : base) : `Gemini key`,
      active: true,
    }));
    const { error } = await admin.from("gemini_keys").insert(rows);
    if (error) throw new Error(error.message);

    const { clearGeminiKeyCache } = await import("./geminiKeys.server");
    clearGeminiKeyCache();
    return { added: keys.length };
  });

/** Renames a key, or turns it on/off in the rotation. */
export const updateGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().min(1).max(60).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const patch: { label?: string; active?: boolean; failures?: number } = {};
    if (data.label !== undefined) patch.label = data.label.trim();
    if (data.active !== undefined) {
      patch.active = data.active;
      if (data.active) patch.failures = 0;
    }
    const { error } = await admin.from("gemini_keys").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    const { clearGeminiKeyCache } = await import("./geminiKeys.server");
    clearGeminiKeyCache();
    return { ok: true };
  });

/** Removes a key from the pool for good. */
export const deleteGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = await db();
    const { error } = await admin.from("gemini_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { clearGeminiKeyCache } = await import("./geminiKeys.server");
    clearGeminiKeyCache();
    return { ok: true };
  });

/** Calls Gemini with every saved key so the admin sees which ones still work. */
export const testGeminiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const admin = await db();
    const { data } = await admin.from("gemini_keys").select("*").order("created_at");
    const rows = (data ?? []) as Record<string, unknown>[];

    const results = await Promise.all(
      rows.map(async (row) => {
        const key = String(row["api_key"] ?? "");
        try {
          const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] }),
            },
          );
          return { id: String(row["id"]), label: String(row["label"]), ok: res.ok };
        } catch {
          return { id: String(row["id"]), label: String(row["label"]), ok: false };
        }
      }),
    );
    return { results };
  });
