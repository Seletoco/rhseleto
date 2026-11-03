import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(request: NextRequest) {
  const cpf = request.nextUrl.searchParams.get('cpf')
  const cargo = request.nextUrl.searchParams.get('cargo')
  if (!cpf) return NextResponse.json({ error: 'cpf required' }, { status: 400 })

  const supabase = supabaseAdmin()
  // Primeiro: busca candidato ativo (não expirado)
  let query = supabase.from('candidatos').select('id, status').eq('cpf', cpf).is('expirado_em', null)
  if (cargo) query = query.eq('cargo', cargo)
  const { data } = await query.maybeSingle()

  if (!data) {
    // Verificar se existe um registro expirado com esse CPF
    let expQuery = supabase.from('candidatos').select('id').eq('cpf', cpf).not('expirado_em', 'is', null)
    if (cargo) expQuery = expQuery.eq('cargo', cargo)
    const { data: expirado } = await expQuery.maybeSingle()
    return NextResponse.json({ existe: false, expirado_id: expirado?.id ?? null })
  }
  return NextResponse.json({ existe: true, status: data.status, id: data.id })
}
