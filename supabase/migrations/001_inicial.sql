-- Tabela principal de candidatos
CREATE TABLE candidatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em TIMESTAMPTZ DEFAULT NOW(),

  -- Seção 1: Dados pessoais
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  unidades TEXT[] NOT NULL,
  endereco TEXT,
  disponibilidade_imediata BOOLEAN DEFAULT true,
  disponibilidade_obs TEXT,

  -- Seção 2: Histórico profissional
  emprego1_empresa TEXT,
  emprego1_cargo TEXT,
  emprego1_periodo TEXT,
  emprego1_saida TEXT,
  emprego2_empresa TEXT,
  emprego2_cargo TEXT,
  emprego2_periodo TEXT,
  emprego2_saida TEXT,
  emprego3_empresa TEXT,
  emprego3_cargo TEXT,
  emprego3_periodo TEXT,
  emprego3_saida TEXT,
  curriculo_url TEXT,

  -- Seção 3: Resultado comercial
  meta_batida TEXT,
  melhor_resultado TEXT,
  kpis TEXT,

  -- Seção 4: Liderança
  qtd_liderados INTEGER,
  ja_demitiu BOOLEAN,
  como_cobra TEXT,

  -- Seção 5: Perfil comportamental (escalas 1-10)
  escala_competitividade INTEGER,
  escala_organizacao INTEGER,
  escala_pressao INTEGER,

  -- Seção 6: Cultura SELETO
  disposicao_operacional TEXT,
  ambiente_preferido TEXT,

  -- Seção 7: Situações práticas
  case_meta_perdida TEXT,
  case_vendedor_atrasado TEXT,
  case_gerente_complacente TEXT,

  -- Seção 8: Vídeo
  video_url TEXT,

  -- Score calculado
  score_comercial INTEGER DEFAULT 0,
  score_lideranca INTEGER DEFAULT 0,
  score_comprometimento INTEGER DEFAULT 0,
  score_cultura INTEGER DEFAULT 0,
  score_ambicao INTEGER DEFAULT 0,
  score_estabilidade INTEGER DEFAULT 0,
  score_operacao INTEGER DEFAULT 0,
  score_final NUMERIC(5,2) DEFAULT 0,
  perfil CHAR(1),
  alertas TEXT[] DEFAULT '{}',

  -- Pipeline
  status TEXT DEFAULT 'NOVO'
);

-- Habilitar RLS
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;

-- Permitir inserção pública (formulário)
CREATE POLICY "insert_publico" ON candidatos FOR INSERT WITH CHECK (true);

-- Apenas usuários autenticados podem ler
CREATE POLICY "select_autenticado" ON candidatos FOR SELECT USING (auth.role() = 'authenticated');
