import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const {
      candidato_id,
      entrevista_data,
      entrevista_hora,
      entrevista_modalidade,
      entrevista_local,
      entrevista_gestor,
      entrevista_email_unidade,
      entrevista_tipo,
    } = body

    if (!candidato_id) {
      return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { error } = await supabase
      .from('candidatos')
      .update({
        entrevista_data,
        entrevista_hora,
        entrevista_modalidade,
        entrevista_local,
        entrevista_gestor,
        entrevista_email_unidade,
        entrevista_tipo,
        entrevista_resultado: 'Aguardando',
        entrevista_agendada_em: new Date().toISOString(),
        status: 'ENTREVISTA_AGENDADA',
        etapa_atual: 3,
      })
      .eq('id', candidato_id)

    if (error) {
      console.error('agendar-entrevista error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('agendar-entrevista error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
