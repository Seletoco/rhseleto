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

  return { userId: user.id, role: perfil.role as 'master' | 'gestor', unidade: perfil.unidade as string | null }
}

const RECOMENDACOES_VALIDAS = ['manter', 'promover', 'atencao']

export async function POST(request: NextRequest) {
  try {
    const usuario = await verificarUsuario(request)
    if (!usuario) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json() as {
      colaborador_id?: string
      periodo?: string
      autoavaliacao_id?: string
      cota_pct?: number
      desempenho_vendas?: number
      comportamento?: number
      pontos_fortes?: string
      pontos_desenvolver?: string
      recomendacao?: string
    }

    const { colaborador_id, periodo, autoavaliacao_id, recomendacao, ...campos } = body

    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!periodo?.trim()) return NextResponse.json({ error: 'periodo required' }, { status: 400 })
    if (recomendacao && !RECOMENDACOES_VALIDAS.includes(recomendacao)) {
      return NextResponse.json({ error: 'recomendacao inválida' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Gestor só avalia colaboradores da sua loja
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

    const { data: nova, error: insertError } = await supabase
      .from('avaliacoes_gestor')
      .insert({
        colaborador_id,
        periodo: periodo.trim(),
        autoavaliacao_id: autoavaliacao_id ?? null,
        gestor_user_id: usuario.userId,
        cota_pct: campos.cota_pct ?? null,
        desempenho_vendas: campos.desempenho_vendas ?? null,
        comportamento: campos.comportamento ?? null,
        pontos_fortes: campos.pontos_fortes ?? null,
        pontos_desenvolver: campos.pontos_desenvolver ?? null,
        recomendacao: recomendacao ?? null,
      })
      .select('id')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ ok: true, id: nova.id })
  } catch (err) {
    console.error('salvar-avaliacao-gestor error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
