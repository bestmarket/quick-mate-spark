/**
 * Voice picking + preview for the production layout.
 * The admin decides which voice engines are available; anyone producing a
 * video can listen to a short sample before committing to a voice.
 */
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { FREE_VOICE_ENGINE_IDS } from "./voices";

const SAMPLE = "This is how your video will sound. Clear, natural and ready to publish.";

/** Engine ids the admin has made available for picking a voice. */
export const getVoiceEngines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await supabaseAdmin
      .from("ai_settings")
      .select("value")
      .eq("key", "voice_engines")
      .maybeSingle();
    const ids = (res.data?.value as { ids?: string[] } | null)?.ids;
    return { engineIds: ids?.length ? ids : FREE_VOICE_ENGINE_IDS };
  });

/** Speaks a short sample in one voice so it can be auditioned in the browser. */
export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        voiceId: z.string().min(1).max(40),
        text: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateNarration } = await import("./ai.server");
    const bytes = await generateNarration((data.text ?? SAMPLE).trim() || SAMPLE, data.voiceId);
    return {
      voiceId: data.voiceId,
      mime: "audio/wav",
      audio: Buffer.from(bytes).toString("base64"),
    };
  });
