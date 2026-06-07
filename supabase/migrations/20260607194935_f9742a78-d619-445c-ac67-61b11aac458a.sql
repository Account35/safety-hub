CREATE POLICY "Report files: anyone can upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id IN ('report-voice','report-photos'));

CREATE POLICY "Report files: owners can read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('report-voice','report-photos')
    AND owner = auth.uid()
  );