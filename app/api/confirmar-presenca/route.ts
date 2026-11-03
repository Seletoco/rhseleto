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
    const { candidato_id, confirmou } = await request.json()

    if (!candidato_id || typeof confirmou !== 'boolean') {
      return NextResponse.json({ error: 'candidato_id e confirmou são obrigatórios' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    if (confirmou) {
      const { error } = await supabase
        .from('candidatos')
        .update({ entrevista_confirmada: true })
        .eq('id', candidato_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('candidatos')
        .update({ status: 'REPROVADO', entrevista_confirmada: false })
        .eq('id', candidato_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('confirmar-presenca error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
