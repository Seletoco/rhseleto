-- 034_cpf_por_cargo.sql
-- O índice da migration 022 tornava o CPF único na tabela inteira. O código já verifica CPF + cargo
-- (/api/verificar-cpf?cpf=...&cargo=...), mas o banco recusava o segundo cadastro do mesmo CPF em OUTRO cargo:
-- quem já tinha candidatura de gerente não conseguia se candidatar a vendedor ou caixa.
-- Agora a regra do banco é a mesma do código: o mesmo CPF pode ter uma candidatura por cargo.
-- Mais permissiva que a anterior: nenhuma linha existente viola o índice novo.
DROP INDEX IF EXISTS candidatos_cpf_unique;
CREATE UNIQUE INDEX IF NOT EXISTS candidatos_cpf_cargo_unique ON candidatos (cpf, cargo) WHERE cpf IS NOT NULL;
