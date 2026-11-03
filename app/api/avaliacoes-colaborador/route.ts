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

async function verificarUsuario(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return null

  const { data: perfil } = await supabaseAdmin()
    .from('perfis_usuario')
    .select('role, unidade')
    .eq('id', user.id)
    .single()

  if (!perfil || !['master', 'gestor'].includes(perfil.role)) return null

  return { role: perfil.role as 'master' | 'gestor', unidade: perfil.unidade as string | null }
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await verificarUsuario(request)
    if (!usuario) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const colaborador_id = request.nextUrl.searchParams.get('colaborador_id')
    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Gestor só pode ver colaboradores da sua loja
    if (usuario.role === 'gestor') {
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('loja')
        .eq('id', colaborador_id)
        .single()

      if (!colab || colab.loja !== usuario.unidade) {
        return NextResponse.json({ error: 'Acesso negado: colaborador de outra loja' }, { status: 403 })
      }
    }

    const { data: autos, error: e1 } = await supabase
      .from('autoavaliacoes')
      .select('*')
      .eq('colaborador_id', colaborador_id)
      .order('criado_em', { ascending: false })

    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const { data: gestorAvals, error: e2 } = await supabase
      .from('avaliacoes_gestor')
      .select('*')
      .eq('colaborador_id', colaborador_id)
      .order('criado_em', { ascending: false })

    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    // D5 — CONFIDENCIALIDADE: remove texto_gestor se não é master
    // A barreira está aqui na API — o front nunca recebe o campo para gestor
    const autosFiltrados = (autos ?? []).map((a) => {
      if (usuario.role !== 'master') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { texto_gestor, ...semConfidencial } = a
        return semConfidencial
      }
      return a
    })

    return NextResponse.json({
      autoavaliacoes: autosFiltrados,
      avaliacoes_gestor: gestorAvals ?? [],
    })
  } catch (err) {
    console.error('avaliacoes-colaborador error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
