// ============================================================
// score-vendedor.ts — Fórmula v3 (SELETO)
// Exclusivo do fluxo de vendedor. Gerente/caixa não utilizam.
// ============================================================

// ---------- Tipos públicos ----------------------------------

export type Perfil4 = 'N' | 'R' | 'E' | 'L'
export type Classificacao = 'A' | 'B' | 'C' | 'D'

/** Estrutura que vem do JSONB quiz_vendedor_v3 */
export type DadosVendedorV3 = {
  mix_pct: { N: number; R: number; E: number; L: number }
  respostas: Record<string, { perfil: string }>
  tipo_saida?: string
  tempo_ultimo_emprego?: string
}

export type AlertaV3 = { codigo: string; descricao: string; penalidade: number }

export type ResultadoVendedorV3 = {
  score_nato: number          // força nato — mix_pct.N (0-100)
  score_equilibrio: number    // aderência não-nato à régua 50/30/20 (0-100)
  score_coerencia: number     // coerência dos pares (0-100)
  divergencias: number        // nº de pares incoerentes
  perfil_dominante: Perfil4
  score_final: number         // ponderado + penalidades, 0-100
  alertas: AlertaV3[]
  classificacao: Classificacao
}

// ---------- Pares de coerência cruzada ---------------------
// Cada grupo: todos os campos devem apontar para o mesmo perfil.
const PARES_COERENCIA: (keyof DadosVendedorV3['respostas'])[][] = [
  ['tensao_meta_fim_dia', 'meta_loja_individual_atras'],        // P1 ↔ P14
  ['cliente_vou_pensar', 'frase_combina_1'],                    // P3 ↔ P7
  ['reacao_tres_perdas', 'loja_sem_movimento'],                  // P2 ↔ P9
  ['elogio_preferido_1', 'peso_mudar_trabalho', 'sucesso_futuro'], // P5 ↔ P17 ↔ P18
  ['chega_peca_nova', 'inicio_turno'],                           // P10 ↔ P11
]

// ---------- Helpers ----------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------- Dimensão 1: Força Nato -------------------------
// Diretamente o percentual de peso acumulado em respostas N.
function calcNato(d: DadosVendedorV3): number {
  return clamp(d.mix_pct.N)
}

// ---------- Dimensão 2: Equilíbrio -------------------------
// Mede o quanto a distribuição não-Nato se aproxima da régua
// SELETO: R=50% / E=30% / L=20% do total não-Nato.
// Usa desvio médio absoluto normalizado pelo máximo teórico (1.6).
function calcEquilibrio(d: DadosVendedorV3): number {
  const nonNato = d.mix_pct.R + d.mix_pct.E + d.mix_pct.L
  if (nonNato === 0) return 0   // candidato 100% Nato — dimensão não se aplica

  const R = d.mix_pct.R / nonNato
  const E = d.mix_pct.E / nonNato
  const L = d.mix_pct.L / nonNato

  // Desvio total em relação à régua (R=0.50, E=0.30, L=0.20)
  const desvio = Math.abs(R - 0.50) + Math.abs(E - 0.30) + Math.abs(L - 0.20)

  // Máximo teórico de desvio = 1.6 (todo peso em L)
  return clamp((1 - desvio / 1.6) * 100)
}

// ---------- Dimensão 3: Coerência --------------------------
// Conta pares/grupos onde os campos não convergem ao mesmo perfil.
// Retorna { coerencia (0-100), divergencias }
function calcCoerencia(d: DadosVendedorV3): { coerencia: number; divergencias: number } {
  let div = 0

  for (const grupo of PARES_COERENCIA) {
    const perfis = grupo
      .map((campo) => d.respostas[campo]?.perfil)
      .filter(Boolean)

    if (perfis.length < 2) continue  // sem dados suficientes — ignora

    const todosIguais = perfis.every((p) => p === perfis[0])
    if (!todosIguais) div++
  }

  // Valor da dimensão conforme divergências:
  // 0-1 → 100 | 2 → 90 (−10 pts) | 3+ → 55
  const coerencia = div <= 1 ? 100 : div === 2 ? 90 : 55

  return { coerencia, divergencias: div }
}

