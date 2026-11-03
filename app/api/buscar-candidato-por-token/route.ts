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
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ encontrado: false }, { status: 400 })

  const { data } = await supabaseAdmin()
    .from('candidatos')
    .select('id, nome, link_etapa2_usado')
    .eq('link_etapa2', token)
    .single()

  if (!data) return NextResponse.json({ encontrado: false })

  return NextResponse.json({
    encontrado: true,
    id: data.id,
    nome: data.nome,
    ja_usado: data.link_etapa2_usado ?? false,
  })
}
