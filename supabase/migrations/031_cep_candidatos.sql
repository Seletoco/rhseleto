-- Adiciona coluna CEP à tabela candidatos
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cep TEXT;