// ---------- Perfil dominante --------------------------------
function perfilDominante(d: DadosVendedorV3): Perfil4 {
  const pcts = d.mix_pct
  const ordem: Perfil4[] = ['N', 'R', 'E', 'L']
  return ordem.reduce((a, b) => (pcts[a] >= pcts[b] ? a : b))
}

// ---------- Cálculo principal (v3) -------------------------
export function calcularScoreVendedorV3(d: DadosVendedorV3): ResultadoVendedorV3 {
  const score_nato      = round2(calcNato(d))
  const score_equilibrio = round2(calcEquilibrio(d))
  const { coerencia, divergencias } = calcCoerencia(d)
  const score_coerencia  = coerencia

  // Ponderação: 55% Nato + 20% Equilíbrio + 25% Coerência
  let score = 0.55 * score_nato + 0.20 * score_equilibrio + 0.25 * score_coerencia

  const alertas: AlertaV3[] = []

  // ── Penalidade: histórico de saída ──
  if (d.tipo_saida === 'Saí sem avisar') {
    alertas.push({ codigo: 'V01', descricao: 'Saiu sem cumprir aviso prévio', penalidade: 5 })
    score -= 5
  }
  if (d.tempo_ultimo_emprego === 'Menos de 3 meses') {
    alertas.push({ codigo: 'V02', descricao: 'Permanência muito curta no último emprego', penalidade: 3 })
    score -= 3
  }

  // ── Modificador de coerência ──
  // 2 divergências → o score já perdeu pontos via dimensão (90 em vez de 100)
  // 3+ → capar em 55 (independente dos outros componentes)
  if (divergencias >= 3) {
    alertas.push({ codigo: 'V03', descricao: 'Alta incoerência nas respostas (≥3 pares divergentes)', penalidade: 0 })
    score = Math.min(score, 55)
  }

  // ── Piso Executor ──
  // Perfil dominante E + coerência alta (div ≤ 1) → score mínimo 45
  const dominante = perfilDominante(d)
  if (dominante === 'E' && divergencias <= 1 && score < 45) {
    alertas.push({ codigo: 'V04', descricao: 'Perfil Executor coerente — piso aplicado', penalidade: 0 })
    score = 45
  }

  const score_final = round2(clamp(score))

  const classificacao: Classificacao =
    score_final >= 75 ? 'A' :
    score_final >= 60 ? 'B' :
    score_final >= 45 ? 'C' : 'D'

  return {
    score_nato,
    score_equilibrio,
    score_coerencia,
    divergencias,
    perfil_dominante: dominante,
    score_final,
    alertas,
    classificacao,
  }
}

// ============================================================
// ── Legado (score v2, candidatos sem quiz_vendedor_v3) ──────
// Mantido para re-ranking de candidatos antigos em FASE 4.
// ============================================================

export type DadosVendedor = {
  escolaridade?: string
  conducoes_ida?: string
  conducoes_volta?: string
  disponibilidade_horario?: string
  pretensao_acima_teto?: boolean
  tempo_ultimo_emprego?: string
  motivo_permanencia?: string
  saiu_sem_avisar?: string
  preferencia_trabalho?: string
  reacao_orientacao?: string
  aceita_regras?: string
  motivacao_vendas?: string
  situacao_venda?: string
  reacao_sem_venda?: string
  situacao_loja_baguncada?: string
  experiencia_persuasao?: string
  lida_movimento_fraco?: string
  aceita_horario_shopping?: string
  ativo_redes_sociais?: string
  comunicacao_pessoal?: string
  defeito_segundo_gerente?: string
  por_que_confiar?: string
}

export type Alerta = { codigo: string; descricao: string; penalidade: number }

export type ResultadoVendedor = {
  score_vocacao: number
  score_comprometimento_v: number
  score_comunicacao: number
  score_disciplina_v: number
  score_potencial: number
  score_final: number
  perfil_vendedor: string
  alertas: Alerta[]
  classificacao: Classificacao
  score_vocacao_raw: number
  dimensoes_com_bonus: string[]
}

function v(n: number): number { return Math.max(0, Math.min(100, n)) }

