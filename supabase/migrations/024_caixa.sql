ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS operou_caixa TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS facilidade_calculos TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS experiencia_troco TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS descricao_experiencia_caixa TEXT;

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracoes (chave, valor)
VALUES ('vaga_caixa_ativa', 'false')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_config" ON configuracoes FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_config" ON configuracoes FOR ALL TO authenticated USING (true);
