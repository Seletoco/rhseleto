ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS turno_faculdade TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS situacao_loja_baguncada TEXT;

UPDATE candidatos SET
  motivo_reprovacao = CASE
    WHEN status = 'REPROVADO_LOGISTICA' THEN 'Distância inviável para todas as unidades'
    WHEN status = 'REPROVADO_PERFIL' THEN 'Perfil incompatível com o cargo'
    ELSE motivo_reprovacao
  END,
  status = CASE
    WHEN status IN ('REPROVADO_LOGISTICA', 'REPROVADO_PERFIL') THEN 'REPROVADO'
    ELSE status
  END
WHERE status IN ('REPROVADO_LOGISTICA', 'REPROVADO_PERFIL');

ALTER TABLE candidatos DROP CONSTRAINT IF EXISTS candidatos_status_check;
ALTER TABLE candidatos ADD CONSTRAINT candidatos_status_check
  CHECK (status IN (
    'TRIAGEM',
    'APROVADO_E1',
    'EM_PROVA',
    'APROVADO_E2',
    'BANCO_TALENTOS',
    'ENTREVISTA_AGENDADA',
    'ENTREVISTA_CONFIRMADA',
    'ENTREVISTA_CANCELADA',
    'CONTRATADO',
    'REPROVADO',
    'REPESCAGEM'
  ));