function calcVocacao(d: DadosVendedor): number {
  let s = 0
  switch (d.motivacao_vendas) {
    case 'Ver a equipe inteira batendo meta junto':       s += 35; break
    case 'Ajudar o cliente a encontrar o que precisa':   s += 35; break
    case 'Comissão e meta batida':                       s += 25; break
    case 'Ainda estou descobrindo':                      s += 10; break
  }
  switch (d.situacao_venda) {
    case 'Pergunto o que ele precisa de verdade e indico o que resolve o problema dele': s += 35; break
    case 'Dou minha opinião direta — não gosto de enrolar':                             s += 30; break
    case 'Apresento os prós e contras de cada um e deixo ele decidir':                 s += 20; break
    case 'Prefiro não influenciar — cada um sabe o que quer':                          s += 10; break
  }
  switch (d.reacao_sem_venda) {
    case 'Analiso o que posso melhorar na minha abordagem': s += 35; break
    case 'Fico frustrado mas dobro o esforço':              s += 30; break
    case 'Encaro como normal — tem dias assim':             s += 20; break
    case 'Fico desmotivado':                               s +=  5; break
  }
  switch (d.situacao_loja_baguncada) {
    case 'Começo a organizar imediatamente sem precisar ser mandado': s += 35; break
    case 'Organizo minha área e aviso o gerente sobre o resto':       s += 25; break
    case 'Espero o gerente chegar e dar orientação':                  s += 15; break
    case 'Faço o mínimo necessário — não é minha função organizar tudo': s += 5; break
  }
  return v(s)
}

function calcComprometimento(d: DadosVendedor): number {
  let s = 0
  switch (d.tempo_ultimo_emprego) {
    case 'Mais de 1 ano':    s += 40; break
    case '6 meses a 1 ano': s += 30; break
    case '3 a 6 meses':     s += 20; break
    case 'Primeiro emprego': s += 25; break
    case 'Menos de 3 meses': s +=  5; break
  }
  switch (d.motivo_permanencia) {
    case 'Crescimento e desafio': s += 35; break
    case 'Reconhecimento':        s += 30; break
    case 'Ambiente agradável':    s += 20; break
    case 'Estabilidade':          s += 15; break
    case 'Salário bom':           s += 10; break
  }
  switch (d.saiu_sem_avisar) {
    case 'Cumpri o aviso prévio normalmente':                      s += 25; break
    case 'Ainda estou no primeiro emprego':                        s += 20; break
    case 'Saí de comum acordo sem cumprir aviso':                  s += 15; break
    case 'Precisei sair antes sem avisar por motivo pessoal':      s +=  5; break
  }
  return v(s)
}

function calcComunicacao(d: DadosVendedor): number {
  let s = 0
  switch (d.ativo_redes_sociais) {
    case 'Sim, posto com frequência': s += 40; break
    case 'Às vezes':                  s += 30; break
    case 'Só consumo conteúdo':       s += 15; break
    case 'Não uso redes sociais':     s +=  5; break
  }
  switch (d.comunicacao_pessoal) {
    case 'Extrovertido e comunicativo':                      s += 60; break
    case 'Reservado mas me expresso bem quando preciso':     s += 40; break
    case 'Tímido mas me esforcio para melhorar':             s += 25; break
    case 'Prefiro comunicação escrita':                      s += 15; break
  }
  return v(s)
}

function calcDisciplina(d: DadosVendedor): number {
  let s = 0
  switch (d.reacao_orientacao) {
    case 'Aceito e depois converso em particular': s += 40; break
    case 'Depende da situação':                    s += 30; break
    case 'Sigo sem questionar':                    s += 20; break
    case 'Questiono na hora':                      s += 10; break
  }
  switch (d.preferencia_trabalho) {
    case 'Acho importante, ajuda a focar a semana':                    s += 40; break
    case 'Aceito, mas preferia receber por mensagem':                  s += 25; break
    case 'Depende de como o gerente conduz':                           s += 20; break
    case 'Acho excessivo para quem já sabe o que fazer':               s +=  5; break
  }
  switch (d.aceita_regras) {
    case 'Sem problema — cada empresa tem suas regras e eu respeito':                      s += 25; break
    case 'Me adapto rápido, mesmo que sejam diferentes do que eu estava acostumado':      s += 20; break
    case 'Tenho um pouco de dificuldade quando não entendo o motivo da regra':            s += 10; break
    case 'Prefiro ambientes com menos regras fixas':                                      s +=  0; break
  }
  return v(s)
}

