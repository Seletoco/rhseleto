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
    const { ok, email } = await verificarMaster(request)
    if (!ok) {
      return NextResponse.json({ error: 'Acesso negado: apenas master pode recontratar' }, { status: 403 })
    }

    const body = await request.json() as { colaborador_id?: string; loja?: string }
    const { colaborador_id, loja } = body

    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!loja || !LOJAS_VALIDAS.includes(loja)) return NextResponse.json({ error: 'loja inválida' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Buscar o colaborador desligado
    const { data: desligado } = await supabase
      .from('colaboradores')
      .select('id, cpf, nome, cargo, candidato_id, estado')
      .eq('id', colaborador_id)
      .single()

    if (!desligado) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    if (desligado.estado !== 'DESLIGADO') {
      return NextResponse.json({ error: 'Colaborador não está desligado' }, { status: 422 })
    }

    // D2 — Bloquear se já tem vínculo ativo/treinamento pelo CPF
    const { data: vinculoAtivo } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('cpf', desligado.cpf)
      .in('estado', ['ATIVO', 'TREINAMENTO'])
      .maybeSingle()

    if (vinculoAtivo) {
      return NextResponse.json({ error: 'ja_tem_vinculo_ativo' }, { status: 422 })
    }

    const hoje = new Date().toISOString().split('T')[0]

    const { data: novo, error: insertError } = await supabase
      .from('colaboradores')
      .insert({
        candidato_id: desligado.candidato_id,
        cpf: desligado.cpf,
        nome: desligado.nome,
        cargo: desligado.cargo,
        loja,
        estado: 'ATIVO',
        data_entrada: hoje,
        data_efetivacao: hoje,
        movido_por: email,
      })
      .select('id')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ ok: true, colaborador_id: novo.id })
  } catch (err) {
    console.error('recontratar-colaborador error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
