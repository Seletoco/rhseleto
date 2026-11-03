-- Remover todas as políticas existentes da tabela candidatos
DROP POLICY IF EXISTS "insert_publico" ON candidatos;
DROP POLICY IF EXISTS "leitura_admin" ON candidatos;
DROP POLICY IF EXISTS "update_admin" ON candidatos;

-- Recriar políticas corretas
CREATE POLICY "insert_publico" ON candidatos FOR INSERT WITH CHECK (true);
CREATE POLICY "leitura_admin" ON candidatos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_admin" ON candidatos FOR UPDATE USING (auth.role() = 'authenticated');
