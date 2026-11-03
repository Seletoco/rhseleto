ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS foto_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "fotos_insert_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "fotos_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'fotos');
