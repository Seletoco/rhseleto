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

    const link_id = request.nextUrl.searchParams.get('link_id')
    if (!link_id) return NextResponse.json({ error: 'link_id required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Dados do link
    const { data: link } = await supabase
      .from('links_avaliacao')
      .select('id, rotulo, criado_em')
      .eq('id', link_id)
      .single()

    if (!link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

    // Todos os esperados com dados do colaborador
    const { data: esperados, error: espError } = await supabase
      .from('links_avaliacao_esperados')
      .select('colaborador_id, colaboradores(nome, loja, cargo)')
      .eq('link_coletivo_id', link_id)

    if (espError) return NextResponse.json({ error: espError.message }, { status: 500 })

    // Respostas já enviadas para o período deste link (inclui links individuais)
    // Deduplicado por colaborador_id: mantém o respondido_em mais antigo em caso de duplicata
    const { data: respostas } = await supabase
      .from('autoavaliacoes')
      .select('colaborador_id, respondido_em')
      .eq('periodo', link.rotulo)
      .not('respondido_em', 'is', null)

    const respondidosPorId: Record<string, string> = {}
    for (const r of respostas ?? []) {
      const atual = respondidosPorId[r.colaborador_id]
      if (!atual || r.respondido_em < atual) {
        respondidosPorId[r.colaborador_id] = r.respondido_em as string
      }
    }
    const respondidosSet = new Set(Object.keys(respondidosPorId))

    type ColabInfo = { colaborador_id: string; nome: string; loja: string; cargo: string }

    // Separa responderam vs faltam, filtrando por loja do gestor se necessário
    const responderam: ColabInfo[] = []
    const faltam: ColabInfo[] = []

    for (const e of esperados ?? []) {
      const colab = e.colaboradores as unknown as Omit<ColabInfo, 'colaborador_id'> | null
      if (!colab) continue
      // Gestor vê só a loja dele
      if (usuario.role === 'gestor' && colab.loja !== usuario.unidade) continue

      const info: ColabInfo = { colaborador_id: e.colaborador_id, nome: colab.nome, loja: colab.loja, cargo: colab.cargo }
      if (respondidosSet.has(e.colaborador_id)) {
        responderam.push({ ...info, respondido_em: respondidosPorId[e.colaborador_id] } as ColabInfo & { respondido_em: string })
      } else {
        faltam.push(info)
      }
    }

    // Ordena
    responderam.sort((a, b) => (a as unknown as { respondido_em: string }).respondido_em.localeCompare((b as unknown as { respondido_em: string }).respondido_em))
    faltam.sort((a, b) => a.loja.localeCompare(b.loja) || a.nome.localeCompare(b.nome))

    return NextResponse.json({ link, responderam, faltam })
  } catch (err) {
    console.error('pendentes-link error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
