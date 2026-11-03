CREATE POLICY "update_admin" ON candidatos
FOR UPDATE USING (auth.role() = 'authenticated');
