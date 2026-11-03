import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calcularScoreVendedorV3,
  calcularScoreVendedor,
  type DadosVendedorV3,
  type DadosVendedor,
} from '@/lib/score-vendedor'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidato_id } = body

    if (!candidato_id) {
      return NextResponse.json({ error: 'candidato_id required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: _cRaw } = await supabase
      .from('candidatos')
      .select(
        'quiz_vendedor_v3, escolaridade, conducoes_ida, conducoes_volta, disponibilidade_horario, pretensao_salarial, ' +
        'tempo_ultimo_emprego, motivo_permanencia, saiu_sem_avisar, preferencia_trabalho, reacao_orientacao, ' +
        'aceita_regras, motivacao_vendas, situacao_venda, reacao_sem_venda, situacao_loja_baguncada, ' +
        'experiencia_persuasao, lida_movimento_fraco, aceita_horario_shopping, ativo_redes_sociais, ' +
        'comunicacao_pessoal, defeito_segundo_gerente, por_que_confiar',
      )
      .eq('id', candidato_id)
      .single()

    const c = _cRaw as Record<string, unknown> | null
    if (!c) {
      return NextResponse.json({ error: 'candidato not found' }, { status: 404 })
    }

    // ── Rota V3: candidato respondeu o quiz novo ──────────────────────────
    const quizV3 = c.quiz_vendedor_v3 as {
      versao?: string
      respostas?: Record<string, { perfil: string }>
      objetivas?: { tipo_saida?: string; tempo_ultimo_emprego?: string }
      mix_pct?: { N: number; R: number; E: number; L: number }
    } | null

    if (quizV3?.versao === 'v3' && quizV3.mix_pct && quizV3.respostas) {
      const dados: DadosVendedorV3 = {
        mix_pct:             quizV3.mix_pct,
        respostas:           quizV3.respostas,
        tipo_saida:          quizV3.objetivas?.tipo_saida,
        tempo_ultimo_emprego: quizV3.objetivas?.tempo_ultimo_emprego,
      }

      const r = calcularScoreVendedorV3(dados)

      await supabase
        .from('candidatos')
        .update({
          // Mapeamento v3 → colunas existentes
          score_vocacao:           r.score_nato,           // força nato
          score_comprometimento_v: r.score_equilibrio,     // equilíbrio
          score_comunicacao:       r.score_coerencia,      // coerência
          score_disciplina_v:      r.divergencias,         // nº de pares divergentes
          score_potencial:         null,                   // não usado em v3
          score_final:             r.score_final,
          perfil_vendedor:         r.perfil_dominante,
          alertas:                 r.alertas.map((a) => a.codigo),
          perfil:                  r.classificacao,
        })
        .eq('id', candidato_id)

      const origin = request.nextUrl.origin
      after(async () => {
        try {
          await fetch(`${origin}/api/analisar-candidato`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidato_id }),
          })
        } catch (e) {
          console.error('Erro ao analisar candidato vendedor v3:', e)
        }
      })

      return NextResponse.json({ ok: true, versao: 'v3' })
    }

    // ── Fallback V2: candidato antigo sem quiz_vendedor_v3 ────────────────
    const cStr = c as Record<string, string | null>

    let pretensao_acima_teto = false
    try {
      const { data: cfgRow } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'salario_max_vendedor')
        .single()
      if (cfgRow) {
        const teto = parseFloat(cfgRow.valor)
        const pretensaoStr = String(cStr.pretensao_salarial || '')
        const pretensaoTokens = pretensaoStr.match(/\d+(?:[.,]\d+)*/g) ?? []
        const pretensaoVals = pretensaoTokens
          .map(t => t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t.replace(/\./g, '')))
          .filter(n => !isNaN(n) && n >= 100)
        const pretensaoNum = pretensaoVals.length > 0 ? Math.max(...pretensaoVals) : NaN
        if (!isNaN(pretensaoNum) && !isNaN(teto) && pretensaoNum > teto) pretensao_acima_teto = true
      }
    } catch { /* ignora */ }

    const dados: DadosVendedor = {
      escolaridade:             cStr.escolaridade ?? undefined,
      conducoes_ida:            cStr.conducoes_ida ?? undefined,
      conducoes_volta:          cStr.conducoes_volta ?? undefined,
      disponibilidade_horario:  cStr.disponibilidade_horario ?? undefined,
      pretensao_acima_teto,
      tempo_ultimo_emprego:     cStr.tempo_ultimo_emprego ?? undefined,
      motivo_permanencia:       cStr.motivo_permanencia ?? undefined,
      saiu_sem_avisar:          cStr.saiu_sem_avisar ?? undefined,
      preferencia_trabalho:     cStr.preferencia_trabalho ?? undefined,
      reacao_orientacao:        cStr.reacao_orientacao ?? undefined,
      aceita_regras:            cStr.aceita_regras ?? undefined,
      motivacao_vendas:         cStr.motivacao_vendas ?? undefined,
      situacao_venda:           cStr.situacao_venda ?? undefined,
      reacao_sem_venda:         cStr.reacao_sem_venda ?? undefined,
      situacao_loja_baguncada:  cStr.situacao_loja_baguncada ?? undefined,
      experiencia_persuasao:    cStr.experiencia_persuasao ?? undefined,
      lida_movimento_fraco:     cStr.lida_movimento_fraco ?? undefined,
      aceita_horario_shopping:  cStr.aceita_horario_shopping ?? undefined,
      ativo_redes_sociais:      cStr.ativo_redes_sociais ?? undefined,
      comunicacao_pessoal:      cStr.comunicacao_pessoal ?? undefined,
      defeito_segundo_gerente:  cStr.defeito_segundo_gerente ?? undefined,
      por_que_confiar:          cStr.por_que_confiar ?? undefined,
    }

    const resultado = calcularScoreVendedor(dados)

    await supabase
      .from('candidatos')
      .update({
        score_vocacao:           resultado.score_vocacao,
        score_comprometimento_v: resultado.score_comprometimento_v,
        score_comunicacao:       resultado.score_comunicacao,
        score_disciplina_v:      resultado.score_disciplina_v,
        score_potencial:         resultado.score_potencial,
        score_final:             resultado.score_final,
        perfil_vendedor:         resultado.perfil_vendedor,
        alertas:                 resultado.alertas.map((a) => a.codigo),
        perfil:                  resultado.classificacao,
      })
      .eq('id', candidato_id)

    const origin = request.nextUrl.origin
    after(async () => {
      try {
        await fetch(`${origin}/api/analisar-candidato`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id }),
        })
      } catch (e) {
        console.error('Erro ao analisar candidato vendedor v2:', e)
      }
    })

    return NextResponse.json({ ok: true, versao: 'v2' })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
