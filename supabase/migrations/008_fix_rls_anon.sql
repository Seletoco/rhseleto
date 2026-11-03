-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "insert_publico" ON candidatos;
DROP POLICY IF EXISTS "leitura_admin" ON candidatos;
DROP POLICY IF EXISTS "update_admin" ON candidatos;

-- Garantir permissões explícitas para a role anon
GRANT INSERT ON candidatos TO anon;
GRANT SELECT ON candidatos TO authenticated;
GRANT UPDATE ON candidatos TO authenticated;

-- Recriar políticas explícitas por role
CREATE POLICY "anon_insert" ON candidatos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authenticated_select" ON candidatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update" ON candidatos FOR UPDATE TO authenticated USING (true);
