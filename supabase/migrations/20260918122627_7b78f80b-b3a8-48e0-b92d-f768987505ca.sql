-- Register the Gemini 2.5 Flash TTS voice engine (served by the pooled Gemini keys)
INSERT INTO public.ai_providers (id, category, label, tier, zero_cost, requires_key, enabled, sort_order)
VALUES ('gemini-tts', 'tts', 'Google Gemini 2.5 Flash TTS (Free Tier)', 'free', true, false, true, 0)
ON CONFLICT (id) DO UPDATE
  SET category = EXCLUDED.category,
      label = EXCLUDED.label,
      tier = EXCLUDED.tier,
      zero_cost = EXCLUDED.zero_cost,
      requires_key = EXCLUDED.requires_key,
      enabled = true,
      sort_order = EXCLUDED.sort_order;

-- Register the Gemini 2.5 Flash Image engine referenced by the image router
INSERT INTO public.ai_providers (id, category, label, tier, zero_cost, requires_key, enabled, sort_order)
VALUES ('gemini-image', 'image', 'Google Gemini 2.5 Flash Image (Free Tier)', 'free', true, false, true, 0)
ON CONFLICT (id) DO UPDATE
  SET category = EXCLUDED.category,
      label = EXCLUDED.label,
      tier = EXCLUDED.tier,
      zero_cost = EXCLUDED.zero_cost,
      requires_key = EXCLUDED.requires_key,
      enabled = true,
      sort_order = EXCLUDED.sort_order;

-- Make the Gemini voice engine the default narration engine
UPDATE public.ai_settings
SET value = jsonb_set(value::jsonb, '{tts}', '"gemini-tts"'::jsonb),
    updated_at = now()
WHERE key = 'defaults';
