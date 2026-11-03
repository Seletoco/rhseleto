-- Atualizar candidatos existentes com status antigo para o novo padrão
UPDATE candidatos SET status = 'NOVO' WHERE status IS NULL OR status = 'NOVO';
UPDATE candidatos SET status = 'TRIADO_IA' WHERE status = 'TRIADO_IA';

-- Adicionar constraint de status válidos (sem quebrar dados existentes)
ALTER TABLE candidatos DROP CONSTRAINT IF EXISTS candidatos_status_check;
ALTER TABLE candidatos ADD CONSTRAINT candidatos_status_check
CHECK (status IN (
  'NOVO',
  'TRIADO_IA',
  'ENTREVISTA_AGENDADA',
  'ENTREVISTA_CONFIRMADA',
  'ENTREVISTA_CANCELADA',
  'APROVADO',
  'REPROVADO',
  'REPESCAGEM',
  'CONTRATADO',
  'BANCO_TALENTOS'
));