function calcPotencial(d: DadosVendedor): number {
  let s = 0
  const esc = d.escolaridade ?? ''
  if (esc === 'Faculdade completa' || esc === 'Pós/MBA') s += 50
  else if (esc === 'Faculdade em andamento') s += 35
  else if (esc === 'Ensino Médio Completo') s += 15

  switch (d.aceita_horario_shopping) {
    case 'Sem problema, já sei disso':              s += 50; break
    case 'Aceito mas prefiro dias de semana':       s += 30; break
    case 'Não sabia disso mas consigo me adaptar':  s += 20; break
    case 'Tenho restrições de horário':             s += 10; break
  }
  return v(s)
}

type Perfil = 'Vendedor Nato' | 'Relacional' | 'Executor' | 'Organizador' | 'Liderança Emergente'

function determinarPerfil(d: DadosVendedor, vocacao: number): string {
  const c: Record<Perfil, number> = {
    'Vendedor Nato': 0, 'Relacional': 0, 'Executor': 0,
    'Organizador': 0, 'Liderança Emergente': 0,
  }
  if (d.motivacao_vendas === 'Comissão e meta batida') c['Vendedor Nato']++
  if (d.situacao_venda === 'Dou minha opinião direta — não gosto de enrolar') c['Vendedor Nato']++
  if (d.reacao_sem_venda === 'Fico frustrado mas dobro o esforço') c['Vendedor Nato']++
  if (d.motivo_permanencia === 'Reconhecimento') c['Vendedor Nato']++
  if (d.motivacao_vendas === 'Ajudar o cliente a encontrar o que precisa') c['Relacional']++
  if (d.situacao_venda === 'Pergunto o que ele precisa de verdade e indico o que resolve o problema dele') c['Relacional']++
  if (d.comunicacao_pessoal === 'Extrovertido e comunicativo') c['Relacional']++
  if (d.ativo_redes_sociais === 'Sim, posto com frequência') c['Relacional']++
  if (d.preferencia_trabalho === 'Acho importante, ajuda a focar a semana') c['Executor']++
  if (d.aceita_regras === 'Sem problema — cada empresa tem suas regras e eu respeito') c['Executor']++
  if (d.reacao_orientacao === 'Sigo sem questionar') c['Executor']++
  if (d.lida_movimento_fraco?.startsWith('Organizo estoque')) c['Executor']++
  if (d.situacao_loja_baguncada === 'Começo a organizar imediatamente sem precisar ser mandado') c['Executor']++
  if (d.lida_movimento_fraco?.startsWith('Organizo estoque')) c['Organizador']++
  if (d.situacao_loja_baguncada === 'Começo a organizar imediatamente sem precisar ser mandado') c['Organizador']++
  if (d.motivacao_vendas === 'Ver a equipe inteira batendo meta junto') c['Liderança Emergente']++
  if (d.reacao_sem_venda === 'Analiso o que posso melhorar na minha abordagem') c['Liderança Emergente']++
  if (d.motivo_permanencia === 'Crescimento e desafio') c['Liderança Emergente']++
  if (d.reacao_orientacao === 'Aceito e depois converso em particular') c['Liderança Emergente']++

  const max = Math.max(...Object.values(c))
  const candidatos = (Object.keys(c) as Perfil[]).filter((k) => c[k] === max)
  let perfil = candidatos[0]
  if (candidatos.length > 1) {
    perfil = vocacao >= 50 ? 'Liderança Emergente' : 'Executor'
    if (!candidatos.includes(perfil)) perfil = candidatos[0]
  }
  if (perfil === 'Liderança Emergente' && vocacao < 50) perfil = 'Executor'
  return perfil
}

const aplicarBonus = (score: number): number => Math.min(100, score >= 85 ? score * 1.15 : score)

