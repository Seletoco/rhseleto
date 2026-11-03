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

async function verificarMaster(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return false

  const { data: perfil } = await supabaseAdmin()
    .from('perfis_usuario')
    .select('role')
    .eq('id', user.id)
    .single()

  return perfil?.role === 'master'
}

export async function POST(request: NextRequest) {
  try {
    const isMaster = await verificarMaster(request)
    if (!isMaster) {
      return NextResponse.json({ error: 'Acesso negado: apenas master pode efetivar colaboradores' }, { status: 403 })
    }

    const { colaborador_id } = await request.json() as { colaborador_id?: string }
    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: colaborador } = await supabase
      .from('colaboradores')
      .select('id, estado')
      .eq('id', colaborador_id)
      .single()

    if (!colaborador) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    if (colaborador.estado !== 'TREINAMENTO') {
      return NextResponse.json({ error: 'Apenas colaboradores em TREINAMENTO podem ser efetivados' }, { status: 422 })
    }

    const hoje = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('colaboradores')
      .update({ estado: 'ATIVO', data_efetivacao: hoje })
      .eq('id', colaborador_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('efetivar-colaborador error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
