import type { DadosFormularioGerente, ResultadoScore, Alerta, Perfil, ScoreDimensoes } from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const temNumero = (texto?: string): boolean =>
  !!texto && /\d/.test(texto)

const contem = (texto: string | undefined, termos: string[]): boolean =>
  !!texto && termos.some(t => texto.toLowerCase().includes(t.toLowerCase()))

const len = (texto?: string): number =>
  texto?.trim().length ?? 0

// ─── Dimensões ────────────────────────────────────────────────────────────────

function calcularComercial(d: DadosFormularioGerente): number {
  let score = 0
  if (temNumero(d.maior_meta)) score += 28
  if (temNumero(d.maior_resultado)) score += 28
  const ferramentas = d.ferramentas_comerciais?.length ?? 0
  if (ferramentas >= 6) score += 22
  else if (ferramentas >= 3) score += 12
  if (len(d.reacao_abaixo_meta) > 100) score += 14
  else if (len(d.reacao_abaixo_meta) > 50) score += 7
  if (len(d.gosta_vender) > 60) score += 8
  return Math.min(score, 100)
}

function calcularLideranca(d: DadosFormularioGerente): number {
  let score = 0
  if (d.ja_liderou === 'Sim') {
    score += 35
    const qtd = parseInt(d.qtd_liderados ?? '0') || 0
    if (qtd >= 8) score += 20
    else if (qtd >= 4) score += 12
    else if (qtd >= 2) score += 6
    const acoes = d.acoes_lideranca?.length ?? 0
    if (acoes >= 5) score += 25
    else if (acoes >= 3) score += 15
    if (len(d.reacao_baixo_resultado) > 80) score += 20
  } else {
    if (len(d.motivo_lideranca_sem_experiencia) > 150) score += 20
    else if (len(d.motivo_lideranca_sem_experiencia) > 80) score += 10
  }
  if (len(d.diferenca_gerente_forte) > 100) score += 15
  else if (len(d.diferenca_gerente_forte) > 50) score += 7
  return Math.min(score, 100)
}

function calcularComprometimento(d: DadosFormularioGerente): number {
  let score = 0
  if (len(d.ultimas_experiencias) > 120) score += 15
  else if (len(d.ultimas_experiencias) > 60) score += 8

  // Analisar tempo nas empresas
  const expressoesTempo = ['ano', 'anos', 'meses', 'mês']
  if (d.trabalhando_atualmente === 'Sim' && contem(d.tempo_empresa_atual, expressoesTempo)) score += 10
  if (d.trabalhando_atualmente === 'Não' && contem(d.tempo_ultima_empresa, expressoesTempo)) score += 10

  const cases = [
    d.case_meta_5dias, d.case_vendedor_problema, d.case_equipe_acomodada,
    d.case_funcionario_atrasado, d.case_loja_desorganizada, d.prioridade_30dias,
  ]
  const filled = cases.filter(c => len(c) > 50).length
  const detailed = cases.filter(c => len(c) > 150).length
  score += filled * 5
  score += detailed * 5
  if (len(d.incomodo_lideranca) > 50) score += 5
  return Math.min(score, 100)
}

function calcularCultura(d: DadosFormularioGerente): number {
  let score = 0
  if (d.confortavel_cobranca_constante === 'Sim') score += 38
  else if (d.confortavel_cobranca_constante === 'Depende da liderança') score += 15
  if (d.confortavel_cobranca_meta === 'Sim') score += 24
  else if (d.confortavel_cobranca_meta === 'Depende da forma da cobrança') score += 10
  if (len(d.visao_acompanhamento_meta) > 80) score += 22
  else if (len(d.visao_acompanhamento_meta) > 40) score += 10
  if (len(d.gerente_participa_vendas) > 60) score += 16
  return Math.min(score, 100)
}

