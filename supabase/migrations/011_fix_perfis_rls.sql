ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_acesso_total" ON perfis_usuario;
CREATE POLICY "leitura_autenticado" ON perfis_usuario FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_autenticado" ON perfis_usuario FOR UPDATE USING (auth.role() = 'authenticated');
