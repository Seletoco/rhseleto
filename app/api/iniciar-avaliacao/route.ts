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
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: candidato } = await supabase
      .from('candidatos')
      .select('id, link_etapa2_usado, cargo')
      .eq('link_etapa2', token)
      .single()

    if (!candidato) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (candidato.link_etapa2_usado) return NextResponse.json({ error: 'already_used' }, { status: 409 })
    if (candidato.cargo === 'caixa') return NextResponse.json({ error: 'caixa_sem_prova' }, { status: 403 })

    await supabase
      .from('candidatos')
      .update({
        status: 'EM_ANDAMENTO',
        etapa_atual: 2,
      })
      .eq('id', candidato.id)

    return NextResponse.json({ success: true, candidato_id: candidato.id })
  } catch (err) {
    console.error('iniciar-avaliacao error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
