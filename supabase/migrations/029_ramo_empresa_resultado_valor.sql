ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS ramo_empresa_atual TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS ramo_ultima_empresa TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS maior_resultado_valor TEXT;
