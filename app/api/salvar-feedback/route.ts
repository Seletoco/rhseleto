import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: NextRequest) {
  try {
    const { candidato_id, feedback } = await request.json()
    if (!candidato_id || !feedback) {
      return NextResponse.json({ error: 'candidato_id and feedback required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    await supabase
      .from('candidatos')
      .update({ feedback_candidato: feedback })
      .eq('id', candidato_id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
