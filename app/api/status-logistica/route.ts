import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data } = await supabaseAdmin()
    .from('candidatos')
    .select('ia_logistica_analisado_em, ia_logistica_aprovado, link_etapa2')
    .eq('id', id)
    .single()

  if (!data) {
    return NextResponse.json({ analisado: false, aprovado: null, link_etapa2: null })
  }

  return NextResponse.json({
    analisado: data.ia_logistica_analisado_em !== null,
    aprovado: data.ia_logistica_aprovado ?? null,
    link_etapa2: data.link_etapa2 ?? null,
  })
}
