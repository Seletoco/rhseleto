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
      token_link?: string
      colaborador_id?: string
      cpf?: string
    }
    const { token_link, colaborador_id, cpf } = body

    if (!token_link) return NextResponse.json({ error: 'token_link required' }, { status: 400 })
    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!cpf) return NextResponse.json({ error: 'cpf required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // 1. Valida o link coletivo
    const { data: link } = await supabase
      .from('links_avaliacao')
      .select('id, rotulo, encerrado')
      .eq('token', token_link)
      .single()

    if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (link.encerrado) return NextResponse.json({ error: 'link_encerrado' }, { status: 410 })

    // 2. Verifica se colaborador está no snapshot
    const { data: esperado } = await supabase
      .from('links_avaliacao_esperados')
      .select('id, cpf_tentativas, cpf_bloqueado_ate')
      .eq('link_coletivo_id', link.id)
      .eq('colaborador_id', colaborador_id)
      .single()

    if (!esperado) {
      return NextResponse.json({ error: 'nao_esperado' }, { status: 403 })
    }

    // 3. Rate limiting — checa bloqueio
    if (esperado.cpf_bloqueado_ate) {
      const bloqueadoAte = new Date(esperado.cpf_bloqueado_ate)
      if (bloqueadoAte > new Date()) {
        return NextResponse.json({
          error: 'bloqueado',
          bloqueado_ate: esperado.cpf_bloqueado_ate,
        }, { status: 429 })
      }
      // Bloqueio expirou — zera
      await supabase
        .from('links_avaliacao_esperados')
        .update({ cpf_tentativas: 0, cpf_bloqueado_ate: null })
        .eq('id', esperado.id)
      esperado.cpf_tentativas = 0
    }

    // 4. Valida CPF do colaborador
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('cpf, cargo')
      .eq('id', colaborador_id)
      .single()

    if (!colab) return NextResponse.json({ error: 'colaborador_invalido' }, { status: 403 })
    if (!colab.cpf) return NextResponse.json({ error: 'cpf_nao_cadastrado' }, { status: 422 })

    if (limparCPF(cpf) !== limparCPF(colab.cpf)) {
      const novasTentativas = (esperado.cpf_tentativas ?? 0) + 1
      const update: Record<string, unknown> = { cpf_tentativas: novasTentativas }

      if (novasTentativas >= MAX_TENTATIVAS) {
        update.cpf_bloqueado_ate = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString()
        await supabase.from('links_avaliacao_esperados').update(update).eq('id', esperado.id)
        return NextResponse.json({
          error: 'bloqueado',
          bloqueado_ate: update.cpf_bloqueado_ate,
        }, { status: 429 })
      }

      await supabase.from('links_avaliacao_esperados').update(update).eq('id', esperado.id)
      return NextResponse.json({
        error: 'cpf_invalido',
        tentativas_restantes: MAX_TENTATIVAS - novasTentativas,
      }, { status: 403 })
    }

    // 5. CPF correto — zera tentativas
    await supabase
      .from('links_avaliacao_esperados')
      .update({ cpf_tentativas: 0, cpf_bloqueado_ate: null })
      .eq('id', esperado.id)

    // 6. Busca ou cria autoavaliação vinculada a este link
    const { data: existente } = await supabase
      .from('autoavaliacoes')
      .select('id, token, respondido_em')
      .eq('colaborador_id', colaborador_id)
      .eq('link_coletivo_id', link.id)
      .maybeSingle()

    if (existente) {
      if (existente.respondido_em) {
        return NextResponse.json({
          ja_respondeu: true,
          respondido_em: existente.respondido_em,
        })
      }
      return NextResponse.json({ token_avaliacao: existente.token, cargo: colab.cargo })
    }

    // Cria nova autoavaliação com período = rótulo do link
    const { data: nova, error: insertError } = await supabase
      .from('autoavaliacoes')
      .insert({
        colaborador_id,
        link_coletivo_id: link.id,
        periodo: link.rotulo,
      })
      .select('id, token')
      .single()

    if (insertError || !nova) {
      return NextResponse.json({ error: insertError?.message ?? 'Erro ao criar avaliação' }, { status: 500 })
    }

    return NextResponse.json({ token_avaliacao: nova.token, cargo: colab.cargo })
  } catch (err) {
    console.error('identificar-coletivo error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
