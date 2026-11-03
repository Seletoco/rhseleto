import { NextRequest, NextResponse, after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

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

const UNIT_ADDRESSES: Record<string, string> = {
  Taquara: 'Rua Bacairis, 248, Taquara, Rio de Janeiro, RJ',
  Aerotown: 'Av. Ayrton Senna, 2541, Barra da Tijuca, Rio de Janeiro, RJ',
  Americas: 'Av. das Américas, 15500, Recreio dos Bandeirantes, Rio de Janeiro, RJ',
  'Nova Iguaçu': 'Av. Abílio Augusto Távora, 1111, Nova Iguaçu, RJ',
}

async function calcularDrive(origem: string, destino: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { address: origem },
        destination: { address: destino },
        travelMode: 'DRIVE',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const durationStr: string | undefined = data.routes?.[0]?.duration
    if (!durationStr) return null
    return Math.round(parseInt(durationStr.replace('s', ''), 10) / 60)
  } catch {
    return null
  }
}

// Maps usado APENAS para tempo — não conta conduções
async function calcularTransit(origem: string, destino: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration',
      },
      body: JSON.stringify({
        origin: { address: origem },
        destination: { address: destino },
        travelMode: 'TRANSIT',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const durationStr: string | undefined = data.routes?.[0]?.duration
    if (!durationStr) return null
    return Math.round(parseInt(durationStr.replace('s', ''), 10) / 60)
  } catch {
    return null
  }
}

function formatarVT(conducoes: number, tarifaUnitaria: number): string {
  const vt = conducoes * tarifaUnitaria * 2 * 26
  return `R$ ${vt.toFixed(2).replace('.', ',')}/mês`
}

