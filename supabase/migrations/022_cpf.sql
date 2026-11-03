ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cpf TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS candidatos_cpf_unique ON candidatos(cpf) WHERE cpf IS NOT NULL;
