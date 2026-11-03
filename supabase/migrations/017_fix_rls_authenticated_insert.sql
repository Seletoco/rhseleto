-- Permite que usuários autenticados (admins logados) também insiram candidatos
-- Necessário pois o formulário de candidatura usa o cliente Supabase que, quando
-- há sessão ativa, envia o JWT autenticado em vez do papel anon
GRANT INSERT ON candidatos TO authenticated;
CREATE POLICY "authenticated_insert" ON candidatos FOR INSERT TO authenticated WITH CHECK (true);
