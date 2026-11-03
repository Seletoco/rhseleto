INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES
  ('email_taquara',    'admin@seleto-tqr.com',  NOW()),
  ('email_aerotown',   'admin@seleto-aero.com', NOW()),
  ('email_americas',   'admin@seleto-ame.com',  NOW()),
  ('email_nova_iguacu','admin@seleto-nig.com',  NOW())
ON CONFLICT (chave) DO NOTHING;
