-- Quiz v3 do VENDEDOR: armazena respostas + perfil de cada alternativa + mix de perfis.
-- Campo exclusivo do fluxo de vendedor; gerente/caixa não utilizam.
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS quiz_vendedor_v3 JSONB;
