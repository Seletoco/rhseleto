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

// GET /api/respondidos-periodo?periodo=Julho+2026
// Retorna todos os colaboradores que já têm autoavaliacao respondida
// para o período informado — independente de ter vindo de link coletivo
// ou individual. Usado para o badge "✓ Respondeu" na tabela Por Colaborador.
export async function GET(request: NextRequest) {
  try {
    const usuario = await verificarUsuario(request)
    if (!usuario) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const periodo = request.nextUrl.searchParams.get('periodo')
    if (!periodo) return NextResponse.json({ error: 'periodo required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Busca todas as autoavaliacoes respondidas do período,
    // com join em colaboradores para filtrar por loja se gestor
    const { data, error } = await supabase
      .from('autoavaliacoes')
      .select('colaborador_id, respondido_em, colaboradores(loja)')
      .eq('periodo', periodo)
      .not('respondido_em', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const resultado = (data ?? [])
      .filter((row) => {
        // Gestor vê só sua loja
        if (usuario.role === 'gestor') {
          const loja = (row.colaboradores as unknown as { loja: string } | null)?.loja
          return loja === usuario.unidade
        }
        return true
      })
      .map((row) => ({
        colaborador_id: row.colaborador_id,
        respondido_em: row.respondido_em as string,
      }))

    return NextResponse.json(resultado)
  } catch (err) {
    console.error('respondidos-periodo error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
