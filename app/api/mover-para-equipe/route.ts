import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const LOJAS_VALIDAS = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']

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

  // Verificar sessão via auth (usa anon key + JWT do usuário)
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return false

  // Checar role no banco via admin (evita RLS bypassar a checagem)
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
      return NextResponse.json({ error: 'Acesso negado: apenas master pode mover para equipe' }, { status: 403 })
    }

    const body = await request.json() as { candidato_id?: string; loja?: string; data_entrada?: string }
    const { candidato_id, loja, data_entrada } = body

    if (!candidato_id) return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })
    if (!loja || !LOJAS_VALIDAS.includes(loja)) return NextResponse.json({ error: 'loja inválida' }, { status: 400 })
    if (!data_entrada) return NextResponse.json({ error: 'data_entrada required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Buscar candidato e validar status APROVADO
    const { data: candidato } = await supabase
      .from('candidatos')
      .select('id, cpf, nome, cargo, status')
      .eq('id', candidato_id)
      .single()

    if (!candidato) return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 })
    if (candidato.status !== 'APROVADO') {
      return NextResponse.json({ error: 'Apenas candidatos com status APROVADO podem ser movidos para equipe' }, { status: 422 })
    }

    // Bloquear duplicação: CPF já ativo ou em treinamento em qualquer loja
    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('cpf', candidato.cpf)
      .in('estado', ['ATIVO', 'TREINAMENTO'])
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'ja_tem_vinculo_ativo' }, { status: 422 })
    }

    // Buscar email do usuário logado para auditoria (movido_por)
    const authHeader = request.headers.get('Authorization')!
    const token = authHeader.slice(7)
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser(token)

    const { data: colaborador, error } = await supabase
      .from('colaboradores')
      .insert({
        candidato_id: candidato.id,
        cpf: candidato.cpf,
        nome: candidato.nome,
        cargo: candidato.cargo,
        loja,
        estado: 'TREINAMENTO',
        data_entrada,
        movido_por: user?.email ?? null,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, colaborador_id: colaborador.id })
  } catch (err) {
    console.error('mover-para-equipe error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
