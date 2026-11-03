import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularScore } from '@/lib/score'
import type { DadosFormularioGerente } from '@/lib/types'

export const maxDuration = 30

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidato_id, ...campos } = body

    if (!candidato_id) return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: _candidatoRaw } = await supabase
      .from('candidatos')
      .select('nome, qtd_passagens, disponibilidade_horario, disponibilidade_mudanca, pretensao_salarial, ramo_empresa_atual, ramo_ultima_empresa')
      .eq('id', candidato_id)
      .single()

    const candidato = _candidatoRaw as {
      nome: string
      qtd_passagens: string | null
      disponibilidade_horario: string | null
      disponibilidade_mudanca: string | null
      pretensao_salarial: string | null
      ramo_empresa_atual: string | null
      ramo_ultima_empresa: string | null
    } | null

    if (!candidato) return NextResponse.json({ error: 'candidato not found' }, { status: 404 })

    // Verificar pretensão acima do teto configurado
    let pretensao_acima_teto = false
    try {
      const { data: cfgRow } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'salario_max_gerente')
        .single()
      if (cfgRow) {
        const teto = parseFloat(cfgRow.valor)
        const pretensaoStr = String(candidato.pretensao_salarial || '')
        const pretensaoTokens = pretensaoStr.match(/\d+(?:[.,]\d+)*/g) ?? []
        const pretensaoVals = pretensaoTokens
          .map(t => t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t.replace(/\./g, '')))
          .filter(n => !isNaN(n) && n >= 100)
        const pretensaoNum = pretensaoVals.length > 0 ? Math.max(...pretensaoVals) : NaN
        if (!isNaN(pretensaoNum) && !isNaN(teto) && pretensaoNum > teto) {
          pretensao_acima_teto = true
        }
      }
    } catch { /* ignora — pretensao_acima_teto permanece false */ }

    const dadosCompletos: DadosFormularioGerente = {
      nome: candidato.nome,
      qtd_passagens: candidato.qtd_passagens,
      disponibilidade_horario: candidato.disponibilidade_horario,
      disponibilidade_mudanca: candidato.disponibilidade_mudanca,
      ramo_empresa_atual: candidato.ramo_empresa_atual ?? undefined,
      ramo_ultima_empresa: candidato.ramo_ultima_empresa ?? undefined,
      pretensao_acima_teto,
      ...campos,
    }

    const resultado = calcularScore(dadosCompletos)

    // Todo candidato que termina a prova vai para PROVA_FEITA.
    // Reprovação é decisão exclusiva do recrutador na entrevista.
    const novoStatus = 'PROVA_FEITA'
    const motivoReprovacao: string | null = null

    await supabase
      .from('candidatos')
      .update({
        ...campos,
        etapa_atual: 2,
        link_etapa2_usado: true,
        status: novoStatus,
        ...(motivoReprovacao != null ? { motivo_reprovacao: motivoReprovacao } : {}),
        score_comercial: resultado.score_comercial,
        score_lideranca: resultado.score_lideranca,
        score_comprometimento: resultado.score_comprometimento,
        score_cultura: resultado.score_cultura,
        score_ambicao: resultado.score_ambicao,
        score_estabilidade: resultado.score_estabilidade,
        score_operacao: resultado.score_operacao,
        score_final: resultado.score_final,
        perfil: resultado.perfil,
        alertas: resultado.alertas.map(a => a.codigo),
        perfil_gerente: resultado.perfil_gerente ?? null,
      })
      .eq('id', candidato_id)

    const origin = request.nextUrl.origin
    after(async () => {
      try {
        await fetch(`${origin}/api/analisar-candidato`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id }),
        })
      } catch (e) {
        console.error('Erro ao analisar candidato:', e)
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('finalizar-avaliacao error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
