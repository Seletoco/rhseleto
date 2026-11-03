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

// Rota pública — chamada pela página de autoavaliação (sem login)
// Retorna apenas id, nome, cargo — sem dados sensíveis
export async function GET(request: NextRequest) {
  const loja = request.nextUrl.searchParams.get('loja')
  if (!loja) return NextResponse.json({ error: 'loja required' }, { status: 400 })

  const { data, error } = await supabaseAdmin()
    .from('colaboradores')
    .select('id, nome, cargo')
    .eq('loja', loja)
    .in('estado', ['ATIVO', 'TREINAMENTO'])
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
