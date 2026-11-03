DROP TABLE IF EXISTS candidatos CASCADE;

CREATE TABLE candidatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  cargo TEXT DEFAULT 'gerente',

  -- SEÇÃO 1
  nome TEXT NOT NULL,
  idade TEXT,
  endereco TEXT,
  unidades TEXT[],
  tempo_deslocamento TEXT,
  qtd_passagens TEXT,
  whatsapp TEXT,
  instagram TEXT,
  escolaridade TEXT,
  veiculo TEXT,
  cnh TEXT[],
  disponibilidade_horario TEXT,
  disponibilidade_mudanca TEXT,
  pretensao_salarial TEXT,

  -- SEÇÃO 2
  curriculo_url TEXT,
  trabalhando_atualmente TEXT,
  empresa_atual TEXT,
  cargo_atual TEXT,
  tempo_empresa_atual TEXT,
  motivo_busca TEXT,
  ultima_empresa TEXT,
  ultimo_cargo TEXT,
  tempo_ultima_empresa TEXT,
  motivo_saida TEXT,
  ultimas_experiencias TEXT,
  confortavel_cobranca_meta TEXT,
  preferencia_salarial TEXT,
  incomodo_lideranca TEXT,

  -- SEÇÃO 3
  gosta_vender TEXT,
  maior_meta TEXT,
  maior_resultado TEXT,
  ferramentas_comerciais TEXT[],
  reacao_abaixo_meta TEXT,
  prejudica_resultado TEXT,
  ambiente_preferido TEXT,
  perfil_competitivo TEXT,
  diferencial_vendas TEXT,

  -- SEÇÃO 4
  ja_liderou TEXT,
  qtd_liderados TEXT,
  reacao_baixo_resultado TEXT,
  acoes_lideranca TEXT[],
  motivo_lideranca_sem_experiencia TEXT,
  diferenca_gerente_forte TEXT,
  prejudica_equipe TEXT,

  -- SEÇÃO 5
  para_de_crescer TEXT,
  ambiente_trabalho TEXT,
  caracteristica_principal TEXT,
  incomodo_equipe TEXT,
  perde_motivacao TEXT,
  significado_comprometimento TEXT,
  peso_crescimento TEXT,
  evolucao_profissional TEXT,
  objetivo_5_anos TEXT,
  intenso_vs_toxico TEXT,

  -- SEÇÃO 6
  confortavel_cobranca_constante TEXT,
  visao_acompanhamento_meta TEXT,
  gerente_participa_vendas TEXT,
  ferramentas_utilizadas TEXT[],
  acao_movimento_fraco TEXT,
  confortavel_operacao TEXT[],
  permanencia_empresa TEXT,

  -- SEÇÃO 7
  case_meta_5dias TEXT,
  case_vendedor_problema TEXT,
  case_equipe_acomodada TEXT,
  case_funcionario_atrasado TEXT,
  case_loja_desorganizada TEXT,
  prioridade_30dias TEXT,

  -- SEÇÃO 8
  video_url TEXT,

  -- SCORE
  score_comercial NUMERIC(5,2) DEFAULT 0,
  score_lideranca NUMERIC(5,2) DEFAULT 0,
  score_comprometimento NUMERIC(5,2) DEFAULT 0,
  score_cultura NUMERIC(5,2) DEFAULT 0,
  score_ambicao NUMERIC(5,2) DEFAULT 0,
  score_estabilidade NUMERIC(5,2) DEFAULT 0,
  score_operacao NUMERIC(5,2) DEFAULT 0,
  score_final NUMERIC(5,2) DEFAULT 0,
  perfil CHAR(1),
  alertas TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'NOVO'
);

ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_publico"  ON candidatos FOR INSERT WITH CHECK (true);
CREATE POLICY "leitura_admin"   ON candidatos FOR SELECT USING (auth.role() = 'authenticated');
