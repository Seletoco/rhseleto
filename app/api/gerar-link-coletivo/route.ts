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
    if (!isMaster) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json() as { rotulo?: string }
    if (!body.rotulo?.trim()) {
      return NextResponse.json({ error: 'rotulo required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // 1. Cria o link coletivo
    const { data: link, error: linkError } = await supabase
      .from('links_avaliacao')
      .insert({ rotulo: body.rotulo.trim() })
      .select('id, token')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: linkError?.message ?? 'Erro ao criar link' }, { status: 500 })
    }

    // 2. Snapshot: somente colaboradores com estado = 'ATIVO'
    // TREINAMENTO excluído — só entra no coletivo quem já tem vivência
    const { data: colaboradores, error: colabError } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('estado', 'ATIVO')

    if (colabError) {
      return NextResponse.json({ error: colabError.message }, { status: 500 })
    }

    // 3. Insere esperados em lote
    if (colaboradores && colaboradores.length > 0) {
      const esperados = colaboradores.map((c) => ({
        link_coletivo_id: link.id,
        colaborador_id: c.id,
      }))
      const { error: snapError } = await supabase
        .from('links_avaliacao_esperados')
        .insert(esperados)

      if (snapError) {
        return NextResponse.json({ error: snapError.message }, { status: 500 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://seleto-two.vercel.app'
    return NextResponse.json({
      ok: true,
      id: link.id,
      token: link.token,
      total_esperados: colaboradores?.length ?? 0,
      link: `${baseUrl}/avaliacao-coletiva/${link.token}`,
    })
  } catch (err) {
    console.error('gerar-link-coletivo error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
