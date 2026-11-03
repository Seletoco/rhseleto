ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS logistica_por_unidade JSONB;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS maior_percentual_meta TEXT;