export function calcularScoreVendedor(d: DadosVendedor): ResultadoVendedor {
  const sv = calcVocacao(d)
  const sc = calcComprometimento(d)
  const sm = calcComunicacao(d)
  const sd = calcDisciplina(d)
  const sp = calcPotencial(d)

  const svFinal = aplicarBonus(sv)
  const scFinal = aplicarBonus(sc)
  const smFinal = aplicarBonus(sm)
  const sdFinal = aplicarBonus(sd)
  const spFinal = aplicarBonus(sp)

  const dimensoes_com_bonus: string[] = []
  if (sv >= 85) dimensoes_com_bonus.push('vocacao')
  if (sc >= 85) dimensoes_com_bonus.push('comprometimento')
  if (sm >= 85) dimensoes_com_bonus.push('comunicacao')
  if (sd >= 85) dimensoes_com_bonus.push('disciplina')
  if (sp >= 85) dimensoes_com_bonus.push('potencial')

  const ponderado = svFinal * 0.30 + scFinal * 0.25 + smFinal * 0.20 + sdFinal * 0.15 + spFinal * 0.10

  const alertas: Alerta[] = []
  if (d.saiu_sem_avisar === 'Precisei sair antes sem avisar por motivo pessoal')
    alertas.push({ codigo: 'V01', descricao: 'Saiu sem avisar', penalidade: 5 })
  if (d.motivacao_vendas === 'Ainda estou descobrindo' && d.reacao_sem_venda === 'Fico desmotivado')
    alertas.push({ codigo: 'V02', descricao: 'Baixa vocação', penalidade: 5 })
  if (d.reacao_orientacao === 'Questiono na hora' || d.aceita_regras === 'Prefiro ambientes com menos regras fixas')
    alertas.push({ codigo: 'V03', descricao: 'Resistência a regras', penalidade: 3 })
  if (d.aceita_horario_shopping === 'Tenho restrições de horário')
    alertas.push({ codigo: 'V04', descricao: 'Restrição de horário', penalidade: 4 })
  if (d.tempo_ultimo_emprego === 'Menos de 3 meses' && d.saiu_sem_avisar === 'Precisei sair antes sem avisar por motivo pessoal')
    alertas.push({ codigo: 'V05', descricao: 'Instabilidade e saída abrupta', penalidade: 3 })
  if (d.ativo_redes_sociais === 'Não uso redes sociais' && d.comunicacao_pessoal === 'Prefiro comunicação escrita')
    alertas.push({ codigo: 'V06', descricao: 'Perfil pouco comunicativo', penalidade: 2 })
  if (d.escolaridade === 'Faculdade em andamento')
    alertas.push({ codigo: 'V07', descricao: 'Faculdade em andamento', penalidade: 2 })

  const maxConducoes = Math.max(
    parseInt(d.conducoes_ida || '0') || 0,
    parseInt(d.conducoes_volta || '0') || 0,
  )
  if (maxConducoes >= 2)
    alertas.push({ codigo: 'V09', descricao: 'Pelo menos um trajeto exige 2 conduções — considerar na decisão', penalidade: 1 })
  if (d.disponibilidade_horario === 'Manhã-tarde' || d.disponibilidade_horario === 'Tarde-noite')
    alertas.push({ codigo: 'V10', descricao: 'Disponibilidade parcial — shopping exige horário total', penalidade: 2 })
  if (d.pretensao_acima_teto === true)
    alertas.push({ codigo: 'V11', descricao: 'Pretensão salarial acima do teto configurado', penalidade: 2 })

  const penalidades = alertas.reduce((acc, a) => acc + a.penalidade, 0)
  const score_final = Math.max(0, Math.round((ponderado - penalidades) * 100) / 100)

  let classificacao: Classificacao =
    score_final >= 80 ? 'A' :
    score_final >= 65 ? 'B' :
    score_final >= 50 ? 'C' : 'D'

  if (sv < 30 && (classificacao === 'A' || classificacao === 'B')) {
    classificacao = 'C'
    alertas.push({ codigo: 'V08', descricao: 'Vocação abaixo do mínimo esperado para o cargo — classificação limitada a C', penalidade: 0 })
  }

  return {
    score_vocacao: Math.round(sv * 100) / 100,
    score_comprometimento_v: Math.round(sc * 100) / 100,
    score_comunicacao: Math.round(sm * 100) / 100,
    score_disciplina_v: Math.round(sd * 100) / 100,
    score_potencial: Math.round(sp * 100) / 100,
    score_final,
    perfil_vendedor: determinarPerfil(d, sv),
    alertas,
    classificacao,
    score_vocacao_raw: Math.round(sv * 100) / 100,
    dimensoes_com_bonus,
  }
}
