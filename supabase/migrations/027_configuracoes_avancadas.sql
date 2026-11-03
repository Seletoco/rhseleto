INSERT INTO configuracoes (chave, valor) VALUES
  ('tarifa_rio_de_janeiro', '5.00'),
  ('tarifa_nova_iguacu',    '6.70'),
  ('tarifa_padrao',         '5.00'),
  ('salario_max_gerente',   '8000'),
  ('salario_max_vendedor',  '4000'),
  ('salario_max_caixa',     '2500')
ON CONFLICT (chave) DO NOTHING;
