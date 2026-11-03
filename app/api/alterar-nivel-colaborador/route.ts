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

async function verificarMaster(request: NextRequest): Promise<{ ok: boolean; email: string | null }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, email: null }
  const token = authHeader.slice(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return { ok: false, email: null }

  const { data: perfil } = await supabaseAdmin()
    .from('perfis_usuario')
    .select('role')
    .eq('id', user.id)
    .single()

  return { ok: perfil?.role === 'master', email: user.email ?? null }
}

export async function POST(request: NextRequest) {
  try {
    const { ok } = await verificarMaster(request)
    if (!ok) {
      return NextResponse.json({ error: 'Acesso negado: apenas master pode alterar nível' }, { status: 403 })
    }

    const body = await request.json() as { colaborador_id?: string; nivel?: number }
    const { colaborador_id, nivel } = body

    if (!colaborador_id) {
      return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    }
    if (typeof nivel !== 'number' || !Number.isInteger(nivel) || nivel < 1) {
      return NextResponse.json({ error: 'nivel deve ser um inteiro >= 1' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('id', colaborador_id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('colaboradores')
      .update({ nivel })
      .eq('id', colaborador_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, nivel })
  } catch (err) {
    console.error('alterar-nivel-colaborador error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
