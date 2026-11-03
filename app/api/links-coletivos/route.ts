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

    const supabase = supabaseAdmin()

    // Busca todos os links coletivos
    const { data: links, error: linksError } = await supabase
      .from('links_avaliacao')
      .select('id, token, rotulo, criado_em, encerrado')
      .order('criado_em', { ascending: false })

    if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 })
    if (!links || links.length === 0) return NextResponse.json([])

    const linkIds = links.map((l) => l.id)
    const rotulos = links.map((l) => l.rotulo)

    // Conta esperados por link (snapshot — continua por link_id)
    const { data: esperados } = await supabase
      .from('links_avaliacao_esperados')
      .select('link_coletivo_id')
      .in('link_coletivo_id', linkIds)

    // Conta respondidos por periodo = rotulo do link (inclui links individuais)
    // Deduplicado por colaborador_id: se respondeu via dois links no mesmo período, conta 1
    const { data: respondidos } = await supabase
      .from('autoavaliacoes')
      .select('colaborador_id, periodo')
      .in('periodo', rotulos)
      .not('respondido_em', 'is', null)

    // Agrega contadores em JS
    const esperadosCount: Record<string, number> = {}
    // Usa Set para deduplicar colaboradores por período
    const respondidosPorPeriodo: Record<string, Set<string>> = {}

    esperados?.forEach((e) => {
      esperadosCount[e.link_coletivo_id] = (esperadosCount[e.link_coletivo_id] ?? 0) + 1
    })
    respondidos?.forEach((r) => {
      if (!respondidosPorPeriodo[r.periodo]) respondidosPorPeriodo[r.periodo] = new Set()
      respondidosPorPeriodo[r.periodo].add(r.colaborador_id)
    })

    const resultado = links.map((l) => ({
      ...l,
      total_esperados: esperadosCount[l.id] ?? 0,
      total_respondidos: respondidosPorPeriodo[l.rotulo]?.size ?? 0,
    }))

    return NextResponse.json(resultado)
  } catch (err) {
    console.error('links-coletivos error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
