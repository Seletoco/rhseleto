-- Allow anonymous users to upload files to the curriculos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculos', 'curriculos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "curriculos_insert_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'curriculos');

CREATE POLICY "curriculos_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'curriculos');
