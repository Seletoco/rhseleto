export interface DadosFormularioGerente {
  cargo?: string
  // Seção 1
  nome: string
  idade?: string
  endereco?: string
  unidades?: string[]
  tempo_deslocamento?: string
  qtd_passagens?: string
  whatsapp?: string
  instagram?: string
  escolaridade?: string
  veiculo?: string
  cnh?: string[]
  disponibilidade_horario?: string
  disponibilidade_mudanca?: string
  pretensao_salarial?: string
  // Seção 2
  curriculo_url?: string
  trabalhando_atualmente?: string
  empresa_atual?: string
  cargo_atual?: string
  tempo_empresa_atual?: string
  motivo_busca?: string
  ultima_empresa?: string
  ultimo_cargo?: string
  tempo_ultima_empresa?: string
  motivo_saida?: string
  ultimas_experiencias?: string
  confortavel_cobranca_meta?: string
  preferencia_salarial?: string
  incomodo_lideranca?: string
  // Seção 3
  gosta_vender?: string
  maior_meta?: string
  maior_resultado?: string
  ferramentas_comerciais?: string[]
  reacao_abaixo_meta?: string
  prejudica_resultado?: string
  ambiente_preferido?: string
  perfil_competitivo?: string
  diferencial_vendas?: string
  // Seção 4
  ja_liderou?: string
  qtd_liderados?: string
  reacao_baixo_resultado?: string
  acoes_lideranca?: string[]
  motivo_lideranca_sem_experiencia?: string
  diferenca_gerente_forte?: string
  prejudica_equipe?: string
  // Seção 5
  para_de_crescer?: string
  ambiente_trabalho?: string
  caracteristica_principal?: string
  incomodo_equipe?: string
  perde_motivacao?: string
  significado_comprometimento?: string
  peso_crescimento?: string
  evolucao_profissional?: string
  objetivo_5_anos?: string
  intenso_vs_toxico?: string
  // Seção 6
  confortavel_cobranca_constante?: string
  visao_acompanhamento_meta?: string
  gerente_participa_vendas?: string
  ferramentas_utilizadas?: string[]
  acao_movimento_fraco?: string
  confortavel_operacao?: string[]
  permanencia_empresa?: string
  // Seção 7
  case_meta_5dias?: string
  case_vendedor_problema?: string
  case_equipe_acomodada?: string
  case_funcionario_atrasado?: string
  case_loja_desorganizada?: string
  prioridade_30dias?: string
  // Seção 8
  video_url?: string
  foto_url?: string
  // Campos _opcao (perfil_gerente)
  incomodo_lideranca_opcao?: string
  gosta_vender_opcao?: string
  reacao_abaixo_meta_opcao?: string
  prejudica_resultado_opcao?: string
  diferencial_vendas_opcao?: string
  diferenca_gerente_forte_opcao?: string
  prejudica_equipe_opcao?: string
  caracteristica_principal_opcao?: string
  incomodo_equipe_opcao?: string
  perde_motivacao_opcao?: string
  significado_comprometimento_opcao?: string
  intenso_vs_toxico_opcao?: string
  visao_acompanhamento_meta_opcao?: string
  acao_movimento_fraco_opcao?: string
  // Campos contextuais para alertas A13/A14
  pretensao_acima_teto?: boolean
  ramo_empresa_atual?: string
  ramo_ultima_empresa?: string
}

export interface ScoreDimensoes {
  score_comercial: number
  score_lideranca: number
  score_comprometimento: number
  score_cultura: number
  score_ambicao: number
  score_estabilidade: number
  score_operacao: number
}

export type CodigoAlerta =
  | 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06'
  | 'A07' | 'A08' | 'A09' | 'A10' | 'A11' | 'A12'
  | 'A13' | 'A14' | 'A15'

export interface Alerta {
  codigo: CodigoAlerta
  descricao: string
  penalidade: number
}

export type Perfil = 'A' | 'B' | 'C' | 'D'

export interface ResultadoScore extends ScoreDimensoes {
  score_final: number
  perfil: Perfil
  alertas: Alerta[]
  perfil_gerente?: string
}