function calcularAmbicao(d: DadosFormularioGerente): number {
  let score = 0
  if (d.peso_crescimento === 'É minha prioridade principal') score += 30
  else if (d.peso_crescimento === 'Pesa bastante') score += 18
  else if (d.peso_crescimento === 'Considero importante') score += 8
  if (len(d.objetivo_5_anos) > 100) score += 28
  else if (len(d.objetivo_5_anos) > 50) score += 14
  if (len(d.evolucao_profissional) > 80) score += 24
  else if (len(d.evolucao_profissional) > 40) score += 12
  if (d.ambiente_trabalho === 'Acelerados e focados em resultado') score += 18
  return Math.min(score, 100)
}

function calcularEstabilidade(d: DadosFormularioGerente): number {
  let score = 0
  if (d.trabalhando_atualmente === 'Sim') score += 30
  if (len(d.ultimas_experiencias) > 80) score += 20
  const termosNegativos = ['burnout', 'cansaço', 'esgotamento', 'descanso', 'cansado']
  if (!contem(d.motivo_saida, termosNegativos) && !contem(d.motivo_busca, termosNegativos)) score += 25
  if (len(d.permanencia_empresa) > 50) score += 25
  return Math.min(score, 100)
}

function calcularOperacao(d: DadosFormularioGerente): number {
  let score = 0
  const confortavel = d.confortavel_operacao?.length ?? 0
  if (confortavel >= 5) score += 45
  else if (confortavel >= 3) score += 28
  else if (confortavel >= 1) score += 12
  if (len(d.acao_movimento_fraco) > 100) score += 30
  else if (len(d.acao_movimento_fraco) > 50) score += 15
  const ferramentas = d.ferramentas_utilizadas?.length ?? 0
  if (ferramentas >= 4) score += 25
  else if (ferramentas >= 2) score += 12
  return Math.min(score, 100)
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

function verificarAlertas(d: DadosFormularioGerente): Alerta[] {
  const alertas: Alerta[] = []

  // A01 – Baixa Energia
  const linguagemPassiva = ['tentei', 'esperava', 'procurei', 'aguardei', 'dependeria', 'talvez', 'acho que']
  const camposChave = [d.case_meta_5dias, d.case_loja_desorganizada, d.diferenca_gerente_forte, d.reacao_abaixo_meta]
  const camposCurtos = camposChave.filter(c => len(c) < 60 && len(c) > 0).length
  if (camposChave.some(c => contem(c, linguagemPassiva)) || camposCurtos >= 2) {
    alertas.push({ codigo: 'A01', descricao: 'Baixa Energia', penalidade: 2 })
  }

  // A02 – Perfil Confortável
  const termosConforto = ['tranquilo', 'tranquila', 'equilibrado', 'equilibrada', 'leve', 'calmo', 'zona de conforto']
  if (d.ambiente_trabalho === 'Mais leves e tranquilos' || d.ambiente_trabalho === 'Equilibrados' ||
    contem(d.permanencia_empresa, termosConforto) || contem(d.para_de_crescer, termosConforto)) {
    alertas.push({ codigo: 'A02', descricao: 'Perfil Confortável', penalidade: 3 })
  }

  // A03 – Pouca Cobrança
  if ((d.confortavel_cobranca_constante === 'Não' || d.confortavel_cobranca_constante === 'Depende do ambiente') &&
    d.preferencia_salarial === 'Salário fixo maior') {
    alertas.push({ codigo: 'A03', descricao: 'Pouca Cobrança', penalidade: 3 })
  }

  // A04 – Instabilidade
  const periodicidadeCurta = ['3 meses', '4 meses', '5 meses', '2 meses', '1 mês', 'menos de 6']
  if (contem(d.ultimas_experiencias, periodicidadeCurta) ||
    (d.trabalhando_atualmente === 'Não' && contem(d.tempo_ultima_empresa, ['meses', 'menos']))) {
    alertas.push({ codigo: 'A04', descricao: 'Instabilidade', penalidade: 2 })
  }

  // A05 – Pouca Liderança
  if (d.ja_liderou === 'Não' && len(d.motivo_lideranca_sem_experiencia) < 80) {
    alertas.push({ codigo: 'A05', descricao: 'Pouca Liderança', penalidade: 2 })
  }

  // A06 – Resultado Fraco
  if (!temNumero(d.maior_meta) && !temNumero(d.maior_resultado)) {
    alertas.push({ codigo: 'A06', descricao: 'Resultado Fraco', penalidade: 3 })
  }

  // A07 – Cansaço
  const termosCansaco = ['burnout', 'cansaço', 'esgotamento', 'descanso', 'cansado', 'esgotado', 'estressado']
  if (contem(d.motivo_saida, termosCansaco) || contem(d.motivo_busca, termosCansaco)) {
    alertas.push({ codigo: 'A07', descricao: 'Cansaço', penalidade: 2 })
  }

  // A08 – Baixa Ambição
  if (len(d.objetivo_5_anos) < 20 || d.peso_crescimento === 'Não é prioridade no momento') {
    alertas.push({ codigo: 'A08', descricao: 'Baixa Ambição', penalidade: 2 })
  }

  // A09 – Respostas Incoerentes
  if (
    (d.ja_liderou === 'Sim' && (d.acoes_lideranca?.length ?? 0) === 0 && len(d.reacao_baixo_resultado) < 30) ||
    d.intenso_vs_toxico_opcao === 'Não sei definir bem essa diferença'
  ) {
    alertas.push({ codigo: 'A09', descricao: 'Respostas Incoerentes', penalidade: 3 })
  }

  // A10 – Deslocamento Ruim
  const passagens = parseInt(d.qtd_passagens ?? '0') || 0
  if (passagens > 2) {
    alertas.push({ codigo: 'A10', descricao: 'Deslocamento Ruim', penalidade: 1 })
  }

  // A11 – Baixa Disponibilidade
  if (d.disponibilidade_horario && d.disponibilidade_horario !== 'Total') {
    alertas.push({ codigo: 'A11', descricao: 'Baixa Disponibilidade', penalidade: 2 })
  }

  // A12 – Vitimismo
  const termosVitimismo = ['culpa da empresa', 'não me valorizou', 'não me valorizaram', 'perseguição', 'injustiça', 'chefe ruim']
  if (contem(d.motivo_saida, termosVitimismo) || contem(d.motivo_busca, termosVitimismo)) {
    alertas.push({ codigo: 'A12', descricao: 'Vitimismo', penalidade: 3 })
  }

  // A13 – Pretensão Acima do Teto
  if (d.pretensao_acima_teto === true) {
    alertas.push({ codigo: 'A13', descricao: 'Pretensão salarial acima do teto configurado', penalidade: 2 })
  }

  // A14 – Sem Experiência em Varejo
  const ramosInformados = [d.ramo_empresa_atual, d.ramo_ultima_empresa].filter(Boolean) as string[]
  if (ramosInformados.length > 0 && !ramosInformados.some(r => r.includes('Varejo'))) {
    alertas.push({ codigo: 'A14', descricao: 'Sem experiência prévia em varejo', penalidade: 2 })
  }

  return alertas
}

// ─── Perfil Gerente ───────────────────────────────────────────────────────────

const MAPA_OPCAO_PERFIL: Record<string, string> = {
  // incomodo_lideranca_opcao
  'Falta de clareza nas metas e direcionamento': 'Comercial',
  'Não reconhecer o esforço e desenvolvimento da equipe': 'Pessoas',
  'Desorganização e falta de processos definidos': 'Operacional',
  'Liderança que não pensa no crescimento do negócio': 'Estratégico',
  'Microgerenciamento sem autonomia': 'Estratégico',
  // gosta_vender_opcao
  'Bater e superar metas — adrenalina do resultado': 'Comercial',
  'Ver o cliente satisfeito com o que indicou': 'Pessoas',
  'Construir uma equipe que vende bem junto': 'Estratégico',
  'Organizar o processo para a equipe vender mais': 'Operacional',
  // reacao_abaixo_meta_opcao
  'Convoco reunião, revejo números e monto plano de ação imediato': 'Comercial',
  'Converso individualmente com cada vendedor para entender o que está travando': 'Pessoas',
  'Revejo processos, organização da loja e abordagem da equipe': 'Operacional',
  'Analiso o mercado, concorrência e ajusto estratégia': 'Estratégico',
  // prejudica_resultado_opcao
  'Foco, disciplina e não aceitar desculpas': 'Comercial',
  'Motivação da equipe e ambiente saudável': 'Pessoas',
  'Processos bem definidos e execução consistente': 'Operacional',
  'Visão clara do negócio e adaptação rápida': 'Estratégico',
  // diferencial_vendas_opcao
  'Extraio o máximo de cada vendedor individualmente': 'Pessoas',
  'Crio urgência e pressão positiva pelo resultado': 'Comercial',
  'Mantenho processos e padrão mesmo sob pressão': 'Operacional',
  'Enxergo oportunidades que outros não veem': 'Estratégico',
  // diferenca_gerente_forte_opcao
  'O forte cobra resultado todos os dias sem aceitar justificativa': 'Comercial',
  'O forte desenvolve pessoas e cria novos líderes': 'Pessoas',
  'O forte mantém padrão e processo mesmo sob pressão': 'Operacional',
  'O forte pensa além da loja e enxerga o negócio como um todo': 'Estratégico',
  // prejudica_equipe_opcao
  'Falta de meta clara e cobrança consistente': 'Comercial',
  'Clima ruim, fofoca e falta de reconhecimento': 'Pessoas',
  'Desorganização e falta de processo definido': 'Operacional',
  'Liderança sem visão e sem direção estratégica': 'Estratégico',
  'Acomodação e tolerância com baixa performance': 'Comercial',
  // caracteristica_principal_opcao
  'Determinação — não paro enquanto não bato a meta': 'Comercial',
  'Empatia — entendo e desenvolvo as pessoas ao meu redor': 'Pessoas',
  'Disciplina — sigo e faço seguir processos sem exceção': 'Operacional',
  'Visão — enxergo oportunidades e penso no longo prazo': 'Estratégico',
  // incomodo_equipe_opcao
  'Não bater meta e não se esforçar para melhorar': 'Comercial',
  'Falta de comprometimento com o grupo e clima ruim': 'Pessoas',
  'Desorganização e não seguir processos definidos': 'Operacional',
  'Acomodação e falta de ambição de crescer': 'Estratégico',
  // perde_motivacao_opcao
  'Não ter meta desafiadora ou resultado para buscar': 'Comercial',
  'Ambiente tóxico e equipe sem engajamento': 'Pessoas',
  'Desorganização e falta de processos claros': 'Operacional',
  'Estagnação sem crescimento ou novos desafios': 'Estratégico',
  // significado_comprometimento_opcao
  'Entregar resultado independente das circunstâncias': 'Comercial',
  'Estar presente para a equipe e não deixar ninguém pra trás': 'Pessoas',
  'Cumprir processos e horários sem precisar ser cobrado': 'Operacional',
  'Pensar no crescimento da empresa como se fosse minha': 'Estratégico',
  // intenso_vs_toxico_opcao (exceto "Não sei…", tratado como A09)
  'Intenso cobra resultado, tóxico humilha quem não entrega': 'Comercial',
  'Intenso exige o melhor, tóxico destrói a autoestima da equipe': 'Pessoas',
  'Intenso mantém padrão alto, tóxico cria caos e insegurança': 'Operacional',
  'Intenso eleva o nível de todos, tóxico afasta os melhores talentos': 'Estratégico',
  // visao_acompanhamento_meta_opcao
  'Essencial — sem acompanhamento diário a equipe perde o foco': 'Comercial',
  'Importante mas precisa ser feito com sensibilidade para não pressionar demais': 'Pessoas',
  'Necessário e deve seguir um processo padrão todos os dias': 'Operacional',
  'Útil mas o foco deve ser na estratégia semanal, não só no dia a dia': 'Estratégico',
  // acao_movimento_fraco_opcao
  'Intensifico abordagem ativa — equipe na porta, ligações, remarketing': 'Comercial',
  'Uso o tempo para treinar e motivar a equipe': 'Pessoas',
  'Organizo loja, estoque, processos e visual merchandising': 'Operacional',
  'Analiso dados, revejo estratégia e planejo ações para o próximo pico': 'Estratégico',
}

const CAMPOS_OPCAO: (keyof DadosFormularioGerente)[] = [
  'incomodo_lideranca_opcao', 'gosta_vender_opcao', 'reacao_abaixo_meta_opcao',
  'prejudica_resultado_opcao', 'diferencial_vendas_opcao', 'diferenca_gerente_forte_opcao',
  'prejudica_equipe_opcao', 'caracteristica_principal_opcao', 'incomodo_equipe_opcao',
  'perde_motivacao_opcao', 'significado_comprometimento_opcao', 'intenso_vs_toxico_opcao',
  'visao_acompanhamento_meta_opcao', 'acao_movimento_fraco_opcao',
]

function calcularPerfilGerente(d: DadosFormularioGerente): { perfil: string; alertaBaixoComercial: boolean } {
  const votos: Record<string, number> = { Comercial: 0, Pessoas: 0, Operacional: 0, Estratégico: 0 }

  for (const campo of CAMPOS_OPCAO) {
    const val = d[campo] as string | undefined
    if (val && MAPA_OPCAO_PERFIL[val]) {
      votos[MAPA_OPCAO_PERFIL[val]]++
    }
  }

  const perfis = Object.entries(votos).sort((a, b) => b[1] - a[1])
  const top1 = perfis[0]
  const top2 = perfis[1]

  let perfil: string
  if (top1[1] === 0) {
    perfil = 'Indefinido'
  } else if (top1[1] === top2[1]) {
    // empate entre top1 e top2 — verificar se há 3+ empatados
    const empatados = perfis.filter(p => p[1] === top1[1]).map(p => p[0])
    if (empatados.length >= 3) {
      perfil = 'Comercial'
    } else {
      perfil = `Misto — ${empatados[0]} + ${empatados[1]}`
    }
  } else {
    perfil = top1[0]
  }

  return { perfil, alertaBaixoComercial: votos['Comercial'] === 0 }
}

// ─── Classificação ────────────────────────────────────────────────────────────

function classificarPerfil(score: number): Perfil {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

// ─── Função principal ─────────────────────────────────────────────────────────

export function calcularScore(dados: DadosFormularioGerente): ResultadoScore {
  const dimensoes: ScoreDimensoes = {
    score_comercial:       calcularComercial(dados),
    score_lideranca:       calcularLideranca(dados),
    score_comprometimento: calcularComprometimento(dados),
    score_cultura:         calcularCultura(dados),
    score_ambicao:         calcularAmbicao(dados),
    score_estabilidade:    calcularEstabilidade(dados),
    score_operacao:        calcularOperacao(dados),
  }

  const scorePonderado =
    dimensoes.score_comercial       * 0.25 +
    dimensoes.score_lideranca       * 0.18 +
    dimensoes.score_comprometimento * 0.17 +
    dimensoes.score_cultura         * 0.15 +
    dimensoes.score_ambicao         * 0.12 +
    dimensoes.score_estabilidade    * 0.08 +
    dimensoes.score_operacao        * 0.05

  const alertas = verificarAlertas(dados)
  const { perfil: perfil_gerente, alertaBaixoComercial } = calcularPerfilGerente(dados)
  if (alertaBaixoComercial) {
    alertas.push({ codigo: 'A15', descricao: 'Baixo Perfil Comercial', penalidade: 0 })
  }
  const penalidade = alertas.reduce((acc, a) => acc + a.penalidade, 0)
  const score_final = Math.max(0, Math.min(100, parseFloat((scorePonderado - penalidade).toFixed(2))))

  return { ...dimensoes, score_final, perfil: classificarPerfil(score_final), alertas, perfil_gerente }
}
