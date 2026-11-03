import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function val(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'Não informado'
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : 'Não informado'
  return String(v)
}

export async function POST(req: NextRequest) {
  try {
    const { candidato_id } = await req.json()
    if (!candidato_id) {
      return NextResponse.json({ success: false, error: 'candidato_id obrigatório' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { data: c, error: fetchErr } = await supabase
      .from('candidatos')
      .select('*')
      .eq('id', candidato_id)
      .single()

    if (fetchErr || !c) {
      return NextResponse.json({ success: false, error: 'Candidato não encontrado' }, { status: 404 })
    }

    // ── Branch caixa ─────────────────────────────────────────────────────────
    if (c.cargo === 'caixa') {
      // Gatilhos de bloqueio (server-side) — força máximo "Banco de talentos"
      const gatilhoCaixa = [
        c.facilidade_calculos && /não|nao/i.test(String(c.facilidade_calculos)),
        c.disponibilidade_horario === 'Manhã-tarde' || c.disponibilidade_horario === 'Tarde-noite',
      ].some(Boolean)

      const promptCaixa = `Você é especialista em recrutamento de operadores de caixa para varejo da empresa SELETO.

CANDIDATO: ${val(c.nome)}
Cargo pretendido: Operador de Caixa
Idade: ${val(c.idade)}
Escolaridade: ${val(c.escolaridade)}
Pretensão salarial: ${val(c.pretensao_salarial)}

=== EXPERIÊNCIA COM CAIXA ===
Já operou caixa: ${val(c.operou_caixa)}
Facilidade com cálculos: ${val(c.facilidade_calculos)}
Experiência com troco: ${val(c.experiencia_troco)}
Descrição da experiência: ${val(c.descricao_experiencia_caixa)}

=== DISPONIBILIDADE ===
Disponibilidade de horário: ${val(c.disponibilidade_horario)}
Disponibilidade para mudança: ${val(c.disponibilidade_mudanca)}
Conduções (ida): ${val(c.conducoes_ida)}
Conduções (volta): ${val(c.conducoes_volta)}

${gatilhoCaixa ? 'ATENÇÃO: Um ou mais gatilhos de bloqueio foram detectados. A recomendação NUNCA pode ser "Chamar para entrevista" — use "Banco de talentos" como máximo.' : ''}

## PERFIL DESEJADO PELA SELETO
Operador de caixa ideal: experiência comprovada em operação de caixa, facilidade com cálculos e troco, disponibilidade integral de horário (incluindo fins de semana e feriados), postura organizada e responsável.

## TIPOS DE PERFIL
- "Operador Experiente": já operou caixa com desenvoltura, domina cálculos e troco, disponibilidade ampla
- "Operador Iniciante": sem experiência direta mas com facilidade com cálculos, boa disposição e disponibilidade
- "Perfil Incompatível": dificuldade com cálculos, indisponibilidade de horário relevante ou sem nenhuma aptidão para a função

Responda APENAS em JSON válido, sem markdown:
{
  "tipo_perfil": "Operador Experiente" | "Operador Iniciante" | "Perfil Incompatível",
  "resumo": "2-3 linhas objetivas sobre o perfil do candidato para operador de caixa",
  "pontos_fortes": ["ponto 1", "ponto 2"],
  "pontos_atencao": ["ponto 1", "ponto 2"],
  "recomendacao": "Chamar para entrevista" | "Banco de talentos" | "Não recomendado",
  "justificativa_recomendacao": "2 linhas justificando a recomendação com base nos dados e experiência declarada"
}`.trim()

      const msgCaixa = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: promptCaixa }],
      })

      const rawC = msgCaixa.content[0].type === 'text' ? msgCaixa.content[0].text : ''
      let parsedC: {
        tipo_perfil?: string
        resumo?: string
        pontos_fortes?: string[]
        pontos_atencao?: string[]
        recomendacao?: 'Chamar para entrevista' | 'Banco de talentos' | 'Não recomendado'
        justificativa_recomendacao?: string
      } = {}
      try {
        parsedC = JSON.parse(rawC)
      } catch {
        const match = rawC.match(/\{[\s\S]*\}/)
        if (match) { try { parsedC = JSON.parse(match[0]) } catch { /* ignora */ } }
      }

      // Forçar bloqueio se gatilho ativo
      if (gatilhoCaixa && parsedC.recomendacao === 'Chamar para entrevista') {
        parsedC.recomendacao = 'Banco de talentos'
      }

      await supabase.from('candidatos').update({
        ia_tipo_perfil:    parsedC.tipo_perfil ?? null,
        ia_resumo:         parsedC.resumo ?? null,
        ia_pontos_fortes:  parsedC.pontos_fortes ?? null,
        ia_pontos_atencao: parsedC.pontos_atencao ?? null,
        ia_recomendacao:   parsedC.recomendacao ?? null,
        ia_justificativa:  parsedC.justificativa_recomendacao ?? null,
        ia_analisado_em:   new Date().toISOString(),
      }).eq('id', candidato_id)

      if (parsedC.recomendacao === 'Não recomendado') {
        await supabase.from('candidatos').update({ status: 'REPROVADO', motivo_reprovacao: 'Perfil incompatível com o cargo' }).eq('id', candidato_id)
      } else if (parsedC.recomendacao === 'Banco de talentos') {
        await supabase.from('candidatos').update({ status: 'BANCO_TALENTOS' }).eq('id', candidato_id)
      }

      return NextResponse.json({ success: true })
    }

    // ── Branch vendedor v3 ───────────────────────────────────────────────────
    if (c.cargo === 'vendedor') {
      const quiz = c.quiz_vendedor_v3 as {
        versao?: string
        mix_pct?: { N: number; R: number; E: number; L: number }
        objetivas?: { tipo_saida?: string; tempo_ultimo_emprego?: string }
        respostas?: Record<string, { perfil: string | null; resposta: string; peso: number; grupo: string }>
      } | null

      const respostasValidas = Object.entries(quiz?.respostas ?? {}).filter(([, v]) => v.perfil !== null)

      // Guard: quiz ausente ou incompleto — salva sem chamar a IA
      if (!quiz || respostasValidas.length < 14) {
        await supabase.from('candidatos').update({
          ia_recomendacao:  'Avaliar com atenção',
          ia_resumo:        'Quiz v3 não completado ou ausente. Avaliação manual necessária.',
          ia_tipo_perfil:   null,
          ia_pontos_fortes: null,
          ia_pontos_atencao: null,
          ia_justificativa: 'Quiz incompleto — não há dados suficientes para análise automatizada.',
          ia_analisado_em:  new Date().toISOString(),
        }).eq('id', candidato_id)
        return NextResponse.json({ success: true })
      }

      const mixPct = quiz.mix_pct ?? { N: 0, R: 0, E: 0, L: 0 }
      const linhasRespostas = respostasValidas
        .map(([k, v]) => `  [${v.perfil}] ${k}: "${v.resposta}"`)
        .join('\n')

      const promptVendedor = `Você é um analista de recrutamento especializado em vendas no varejo de moda.
Analise o candidato abaixo com base EXCLUSIVAMENTE nos dados do quiz comportamental v3.

CANDIDATO: ${val(c.nome)} — ${val(c.cidade)}/${val(c.bairro)}
Tentativas anteriores: ${(c.historico_tentativas as unknown[])?.length ?? 0}

SCORE E PERFIL (calculados pelo sistema, não recalcule):
- Score final: ${val(c.score_final)} / 100 → Faixa ${val(c.perfil)}
- Perfil dominante: ${val(c.perfil_vendedor)}
- Distribuição: N=${mixPct.N}% · R=${mixPct.R}% · E=${mixPct.E}% · L=${mixPct.L}%

RESPOSTAS DO QUIZ (16 comportamentais — [PERFIL] pergunta: "resposta escolhida"):
${linhasRespostas}

CONTEXTO LOGÍSTICO (não conta para perfil comportamental):
- Motivo de saída: "${quiz.objetivas?.tipo_saida ?? 'Não informado'}"
- Tempo no último emprego: "${quiz.objetivas?.tempo_ultimo_emprego ?? 'Não informado'}"

INSTRUÇÕES:
1. Interprete o perfil dominante (${val(c.perfil_vendedor)}) à luz das respostas concretas — cite a chave da resposta como evidência
2. Identifique até 3 pontos fortes COM citação da chave de resposta específica
3. Identifique até 2 pontos de atenção COM citação da chave de resposta específica
4. Avalie coerência interna: as respostas são consistentes com o perfil calculado?
5. Não contradiga o score (${val(c.score_final)}) sem evidência nas respostas
6. "tipo_saida" e "tempo_ultimo_emprego" são logísticos — não inferir perfil a partir deles

SAÍDA OBRIGATÓRIA (JSON puro, sem markdown, sem explicação fora do JSON):
{
  "recomendacao": "Recomendado" | "Avaliar com atenção" | "Não recomendado",
  "tipo_perfil": "descrição do perfil em 1 frase",
  "resumo": "2-3 frases para o recrutador",
  "pontos_fortes": ["ponto com evidência (chave da resposta)", "ponto 2", "ponto 3"],
  "pontos_atencao": ["ponto com evidência (chave da resposta)", "ponto 2"],
  "justificativa": "1-2 frases justificando a recomendação"
}

CRITÉRIOS DE RECOMENDAÇÃO:
- "Recomendado": score ≥ 65 E coerência interna alta entre respostas e perfil
- "Avaliar com atenção": score 50-64 OU coerência moderada OU interpretação ambígua
- "Não recomendado": score < 50 E padrão de respostas sugere desalinhamento com varejo de moda
- Em caso de dúvida entre "Não recomendado" e "Avaliar com atenção", prefira "Avaliar com atenção"`.trim()

      const msgVendedor = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: promptVendedor }],
      })

      const rawV = msgVendedor.content[0].type === 'text' ? msgVendedor.content[0].text : ''
      let parsedV: {
        recomendacao?: 'Recomendado' | 'Avaliar com atenção' | 'Não recomendado'
        tipo_perfil?: string
        resumo?: string
        pontos_fortes?: string[]
        pontos_atencao?: string[]
        justificativa?: string
      } = {}
      try {
        parsedV = JSON.parse(rawV)
      } catch {
        const match = rawV.match(/\{[\s\S]*\}/)
        if (match) { try { parsedV = JSON.parse(match[0]) } catch { /* ignora */ } }
      }

      await supabase.from('candidatos').update({
        ia_recomendacao:   parsedV.recomendacao ?? null,
        ia_tipo_perfil:    parsedV.tipo_perfil ?? null,
        ia_resumo:         parsedV.resumo ?? null,
        ia_pontos_fortes:  parsedV.pontos_fortes ?? null,
        ia_pontos_atencao: parsedV.pontos_atencao ?? null,
        ia_justificativa:  parsedV.justificativa ?? null,
        ia_analisado_em:   new Date().toISOString(),
      }).eq('id', candidato_id)

      // Vendedor v3: IA orienta, decisão de status é sempre manual do recrutador.

      return NextResponse.json({ success: true })
    }
    // ── Branch gerente (fluxo original) ──────────────────────────────────────

    // helper: usa campo aberto se preenchido, senão usa _opcao como fallback
    const valOpcao = (aberto: unknown, opcao: unknown): string => {
      const a = String(aberto ?? '').trim()
      const o = String(opcao ?? '').trim()
      if (a) return a
      if (o) return `[opção selecionada: ${o}]`
      return 'Não informado'
    }

    const prompt = `
CANDIDATO: ${val(c.nome)}
Score automático: ${val(c.score_final)} | Perfil calculado: ${val(c.perfil)}
Alertas: ${val(c.alertas)}

IMPORTANTE: Campos marcados com "[opção selecionada: ...]" representam a escolha múltipla feita pelo candidato quando o campo aberto não foi preenchido. Trate essas opções como respostas válidas e equivalentes ao texto livre — NÃO penalize o candidato por isso.

=== DADOS PESSOAIS ===
Idade: ${val(c.idade)}
Escolaridade: ${val(c.escolaridade)}
Veículo: ${val(c.veiculo)} | CNH: ${val(c.cnh)}
Pretensão salarial: ${val(c.pretensao_salarial)}
Disponibilidade de horário: ${val(c.disponibilidade_horario)}
Disponibilidade para mudança: ${val(c.disponibilidade_mudanca)}
Tempo de deslocamento: ${val(c.tempo_deslocamento)} | Conduções: ${val(c.qtd_passagens)}
Unidades de interesse: ${val(c.unidades)}

=== HISTÓRICO PROFISSIONAL ===
Trabalhando atualmente: ${val(c.trabalhando_atualmente)}
Empresa atual: ${val(c.empresa_atual)} | Cargo: ${val(c.cargo_atual)} | Tempo: ${val(c.tempo_empresa_atual)}
Ramo da empresa (informado pelo candidato): ${val(c.ramo_empresa_atual || c.ramo_ultima_empresa)}
Motivo da busca: ${val(c.motivo_busca)}
Última empresa: ${val(c.ultima_empresa)} | Cargo: ${val(c.ultimo_cargo)} | Tempo: ${val(c.tempo_ultima_empresa)}
Motivo de saída: ${val(c.motivo_saida)}
Últimas 3 experiências: ${val(c.ultimas_experiencias)}
Confortável com cobrança por metas: ${val(c.confortavel_cobranca_meta)}
Preferência salarial: ${val(c.preferencia_salarial)}
O que incomoda em liderança: ${valOpcao(c.incomodo_lideranca, c.incomodo_lideranca_opcao)}

=== RESULTADO COMERCIAL ===
O que motiva em vender: ${valOpcao(c.gosta_vender, c.gosta_vender_opcao)}
Maior meta atingida: ${val(c.maior_meta)}
Maior % de meta: ${val(c.maior_percentual_meta)}
Valor do maior resultado comercial: ${val(c.maior_resultado_valor)}
Maior resultado concreto: ${val(c.maior_resultado)}
Ferramentas comerciais: ${val(c.ferramentas_comerciais)}
Reação abaixo da meta: ${valOpcao(c.reacao_abaixo_meta, c.reacao_abaixo_meta_opcao)}
O que diferencia quem entrega resultado: ${valOpcao(c.prejudica_resultado, c.prejudica_resultado_opcao)}
Maior diferencial como gestor: ${valOpcao(c.diferencial_vendas, c.diferencial_vendas_opcao)}

=== LIDERANÇA ===
Já liderou: ${val(c.ja_liderou)} | Quantas pessoas: ${val(c.qtd_liderados)}
Como age com baixo resultado: ${val(c.reacao_baixo_resultado)}
Ações de liderança já realizadas: ${val(c.acoes_lideranca)}
Por que pronto sem experiência: ${val(c.motivo_lideranca_sem_experiencia)}
O que diferencia gerente forte: ${valOpcao(c.diferenca_gerente_forte, c.diferenca_gerente_forte_opcao)}
O que mais prejudica uma equipe: ${valOpcao(c.prejudica_equipe, c.prejudica_equipe_opcao)}

=== PERFIL COMPORTAMENTAL ===
O que faz profissional parar de crescer: ${val(c.para_de_crescer)}
Ambiente de trabalho preferido: ${val(c.ambiente_trabalho)}
Característica principal: ${valOpcao(c.caracteristica_principal, c.caracteristica_principal_opcao)}
O que incomoda na equipe: ${valOpcao(c.incomodo_equipe, c.incomodo_equipe_opcao)}
O que faz perder motivação: ${valOpcao(c.perde_motivacao, c.perde_motivacao_opcao)}
Significado de comprometimento: ${valOpcao(c.significado_comprometimento, c.significado_comprometimento_opcao)}
Peso do crescimento profissional: ${val(c.peso_crescimento)}
O que faz para evoluir: ${val(c.evolucao_profissional)}
Objetivo em 5 anos: ${val(c.objetivo_5_anos)}
Intenso vs tóxico: ${valOpcao(c.intenso_vs_toxico, c.intenso_vs_toxico_opcao)}

=== CULTURA SELETO ===
Confortável com cobrança constante: ${val(c.confortavel_cobranca_constante)}
Como se sente sendo cobrado por metas: ${val(c.confortavel_cobranca_meta)}
Visão sobre acompanhamento de meta: ${valOpcao(c.visao_acompanhamento_meta, c.visao_acompanhamento_meta_opcao)}
Gerente deve participar das vendas: ${val(c.gerente_participa_vendas)}
Ferramentas já utilizadas: ${val(c.ferramentas_utilizadas)}
Como age em movimento fraco: ${valOpcao(c.acao_movimento_fraco, c.acao_movimento_fraco_opcao)}
Confortável em: ${val(c.confortavel_operacao)}
O que faz permanecer na empresa: ${val(c.permanencia_empresa)}

=== SITUAÇÕES PRÁTICAS ===
Faltam 5 dias para fechar meta: ${val(c.case_meta_5dias)}
Vendedor vende muito mas gera problema: ${val(c.case_vendedor_problema)}
Equipe acomodada: ${val(c.case_equipe_acomodada)}
Funcionário atrasado mas produtivo: ${val(c.case_funcionario_atrasado)}
Assumiu loja desorganizada: ${val(c.case_loja_desorganizada)}
Prioridade nos primeiros 30 dias: ${val(c.prioridade_30dias)}
`.trim()

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: `Você é um especialista em recrutamento para gerentes de loja de varejo da empresa SELETO. Analise o perfil deste candidato com rigor e objetividade.

## PERFIL DESEJADO PELA SELETO
A SELETO busca gerentes com perfil comercial agressivo:
- Experiência comprovada em varejo, vendas ou gestão comercial
- Histórico de liderança com cobrança de metas
- Números concretos de resultados (%, R$, volume)
- Tolerância a cobrança diária e ambiente de alta pressão
- Ambição clara com plano de carreira articulado
- Preferência por remuneração variável agressiva

## REGRAS DE ANÁLISE — SIGA RIGOROSAMENTE

### Campos "[opção selecionada]" — regra obrigatória
Sempre que um campo mostrar "[opção selecionada: ...]", significa que o candidato escolheu essa opção em múltipla escolha mas não desenvolveu por escrito. Trate a opção como resposta válida e equivalente ao texto livre. NÃO penalize ausência de texto quando a opção está preenchida.

### Ramo de atuação — regra obrigatória
IMPORTANTE: O ramo da empresa foi informado diretamente pelo candidato no campo "Ramo da empresa". NUNCA deduza o segmento pelo nome da empresa — use APENAS o ramo informado nesse campo. Avalie a experiência comercial com base nesse ramo e julgue a compatibilidade com varejo de moda/acessórios da SELETO.

### Cruzamento obrigatório
Você DEVE cruzar o ramo informado pelo candidato e o cargo declarado com as respostas sobre vendas e liderança. Se o ramo indicado for TI, saúde, educação ou qualquer área não-comercial, os números que ele cita sobre vendas e metas devem ser tratados com ceticismo — especialmente se não há como comprovar experiência em varejo físico.

### Penalidades automáticas na recomendação
Se você identificar QUALQUER UM dos itens abaixo, a recomendação NUNCA pode ser "Chamar para entrevista":
- Histórico profissional em área incompatível com varejo/vendas (ex: TI, saúde, jurídico, educação) sem transição explicada
- Respostas com números que contradizem o cargo declarado (ex: Analista de TI citando metas de vendas de R$1,2mi)
- Preferência explícita por fixo maior sem variável — desalinhado com cultura SELETO de performance
- Ausência total de experiência com liderança de equipes
- Respostas genéricas nos cases práticos (menos de 2 cases com detalhes reais)

Nesses casos a recomendação deve ser "Banco de talentos" ou "Não recomendado", dependendo da gravidade.

### Matriz de recomendação — use exatamente esta lógica
"Chamar para entrevista" — SOMENTE se: histórico profissional compatível com varejo ou vendas E pelo menos 1 número concreto comprovável de resultado E sem incoerências graves entre cargo e respostas E sem desalinhamento crítico com cultura SELETO.
"Banco de talentos" — quando: tem potencial mas falta experiência comprovada em varejo OU 1 incoerência grave identificada OU desalinhamento parcial com cultura.
"Não recomendado" — quando: histórico completamente incompatível com a vaga E múltiplas incoerências graves OU perfil claramente avesso à cobrança e pressão.

### Sobre os pontos de atenção
Cada ponto de atenção que você listar DEVE influenciar a recomendação. Não liste um ponto de atenção grave e depois recomende entrevista — isso é contraditório e invalida a análise.

## FORMATO DE RESPOSTA
Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON:
{
  "tipo_perfil": "Gerente Comercial" | "Gerente Operacional" | "Gerente de Pessoas" | "Perfil Misto" | "Perfil Incompatível",
  "resumo": "3-4 linhas objetivas sobre o perfil, incluindo área de atuação real",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_atencao": ["ponto 1", "ponto 2"],
  "recomendacao": "Chamar para entrevista" | "Banco de talentos" | "Não recomendado",
  "justificativa_recomendacao": "2-3 linhas explicando a recomendação com base no cruzamento entre histórico real e respostas fornecidas"
}`,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: {
      tipo_perfil?: 'Gerente Comercial' | 'Gerente Operacional' | 'Gerente de Pessoas' | 'Perfil Misto' | 'Perfil Incompatível'
      resumo?: string
      pontos_fortes?: string[]
      pontos_atencao?: string[]
      recomendacao?: 'Chamar para entrevista' | 'Banco de talentos' | 'Não recomendado'
      justificativa_recomendacao?: string
    } = {}

    try {
      parsed = JSON.parse(raw)
    } catch {
      // Tenta extrair JSON de dentro do texto caso o modelo tenha incluído markdown
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch { /* ignora */ }
      }
    }

    const { error: updateErr } = await supabase
      .from('candidatos')
      .update({
        ia_tipo_perfil:   parsed.tipo_perfil ?? null,
        ia_resumo:        parsed.resumo ?? null,
        ia_pontos_fortes: parsed.pontos_fortes ?? null,
        ia_pontos_atencao: parsed.pontos_atencao ?? null,
        ia_recomendacao:  parsed.recomendacao ?? null,
        ia_justificativa: parsed.justificativa_recomendacao ?? null,
        ia_analisado_em:  new Date().toISOString(),
      })
      .eq('id', candidato_id)

    if (updateErr) {
      console.error('Erro ao salvar análise IA:', updateErr)
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })
    }

    if (parsed.recomendacao === 'Não recomendado') {
      await supabase.from('candidatos').update({ status: 'REPROVADO', motivo_reprovacao: 'Perfil incompatível com o cargo' }).eq('id', candidato_id)
    } else if (parsed.recomendacao === 'Banco de talentos') {
      await supabase.from('candidatos').update({ status: 'BANCO_TALENTOS' }).eq('id', candidato_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Erro no route /api/analisar-candidato:', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
