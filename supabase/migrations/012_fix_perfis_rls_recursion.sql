-- Remove políticas recursivas criadas em 010 que causam "infinite recursion detected in policy"
-- master_select_all fazia subquery em perfis_usuario dentro de policy de perfis_usuario
DROP POLICY IF EXISTS "select_proprio"    ON perfis_usuario;
DROP POLICY IF EXISTS "master_select_all" ON perfis_usuario;
DROP POLICY IF EXISTS "master_update_all" ON perfis_usuario;

-- Garante que as políticas simples de 011 estão presentes
DROP POLICY IF EXISTS "leitura_autenticado" ON perfis_usuario;
DROP POLICY IF EXISTS "update_autenticado"  ON perfis_usuario;

CREATE POLICY "leitura_autenticado" ON perfis_usuario
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "update_autenticado" ON perfis_usuario
  FOR UPDATE USING (auth.role() = 'authenticated');
