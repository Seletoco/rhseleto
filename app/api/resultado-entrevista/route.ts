import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { candidato_id, resultado, motivo } = await request.json()

    if (!candidato_id || !resultado) {
      return NextResponse.json({ error: 'candidato_id e resultado são obrigatórios' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      Contratado: 'APROVADO',
      'Não contratado': 'REPROVADO',
      Repescagem: 'BANCO_TALENTOS',
    }

    const novoStatus = statusMap[resultado]
    if (!novoStatus) {
      return NextResponse.json({ error: 'resultado inválido' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const update: Record<string, unknown> = {
      entrevista_resultado: resultado,
      status: novoStatus,
    }

    if (resultado === 'Não contratado' && motivo) {
      update.entrevista_motivo_nao_contratacao = motivo
    }

    const { error } = await supabase
      .from('candidatos')
      .update(update)
      .eq('id', candidato_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: novoStatus })
  } catch (err) {
    console.error('resultado-entrevista error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
