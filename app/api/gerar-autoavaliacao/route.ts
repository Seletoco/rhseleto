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

async function verificarUsuario(request: NextRequest): Promise<{
  ok: boolean; role: 'master' | 'gestor' | null; unidade: string | null
}> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, role: null, unidade: null }
  const token = authHeader.slice(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return { ok: false, role: null, unidade: null }

  const { data: perfil } = await supabaseAdmin()
    .from('perfis_usuario')
    .select('role, unidade')
    .eq('id', user.id)
    .single()

  if (!perfil || !['master', 'gestor'].includes(perfil.role)) {
    return { ok: false, role: null, unidade: null }
  }

  return { ok: true, role: perfil.role as 'master' | 'gestor', unidade: perfil.unidade ?? null }
}

export async function POST(request: NextRequest) {
  try {
    const { ok, role, unidade } = await verificarUsuario(request)
    if (!ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json() as { colaborador_id?: string; periodo?: string }
    const { colaborador_id, periodo } = body

    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!periodo?.trim()) return NextResponse.json({ error: 'periodo required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: colab } = await supabase
      .from('colaboradores')
      .select('id, loja, estado')
      .eq('id', colaborador_id)
      .single()

    if (!colab) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    if (colab.estado === 'DESLIGADO') {
      return NextResponse.json({ error: 'Colaborador está desligado' }, { status: 422 })
    }
    if (role === 'gestor' && colab.loja !== unidade) {
      return NextResponse.json({ error: 'Acesso negado: colaborador de outra loja' }, { status: 403 })
    }

    const { data: nova, error: insertError } = await supabase
      .from('autoavaliacoes')
      .insert({ colaborador_id, periodo: periodo.trim() })
      .select('id, token')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://seleto-two.vercel.app'
    return NextResponse.json({
      ok: true,
      id: nova.id,
      token: nova.token,
      link: `${baseUrl}/avaliacao-mensal/${nova.token}`,
    })
  } catch (err) {
    console.error('gerar-autoavaliacao error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
