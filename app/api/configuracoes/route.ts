import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  const chave = request.nextUrl.searchParams.get('chave')
  const chaves = request.nextUrl.searchParams.get('chaves')

  if (chaves) {
    const lista = chaves.split(',').map(c => c.trim()).filter(Boolean)
    const { data } = await supabaseAnon()
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', lista)
    return NextResponse.json(data ?? [])
  }

  if (!chave) return NextResponse.json({ error: 'chave required' }, { status: 400 })

  const { data, error } = await supabaseAnon()
    .from('configuracoes')
    .select('chave, valor')
    .eq('chave', chave)
    .single()

  if (error || !data) return NextResponse.json({ chave, valor: 'false' })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { chave, valor } = body
  if (!chave || valor === undefined) {
    return NextResponse.json({ error: 'chave and valor required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('configuracoes')
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
