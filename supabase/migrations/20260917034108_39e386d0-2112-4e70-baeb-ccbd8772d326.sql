UPDATE public.ai_providers SET enabled = true, updated_at = now() WHERE id IN ('edge-tts','kokoro');
INSERT INTO public.ai_settings (key, value, updated_at)
VALUES ('voice_engines', '{"ids":["edge-tts","kokoro"]}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();