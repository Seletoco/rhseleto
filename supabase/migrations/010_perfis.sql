-- Tabela de perfis de usuário (master x gestor de loja)
CREATE TABLE IF NOT EXISTS perfis_usuario (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('master', 'gestor')),
  unidade     TEXT,   -- NULL para master, nome da unidade para gestor
  nome        TEXT,
  email       TEXT,
  senha_visivel TEXT  -- apenas para exibição interna no painel master
);

-- RLS
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;

-- Authenticated pode ler o próprio perfil
CREATE POLICY "select_proprio" ON perfis_usuario
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Master pode ler todos
CREATE POLICY "master_select_all" ON perfis_usuario
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario p
      WHERE p.id = auth.uid() AND p.role = 'master'
    )
  );

-- Master pode atualizar qualquer perfil
CREATE POLICY "master_update_all" ON perfis_usuario
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario p
      WHERE p.id = auth.uid() AND p.role = 'master'
    )
  );

-- Inserir perfis
INSERT INTO perfis_usuario (id, role, unidade, nome, email, senha_visivel) VALUES
  ('26f68bf6-9f9b-489a-8a7b-dc8e9fff7aa7', 'master',  NULL,          'Master',        'admin@seleto.com.br',     NULL),
  ('a297251f-fd9e-4aeb-ac52-93e07e5e822c', 'gestor',  'Taquara',     'Gestor Taquara', 'admin@seleto-tqr.com',   NULL),
  ('b53ee9ba-6402-48d4-9e9e-d9745a6527b3', 'gestor',  'Aerotown',    'Gestor Aerotown','admin@seleto-aero.com',  NULL),
  ('e07d3dde-0898-4b95-bed9-5e6bbf24290b', 'gestor',  'Americas',    'Gestor Americas','admin@seleto-ame.com',   NULL),
  ('27f06c6a-cbeb-4113-8283-027d530dbdc3', 'gestor',  'Nova Iguaçu', 'Gestor NIG',    'admin@seleto-nig.com',   NULL)
ON CONFLICT (id) DO NOTHING;
