DROP POLICY IF EXISTS "own media read" ON storage.objects;
CREATE POLICY "own media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own media write" ON storage.objects;
CREATE POLICY "own media write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own media update" ON storage.objects;
CREATE POLICY "own media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own media delete" ON storage.objects;
CREATE POLICY "own media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE TABLE IF NOT EXISTS public.gemini_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  api_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  failures integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.gemini_keys TO service_role;
ALTER TABLE public.gemini_keys ENABLE ROW LEVEL SECURITY;

UPDATE public.ai_providers SET enabled = true, updated_at = now() WHERE id IN ('edge-tts','kokoro');
INSERT INTO public.ai_settings (key, value, updated_at)
VALUES ('voice_engines', '{"ids":["edge-tts","kokoro"]}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();