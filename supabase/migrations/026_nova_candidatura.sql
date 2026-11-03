-- Histórico de candidaturas anteriores
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS
  historico_anterior JSONB;

-- Data da última reprovação (para controle)
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS
  reprovado_em TIMESTAMPTZ;

-- Atualizar reprovado_em para candidatos já reprovados
UPDATE candidatos
SET reprovado_em = NOW()
WHERE status = 'REPROVADO' AND reprovado_em IS NULL;
