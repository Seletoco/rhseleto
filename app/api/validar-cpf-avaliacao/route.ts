import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const MAX_TENTATIVAS = 5
const BLOQUEIO_MINUTOS = 10

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string
      colaborador_id?: string
      cpf?: string
    }
    const { token, colaborador_id, cpf } = body

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!cpf) return NextResponse.json({ error: 'cpf required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Busca a avaliação pelo token
    const { data: avaliacao } = await supabase
      .from('autoavaliacoes')
      .select('id, respondido_em, colaborador_id, cpf_tentativas, cpf_bloqueado_ate')
      .eq('token', token)
      .single()

    if (!avaliacao) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (avaliacao.respondido_em) return NextResponse.json({ error: 'already_answered' }, { status: 409 })

    // Checa bloqueio ativo
    if (avaliacao.cpf_bloqueado_ate) {
      const bloqueadoAte = new Date(avaliacao.cpf_bloqueado_ate)
      if (bloqueadoAte > new Date()) {
        return NextResponse.json({
          error: 'bloqueado',
          bloqueado_ate: avaliacao.cpf_bloqueado_ate,
        }, { status: 429 })
      }
      // Bloqueio expirou — zera contador
      await supabase
        .from('autoavaliacoes')
        .update({ cpf_tentativas: 0, cpf_bloqueado_ate: null })
        .eq('id', avaliacao.id)
      avaliacao.cpf_tentativas = 0
    }

    // Valida que o colaborador_id bate com o da avaliação
    if (avaliacao.colaborador_id !== colaborador_id) {
      return NextResponse.json({ error: 'colaborador_invalido' }, { status: 403 })
    }

    // Busca colaborador para validar CPF
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('cpf')
      .eq('id', colaborador_id)
      .single()

    if (!colab) return NextResponse.json({ error: 'colaborador_invalido' }, { status: 403 })
    if (!colab.cpf) return NextResponse.json({ error: 'cpf_nao_cadastrado' }, { status: 422 })

    // Comparação normalizada — só dígitos
    const cpfDigitado = limparCPF(cpf)
    const cpfCadastrado = limparCPF(colab.cpf)

    if (cpfDigitado !== cpfCadastrado) {
      const novasTentativas = (avaliacao.cpf_tentativas ?? 0) + 1
      const update: Record<string, unknown> = { cpf_tentativas: novasTentativas }

      if (novasTentativas >= MAX_TENTATIVAS) {
        const bloqueadoAte = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString()
        update.cpf_bloqueado_ate = bloqueadoAte
        await supabase.from('autoavaliacoes').update(update).eq('id', avaliacao.id)
        return NextResponse.json({
          error: 'bloqueado',
          bloqueado_ate: bloqueadoAte,
        }, { status: 429 })
      }

      await supabase.from('autoavaliacoes').update(update).eq('id', avaliacao.id)
      return NextResponse.json({
        error: 'cpf_invalido',
        tentativas_restantes: MAX_TENTATIVAS - novasTentativas,
      }, { status: 403 })
    }

    // CPF correto — zera contador
    await supabase
      .from('autoavaliacoes')
      .update({ cpf_tentativas: 0, cpf_bloqueado_ate: null })
      .eq('id', avaliacao.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('validar-cpf-avaliacao error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
