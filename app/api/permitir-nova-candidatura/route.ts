import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { candidato_id } = await request.json()
    if (!candidato_id) return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: candidato } = await supabase
      .from('candidatos')
      .select('status, score_final, perfil, motivo_reprovacao, cargo, ia_resumo, ia_recomendacao')
      .eq('id', candidato_id)
      .single()

    if (!candidato) return NextResponse.json({ error: 'candidato not found' }, { status: 404 })

    const snapshot = {
      data: new Date().toISOString(),
      status: candidato.status,
      score_final: candidato.score_final,
      perfil: candidato.perfil,
      motivo_reprovacao: candidato.motivo_reprovacao,
      cargo: candidato.cargo,
      ia_resumo: candidato.ia_resumo,
      ia_recomendacao: candidato.ia_recomendacao,
    }

    // Buscar historico_tentativas atual e tentativa_numero
    const { data: extra } = await supabase
      .from('candidatos')
      .select('historico_tentativas, tentativa_numero')
      .eq('id', candidato_id)
      .single()

    const tentativasAtuais: unknown[] = Array.isArray(extra?.historico_tentativas) ? extra.historico_tentativas : []
    const proximaTentativa = (extra?.tentativa_numero ?? 1) + 1

    const { error } = await supabase
      .from('candidatos')
      .update({
        status: 'EM_ANDAMENTO',
        etapa_atual: 1,
        motivo_reprovacao: null,
        motivo_reprovacao_categoria: null,
        motivo_reprovacao_obs: null,
        score_final: 0,
        perfil: null,
        perfil_gerente: null,
        perfil_vendedor: null,
        alertas: [],
        ia_logistica_aprovado: null,
        ia_logistica_observacao: null,
        ia_logistica_analisado_em: null,
        ia_tipo_perfil: null,
        ia_resumo: null,
        ia_pontos_fortes: null,
        ia_pontos_atencao: null,
        ia_recomendacao: null,
        ia_justificativa: null,
        ia_analisado_em: null,
        link_etapa2: null,
        link_etapa2_usado: false,
        link_etapa2_criado_em: null,
        tempo_deslocamento: null,
        reprovado_em: null,
        historico_anterior: snapshot,
        historico_tentativas: [...tentativasAtuais, snapshot],
        tentativa_numero: proximaTentativa,
      })
      .eq('id', candidato_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('permitir-nova-candidatura error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
