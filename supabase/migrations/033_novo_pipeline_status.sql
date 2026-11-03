-- ================================================================
-- 033_novo_pipeline_status.sql
-- Simplifica os 11 status em 6:
--   EM_ANDAMENTO, PROVA_FEITA, ENTREVISTA_AGENDADA,
--   APROVADO, BANCO_TALENTOS, REPROVADO
-- ================================================================

BEGIN;

-- 1. Remove a constraint antiga
ALTER TABLE candidatos DROP CONSTRAINT IF EXISTS candidatos_status_check;

-- 2. Migra os dados -----------------------------------------------

-- APROVADO_E2: vendedor/gerente → PROVA_FEITA
UPDATE candidatos SET status = 'PROVA_FEITA'
WHERE status = 'APROVADO_E2' AND cargo IN ('vendedor', 'gerente');

-- APROVADO_E2: caixa → BANCO_TALENTOS
UPDATE candidatos SET status = 'BANCO_TALENTOS'
WHERE status = 'APROVADO_E2' AND cargo = 'caixa';

-- EM_PROVA: vendedor/gerente com score → PROVA_FEITA
UPDATE candidatos SET status = 'PROVA_FEITA'
WHERE status = 'EM_PROVA' AND cargo IN ('vendedor', 'gerente') AND COALESCE(score_final, 0) > 0;

-- EM_PROVA: vendedor/gerente sem score → EM_ANDAMENTO
UPDATE candidatos SET status = 'EM_ANDAMENTO'
WHERE status = 'EM_PROVA' AND cargo IN ('vendedor', 'gerente') AND COALESCE(score_final, 0) = 0;

-- EM_PROVA: caixa com logística aprovada → BANCO_TALENTOS
UPDATE candidatos SET status = 'BANCO_TALENTOS'
WHERE status = 'EM_PROVA' AND cargo = 'caixa' AND ia_logistica_aprovado = true;

-- EM_PROVA: caixa sem logística aprovada → REPROVADO
UPDATE candidatos SET status = 'REPROVADO'
WHERE status = 'EM_PROVA' AND cargo = 'caixa'
  AND (ia_logistica_aprovado IS NULL OR ia_logistica_aprovado = false);

-- APROVADO_E1: com score → PROVA_FEITA (anomalia Ivan)
UPDATE candidatos SET status = 'PROVA_FEITA'
WHERE status = 'APROVADO_E1' AND COALESCE(score_final, 0) > 0;

-- APROVADO_E1: sem score → EM_ANDAMENTO
UPDATE candidatos SET status = 'EM_ANDAMENTO'
WHERE status = 'APROVADO_E1' AND COALESCE(score_final, 0) = 0;

-- TRIAGEM → EM_ANDAMENTO
UPDATE candidatos SET status = 'EM_ANDAMENTO'
WHERE status = 'TRIAGEM';

-- ENTREVISTA_CONFIRMADA → ENTREVISTA_AGENDADA
UPDATE candidatos SET status = 'ENTREVISTA_AGENDADA'
WHERE status = 'ENTREVISTA_CONFIRMADA';

-- ENTREVISTA_CANCELADA → REPROVADO
UPDATE candidatos SET status = 'REPROVADO'
WHERE status = 'ENTREVISTA_CANCELADA';

-- CONTRATADO → APROVADO
UPDATE candidatos SET status = 'APROVADO'
WHERE status = 'CONTRATADO';

-- REPESCAGEM → BANCO_TALENTOS
UPDATE candidatos SET status = 'BANCO_TALENTOS'
WHERE status = 'REPESCAGEM';

-- REPROVADO e BANCO_TALENTOS: mantêm (sem UPDATE necessário)

-- 3. Nova constraint com os 6 valores
ALTER TABLE candidatos ADD CONSTRAINT candidatos_status_check
  CHECK (status IN (
    'EM_ANDAMENTO',
    'PROVA_FEITA',
    'ENTREVISTA_AGENDADA',
    'APROVADO',
    'BANCO_TALENTOS',
    'REPROVADO'
  ));

COMMIT;
