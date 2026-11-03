import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  // CRON_SECRET obrigatório — falha explícita se não configurado
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[expirar-candidatos] CRON_SECRET não configurado')
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const agora = new Date()
  const limite90  = new Date(agora.getTime() -  90 * 24 * 60 * 60 * 1000)
  const limite180 = new Date(agora.getTime() - 180 * 24 * 60 * 60 * 1000)

  // Buscar todos os candidatos expiráveis:
  // - Banco de Talentos: 180 dias
  // - Demais status (exceto APROVADO): 90 dias
  const { data: candidatos, error } = await supabase
    .from('candidatos')
    .select('id, status, score_final, perfil, cargo, motivo_reprovacao, ia_resumo, ia_recomendacao, historico_tentativas, tentativa_numero')
    .is('expirado_em', null)
    .neq('status', 'APROVADO')
    .or(
      `and(status.eq.BANCO_TALENTOS,criado_em.lt.${limite180.toISOString()}),` +
      `and(status.neq.BANCO_TALENTOS,criado_em.lt.${limite90.toISOString()})`
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!candidatos || candidatos.length === 0) {
    return NextResponse.json({ expirados: 0 })
  }

  let expirados = 0

  for (const c of candidatos) {
    const tentativasAtuais: unknown[] = Array.isArray(c.historico_tentativas) ? c.historico_tentativas : []
    const snapshot = {
      data: agora.toISOString(),
      status: c.status,
      score_final: c.score_final ?? null,
      perfil: c.perfil ?? null,
      cargo: c.cargo ?? null,
      motivo_reprovacao: c.motivo_reprovacao ?? 'Expirado por tempo (90 dias)',
      ia_resumo: c.ia_resumo ?? null,
      ia_recomendacao: c.ia_recomendacao ?? null,
    }

    const { error: updateErr } = await supabase
      .from('candidatos')
      .update({
        expirado_em: agora.toISOString(),
        historico_tentativas: [...tentativasAtuais, snapshot],
        tentativa_numero: (c.tentativa_numero ?? 1) + 1,
      })
      .eq('id', c.id)

    if (!updateErr) expirados++
  }

  console.log(`[expirar-candidatos] ${expirados}/${candidatos.length} candidatos expirados em ${agora.toISOString()}`)
  return NextResponse.json({ expirados, total_encontrados: candidatos.length })
}
