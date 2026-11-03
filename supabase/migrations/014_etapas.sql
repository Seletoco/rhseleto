-- Remover constraint de status antiga
ALTER TABLE candidatos DROP CONSTRAINT IF EXISTS candidatos_status_check;

-- Adicionar novos campos
ALTER TABLE candidatos
  ADD COLUMN IF NOT EXISTS etapa_atual INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS link_etapa2 TEXT,
  ADD COLUMN IF NOT EXISTS link_etapa2_usado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_etapa2_criado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ia_logistica_aprovado BOOLEAN,
  ADD COLUMN IF NOT EXISTS ia_logistica_observacao TEXT,
  ADD COLUMN IF NOT EXISTS ia_logistica_analisado_em TIMESTAMPTZ;

-- Migrar candidatos existentes para etapa 2 ANTES de adicionar a nova constraint
UPDATE candidatos SET
  etapa_atual = 2,
  status = 'APROVADO_E2'
WHERE etapa_atual IS NULL OR etapa_atual = 1;

-- Adicionar nova constraint com todos os status do pipeline
ALTER TABLE candidatos ADD CONSTRAINT candidatos_status_check
CHECK (status IN (
  'TRIAGEM',
  'APROVADO_E1',
  'REPROVADO_LOGISTICA',
  'EM_PROVA',
  'APROVADO_E2',
  'BANCO_TALENTOS',
  'REPROVADO_PERFIL',
  'ENTREVISTA_AGENDADA',
  'ENTREVISTA_CONFIRMADA',
  'ENTREVISTA_CANCELADA',
  'CONTRATADO',
  'REPROVADO',
  'REPESCAGEM'
));
