import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const STATUS_AVANCADOS = ['PROVA_FEITA', 'BANCO_TALENTOS', 'ENTREVISTA_AGENDADA', 'APROVADO']

const RESET_EXPIRADO = {
  status: 'EM_ANDAMENTO',
  etapa_atual: 1,
  expirado_em: null,
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
  ia_justificativa: null,
  ia_analisado_em: null,
  ia_recomendacao: null,
  link_etapa2: null,
  link_etapa2_usado: false,
  link_etapa2_criado_em: null,
  tempo_deslocamento: null,
  reprovado_em: null,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidato_id, ...campos } = body
    if (!candidato_id) return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Não sobrescrever status/etapa de candidatos já em etapa avançada
    const { data: atual } = await supabase
      .from('candidatos')
      .select('status, expirado_em')
      .eq('id', candidato_id)
      .single()

    // RESET primeiro, dados do formulário prevalecem por cima
    const camposFinais = atual?.expirado_em
      ? { ...RESET_EXPIRADO, ...campos }
      : { ...campos }

    if (!atual?.expirado_em && atual?.status && STATUS_AVANCADOS.includes(atual.status)) {
      delete camposFinais.status
      delete camposFinais.etapa_atual
    }

    await supabase.from('candidatos').update(camposFinais).eq('id', candidato_id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