export async function POST(request: NextRequest) {
  try {
    const { candidato_id } = await request.json()
    if (!candidato_id) return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: candidato } = await supabase
      .from('candidatos')
      .select('endereco, unidades, veiculo, cnh, ia_logistica_analisado_em, tempo_deslocamento, ia_logistica_aprovado, turno_faculdade, pretensao_salarial, cargo, status, conducoes_ida, conducoes_volta, motivo_reprovacao, link_etapa2, score_final')
      .eq('id', candidato_id)
      .single()

    if (!candidato) return NextResponse.json({ error: 'candidato not found' }, { status: 404 })

    // Fetch tariffs from configuracoes
    const tarifas: Record<string, number> = {}
    try {
      const { data: cfgRows } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['tarifa_rio_de_janeiro', 'tarifa_nova_iguacu', 'tarifa_padrao', 'salario_max_gerente', 'salario_max_vendedor', 'salario_max_caixa'])
      for (const row of cfgRows ?? []) {
        tarifas[row.chave] = parseFloat(row.valor)
      }
    } catch {}

    const getTarifa = (unidade: string): number => {
      if (unidade === 'Nova Iguaçu') return tarifas['tarifa_nova_iguacu'] ?? 6.70
      return tarifas['tarifa_rio_de_janeiro'] ?? tarifas['tarifa_padrao'] ?? 5.00
    }

    // Cache — já analisado anteriormente
    // Exceção: se a reprovação anterior foi por conduções ou distância (regras removidas),
    // invalida o cache e roda a análise completa de novo
    const reprovadoPorRegrasAntigas =
      candidato.ia_logistica_aprovado === false &&
      (
        String(candidato.motivo_reprovacao ?? '').toLowerCase().includes('condução') ||
        String(candidato.motivo_reprovacao ?? '').toLowerCase().includes('conducoes') ||
        String(candidato.motivo_reprovacao ?? '').toLowerCase().includes('conduções') ||
        String(candidato.motivo_reprovacao ?? '').toLowerCase().includes('distância') ||
        String(candidato.motivo_reprovacao ?? '').toLowerCase().includes('inviável')
      )

    if (candidato.ia_logistica_analisado_em && candidato.tempo_deslocamento && !reprovadoPorRegrasAntigas) {
      return NextResponse.json({ success: true, cached: true })
    }

    // ── Conduções informadas pelo candidato (única fonte de verdade) ──────────
    const conducoesIdaNum = parseInt(candidato.conducoes_ida ?? '') || 0
    const conducoesVoltaNum = parseInt(candidato.conducoes_volta ?? '') || 0
    const conducoesInformadas = conducoesIdaNum >= 1 && conducoesVoltaNum >= 1
    const totalConducoes = conducoesIdaNum + conducoesVoltaNum
    // Para VT: usa o maior entre ida e volta (condução mais cara)
    const maxConducoesInformadas = conducoesInformadas ? Math.max(conducoesIdaNum, conducoesVoltaNum) : 0

    const STATUS_AVANCADOS = ['PROVA_FEITA', 'BANCO_TALENTOS', 'ENTREVISTA_AGENDADA', 'APROVADO']
    const statusJaAvancado = STATUS_AVANCADOS.includes(candidato.status ?? '')

    let aprovado = true
    let observacao = 'Análise automática indisponível — aprovado por padrão'
    let tempoDeslocamento = ''
    let usouMaps = false
    let vtMensalEstimado: string | null = null

    type LogisticaUnidade = {
      minutos_carro: number | null
      minutos_transit: number | null
      aprovada: boolean
      motivo_reprovacao?: string
      vt: string | null
    }
    const logisticaPorUnidade: Record<string, LogisticaUnidade> = {}

    // ── Google Maps (somente tempo de deslocamento) ───────────────────────────
    const unidades: string[] = Array.isArray(candidato.unidades) ? candidato.unidades : []
    const temVeiculo = candidato.veiculo && candidato.veiculo !== 'Não possuo'
    const origem = String(candidato.endereco || '') + ', Brasil'

    if (unidades.length > 0 && process.env.GOOGLE_MAPS_API_KEY && origem) {
      try {
        const unidadesValidas = unidades.filter((u) => UNIT_ADDRESSES[u])

        type UnidadeResult = {
          carro?: number | null
          transit?: number | null
        }
        const resultados: Record<string, UnidadeResult> = {}

        const promises = unidadesValidas.flatMap((unidade) => {
          const destino = UNIT_ADDRESSES[unidade]
          resultados[unidade] = {}
          const calls: Promise<void>[] = []

          if (temVeiculo) {
            calls.push(
              calcularDrive(origem, destino).then((mins) => {
                resultados[unidade].carro = mins
              }),
            )
          }

          calls.push(
            calcularTransit(origem, destino).then((mins) => {
              resultados[unidade].transit = mins
            }),
          )

          return calls
        })

        await Promise.allSettled(promises)

        const partes = unidadesValidas
          .map((unidade) => {
            const t = resultados[unidade]
            const desc: string[] = []

            const minutosCarro = t.carro !== undefined ? t.carro : null
            const minutosTransit = t.transit !== undefined ? t.transit : null

            if (minutosCarro !== null) desc.push(`${minutosCarro}min carro`)
            if (minutosTransit !== null) desc.push(`${minutosTransit}min TP`)

            // Viabilidade por unidade: somente tempo (≤ 90min)
            let aprovada: boolean
            let motivo_reprovacao: string | undefined
            if (temVeiculo) {
              if (minutosCarro !== null && minutosCarro <= 90) {
                aprovada = true
              } else {
                aprovada = false
                motivo_reprovacao = minutosCarro !== null
                  ? `${minutosCarro}min de carro — acima do limite de 90min`
                  : 'Tempo de carro não calculado'
              }
            } else {
              if (minutosTransit !== null && minutosTransit <= 90) {
                aprovada = true
              } else {
                aprovada = false
                motivo_reprovacao = minutosTransit !== null
                  ? `${minutosTransit}min de transporte público — acima do limite de 90min`
                  : 'Tempo de transporte não calculado'
              }
            }

            // VT por unidade: apenas se conduções informadas
            const vtUnidade = conducoesInformadas
              ? formatarVT(maxConducoesInformadas, getTarifa(unidade))
              : null

            logisticaPorUnidade[unidade] = {
              minutos_carro: temVeiculo ? minutosCarro : null,
              minutos_transit: minutosTransit,
              aprovada,
              ...(motivo_reprovacao ? { motivo_reprovacao } : {}),
              vt: vtUnidade,
            }

            return desc.length > 0 ? `${unidade}: ${desc.join(' | ')}` : null
          })
          .filter((p): p is string => p !== null)

        if (partes.length > 0) {
          // VT global: baseado na melhor unidade aprovada (menor tempo)
          if (conducoesInformadas) {
            const unidadesAprovadas = unidadesValidas.filter((u) => logisticaPorUnidade[u]?.aprovada)
            const candidatasVT = unidadesAprovadas.length > 0 ? unidadesAprovadas : unidadesValidas

            const melhorUnidade = candidatasVT.sort((a, b) => {
              const tA = temVeiculo
                ? (resultados[a]?.carro ?? Infinity)
                : (resultados[a]?.transit ?? Infinity)
              const tB = temVeiculo
                ? (resultados[b]?.carro ?? Infinity)
                : (resultados[b]?.transit ?? Infinity)
              return (tA as number) - (tB as number)
            })[0]

            if (melhorUnidade) {
              vtMensalEstimado = formatarVT(maxConducoesInformadas, getTarifa(melhorUnidade))
              partes.push(`VT estimado: ${vtMensalEstimado}`)
            }
          }

          tempoDeslocamento = partes.join(' | ')
          usouMaps = true
          // distância nunca reprova — só informa
        }
      } catch (mapsErr) {
        console.error('analisar-logistica maps error:', mapsErr)
      }
    }

    // ── Claude Haiku ──────────────────────────────────────────────────────────
    try {
      const prompt = usouMaps
        ? `Você é um analista de RH da SELETO. Com base nos tempos REAIS de deslocamento abaixo, forneça uma observação sobre a viabilidade logística do candidato.

TEMPOS REAIS DE DESLOCAMENTO (Google Maps):
${tempoDeslocamento}

VEÍCULO: ${val(candidato.veiculo)}
CNH: ${val(candidato.cnh)}

CRITÉRIOS (já calculados pelo sistema — apenas confirme com uma observação):
- O candidato é APROVADO se pelo menos UMA unidade for acessível dentro do tempo limite de 90 minutos (usando o modal correto para o veículo declarado)
- Para unidades fora do tempo, apenas desconsidere aquela unidade — não reprove o candidato por elas
- Informe quais unidades são viáveis e quais não são

Responda APENAS em JSON:
{
  "aprovado": true ou false,
  "observacao": "liste quais unidades são viáveis e quais não são, em 1-2 linhas"
}`
        : `Você é um analista de RH da empresa SELETO, rede de varejo com lojas no Rio de Janeiro. Analise se o candidato tem viabilidade logística para trabalhar na loja.

LOCALIZAÇÕES DAS LOJAS:
- Taquara: Bairro Taquara, Zona Oeste do Rio de Janeiro
- Aerotown: Recreio dos Bandeirantes, próximo ao Aeroporto de Jacarepaguá
- Americas: Barra da Tijuca, Zona Oeste
- Nova Iguaçu: Centro de Nova Iguaçu, Baixada Fluminense

DADOS DO CANDIDATO:
- Endereço: ${val(candidato.endereco)}
- Unidades de interesse: ${val(candidato.unidades)}
- Veículo: ${val(candidato.veiculo)}
- CNH: ${val(candidato.cnh)}

CRITÉRIOS DE REPROVAÇÃO:
- Tempo estimado acima de 90 minutos para TODAS as unidades de interesse

CRITÉRIOS DE APROVAÇÃO:
- Pelo menos 1 unidade de interesse acessível em até 90 minutos

Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON:
{
  "aprovado": true ou false,
  "tempo_estimado": "descrição do tempo estimado para cada unidade de interesse",
  "observacao": "explicação objetiva em 1-2 linhas da decisão"
}`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = message.content[0].type === 'text' ? message.content[0].text : ''

      let parsed: {
        aprovado?: boolean
        tempo_estimado?: string
        observacao?: string
      } = {}

      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          try { parsed = JSON.parse(match[0]) } catch { /* usa fallback */ }
        }
      }

      if (typeof parsed.aprovado === 'boolean') {
        // distância nunca reprova — aprovado permanece true independente da resposta da IA
        observacao = parsed.observacao ?? ''
        if (!usouMaps) {
          tempoDeslocamento = parsed.tempo_estimado ?? ''
        }
      }
    } catch (iaErr) {
      console.error('analisar-logistica IA error:', iaErr)
    }

    // Gerente: EM_ANDAMENTO + link para prova
    // Vendedor: score já calculado no formulário → PROVA_FEITA
    // Caixa: não tem prova → BANCO_TALENTOS
    const linkEtapa2 =
      aprovado && candidato.cargo === 'gerente'
        ? (candidato.link_etapa2 ?? crypto.randomUUID())
        : null
    const novoStatus = !aprovado
      ? 'REPROVADO'
      : candidato.cargo === 'gerente'
        ? 'EM_ANDAMENTO'
        : candidato.cargo === 'caixa'
          ? 'BANCO_TALENTOS'
          : 'PROVA_FEITA'  // vendedor

    const turnoObs = candidato.turno_faculdade
      ? `\n\nATENÇÃO: candidato com faculdade em andamento — turno: ${candidato.turno_faculdade}. Destacar no campo ia_logistica_observacao para avaliação na entrevista.`
      : ''

    let salarioObs = ''
    if (candidato.pretensao_salarial && candidato.cargo) {
      const chaveSalario = `salario_max_${candidato.cargo}`
      const tetoSalario = tarifas[chaveSalario]
      if (tetoSalario) {
        const pretensaoStr = String(candidato.pretensao_salarial)
        const pretensaoTokens = pretensaoStr.match(/\d+(?:[.,]\d+)*/g) ?? []
        const pretensaoVals = pretensaoTokens
          .map((t) => t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t.replace(/\./g, '')))
          .filter((n) => !isNaN(n) && n >= 100)
        const pretensaoNum = pretensaoVals.length > 0 ? Math.max(...pretensaoVals) : NaN
        if (!isNaN(pretensaoNum) && pretensaoNum > tetoSalario) {
          salarioObs = `\n\nALERTA SALARIAL: pretensão de R$ ${pretensaoNum.toFixed(2).replace('.', ',')} acima do teto configurado de R$ ${tetoSalario.toFixed(2).replace('.', ',')} para ${candidato.cargo}.`
        }
      }
    }

    await supabase
      .from('candidatos')
      .update({
        ia_logistica_aprovado: aprovado,
        ia_logistica_observacao: observacao + turnoObs + salarioObs,
        ia_logistica_analisado_em: new Date().toISOString(),
        // Candidato em etapa inicial: atualiza status, link e etapa normalmente
        ...(!statusJaAvancado && {
          link_etapa2: linkEtapa2,
          etapa_atual: 1,
          status: novoStatus,
        }),
        // Candidato já em etapa avançada: NUNCA sobrescrever status.
        // Mas se for gerente aprovado e ainda não tem link_etapa2, gerar/preservar
        // o link e avançar a etapa para 2, para que ele consiga acessar a prova.
        ...(statusJaAvancado && linkEtapa2 && !candidato.link_etapa2 && {
          link_etapa2: linkEtapa2,
          etapa_atual: 2,
        }),
        ...(tempoDeslocamento && { tempo_deslocamento: tempoDeslocamento }),
        // qtd_passagens: usa conduções informadas; se não informadas, limpa o campo
        qtd_passagens: conducoesInformadas ? String(totalConducoes) : null,
        ...(vtMensalEstimado && { vt_mensal_estimado: vtMensalEstimado }),
        ...(Object.keys(logisticaPorUnidade).length > 0 && { logistica_por_unidade: logisticaPorUnidade }),
      })
      .eq('id', candidato_id)

    // ── Trigger análise IA de candidato caixa após aprovação logística ────────
    if (aprovado && candidato.cargo === 'caixa') {
      const origin = request.nextUrl.origin
      after(async () => {
        try {
          await fetch(`${origin}/api/analisar-candidato`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidato_id }),
          })
        } catch (e) {
          console.error('Erro ao analisar candidato caixa após logística:', e)
        }
      })
    }

    return NextResponse.json({ success: true, aprovado })
  } catch (err) {
    console.error('analisar-logistica error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
