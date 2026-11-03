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

// Valores permitidos de amb_objetivo por cargo — validados no backend
const OBJETIVOS_VALIDOS: Record<string, string[]> = {
  vendedor: ['lideranca', 'salario', 'experiencia', 'indefinido'],
  gerente:  ['crescer_supervisao', 'expandir_lojas', 'salario', 'realizado'],
  caixa:    ['crescer_administrativo', 'ir_para_vendas', 'lideranca', 'salario', 'indefinido'],
}

// Mapeamento das 8 perguntas do Bloco 4 — avaliação mensal
// Opções embaralhadas por questão (A ≠ sempre N). Perfis invisíveis ao colaborador.
// Verificação cruzada: p1 A=N B=R C=E D=L | p2 A=R B=L C=N D=E |
// p3 A=E B=N C=L D=R | p4 A=L B=E C=R D=N | p5 A=N B=E C=L D=R |
// p6 A=E B=R C=L D=N | p7 A=R B=L C=E D=N | p8 A=L B=N C=R D=E
const PERGUNTAS_PERFIL: Record<string, Record<string, { perfil: 'N' | 'R' | 'E' | 'L'; peso: number; grupo: string }>> = {
  p1: {
    A: { perfil: 'N', peso: 3, grupo: 'negociacao' },
    B: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    C: { perfil: 'E', peso: 3, grupo: 'execucao' },
    D: { perfil: 'L', peso: 3, grupo: 'lideranca' },
  },
  p2: {
    A: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    B: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    C: { perfil: 'N', peso: 3, grupo: 'negociacao' },
    D: { perfil: 'E', peso: 3, grupo: 'execucao' },
  },
  p3: {
    A: { perfil: 'E', peso: 3, grupo: 'execucao' },
    B: { perfil: 'N', peso: 3, grupo: 'negociacao' },
    C: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    D: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
  },
  p4: {
    A: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    B: { perfil: 'E', peso: 3, grupo: 'execucao' },
    C: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    D: { perfil: 'N', peso: 3, grupo: 'negociacao' },
  },
  p5: {
    A: { perfil: 'N', peso: 3, grupo: 'negociacao' },
    B: { perfil: 'E', peso: 3, grupo: 'execucao' },
    C: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    D: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
  },
  p6: {
    A: { perfil: 'E', peso: 3, grupo: 'execucao' },
    B: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    C: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    D: { perfil: 'N', peso: 3, grupo: 'negociacao' },
  },
  p7: {
    A: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    B: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    C: { perfil: 'E', peso: 3, grupo: 'execucao' },
    D: { perfil: 'N', peso: 3, grupo: 'negociacao' },
  },
  p8: {
    A: { perfil: 'L', peso: 3, grupo: 'lideranca' },
    B: { perfil: 'N', peso: 3, grupo: 'negociacao' },
    C: { perfil: 'R', peso: 3, grupo: 'relacionamento' },
    D: { perfil: 'E', peso: 3, grupo: 'execucao' },
  },
}

function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

function calcularMix(respostas: Record<string, string>): {
  respostas_perfil: Record<string, { resposta: string; perfil: string; peso: number; grupo: string }>
  mix_pct: { N: number; R: number; E: number; L: number }
  perfil_dominante: string
} {
  const acumulado: Record<string, number> = { N: 0, R: 0, E: 0, L: 0 }
  const respostas_perfil: Record<string, { resposta: string; perfil: string; peso: number; grupo: string }> = {}

  for (const [pKey, alternativa] of Object.entries(respostas)) {
    const mapa = PERGUNTAS_PERFIL[pKey]
    if (!mapa || !alternativa) continue
    const item = mapa[alternativa.toUpperCase()]
    if (!item) continue
    acumulado[item.perfil] = (acumulado[item.perfil] ?? 0) + item.peso
    respostas_perfil[pKey] = { resposta: alternativa, perfil: item.perfil, peso: item.peso, grupo: item.grupo }
  }

  const total = Object.values(acumulado).reduce((s, v) => s + v, 0)
  const mix_pct =
    total === 0
      ? { N: 0, R: 0, E: 0, L: 0 }
      : {
          N: Math.round((acumulado.N / total) * 100),
          R: Math.round((acumulado.R / total) * 100),
          E: Math.round((acumulado.E / total) * 100),
          L: Math.round((acumulado.L / total) * 100),
        }

  const PERFIL_LABEL: Record<string, string> = { N: 'Nato', R: 'Relacional', E: 'Executor', L: 'Liderança' }
  const maxVal = Math.max(...Object.values(acumulado))
  const dominantes = Object.entries(acumulado)
    .filter(([, v]) => v === maxVal && v > 0)
    .map(([k]) => k)
  const perfil_dominante =
    dominantes.length > 0 ? dominantes.map((d) => PERFIL_LABEL[d]).join(' / ') : 'Nato'

  return { respostas_perfil, mix_pct, perfil_dominante }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string
      colaborador_id?: string
      loja?: string
      cpf?: string
      eng_pertencimento?: number
      eng_longevidade?: number
      eng_enps?: number
      amb_objetivo?: string
      amb_responsabilidades?: number
      amb_visao_2anos?: string
      rem_justa?: number
      rem_reconhecimento?: number
      respostas_bloco4?: Record<string, string>
      texto_melhoria?: string
      texto_gestor?: string
    }

    const { token, colaborador_id, loja, cpf, respostas_bloco4, ...campos } = body

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
    if (!colaborador_id) return NextResponse.json({ error: 'colaborador_id required' }, { status: 400 })
    if (!loja) return NextResponse.json({ error: 'loja required' }, { status: 400 })
    if (!cpf) return NextResponse.json({ error: 'cpf required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Valida token
    const { data: avaliacao } = await supabase
      .from('autoavaliacoes')
      .select('id, respondido_em, colaborador_id')
      .eq('token', token)
      .single()

    if (!avaliacao) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (avaliacao.respondido_em) return NextResponse.json({ error: 'already_answered' }, { status: 409 })
    if (avaliacao.colaborador_id !== colaborador_id) {
      return NextResponse.json({ error: 'colaborador_invalido' }, { status: 403 })
    }

    // Valida colaborador: loja + estado + CPF + cargo (segunda linha de defesa)
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('loja, estado, cpf, cargo')
      .eq('id', colaborador_id)
      .single()

    if (!colab) return NextResponse.json({ error: 'colaborador_invalido' }, { status: 403 })
    if (colab.loja !== loja) return NextResponse.json({ error: 'loja_invalida' }, { status: 403 })
    if (colab.estado === 'DESLIGADO') return NextResponse.json({ error: 'colaborador_desligado' }, { status: 403 })
    if (!colab.cpf) return NextResponse.json({ error: 'cpf_nao_cadastrado' }, { status: 422 })
    if (limparCPF(cpf) !== limparCPF(colab.cpf)) {
      return NextResponse.json({ error: 'cpf_invalido' }, { status: 403 })
    }

    // Valida amb_objetivo contra os valores permitidos do cargo
    if (campos.amb_objetivo) {
      const permitidos = OBJETIVOS_VALIDOS[colab.cargo] ?? OBJETIVOS_VALIDOS.vendedor
      if (!permitidos.includes(campos.amb_objetivo)) {
        return NextResponse.json({ error: 'amb_objetivo_invalido' }, { status: 400 })
      }
    }

    // Valida Bloco 4 — obrigatório apenas para vendedor
    let respostas_perfil: Record<string, { resposta: string; perfil: string; peso: number; grupo: string }> | null = null
    let mix_pct: { N: number; R: number; E: number; L: number } | null = null
    let perfil_dominante: string | null = null

    if (colab.cargo === 'vendedor') {
      if (!respostas_bloco4) {
        return NextResponse.json({ error: 'respostas_bloco4 required' }, { status: 400 })
      }
      const perguntasEsperadas = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
      for (const p of perguntasEsperadas) {
        if (!respostas_bloco4[p]) {
          return NextResponse.json({ error: `resposta ${p} obrigatória` }, { status: 400 })
        }
      }
      const mix = calcularMix(respostas_bloco4)
      respostas_perfil = mix.respostas_perfil
      mix_pct = mix.mix_pct
      perfil_dominante = mix.perfil_dominante
    }

    const { error: updateError } = await supabase
      .from('autoavaliacoes')
      .update({
        respondido_em: new Date().toISOString(),
        eng_pertencimento: campos.eng_pertencimento ?? null,
        eng_longevidade: campos.eng_longevidade ?? null,
        eng_enps: campos.eng_enps ?? null,
        amb_objetivo: campos.amb_objetivo ?? null,
        amb_responsabilidades: campos.amb_responsabilidades ?? null,
        amb_visao_2anos: campos.amb_visao_2anos ?? null,
        rem_justa: campos.rem_justa ?? null,
        rem_reconhecimento: campos.rem_reconhecimento ?? null,
        respostas_perfil,
        mix_pct,
        perfil_dominante,
        texto_melhoria: campos.texto_melhoria ?? null,
        texto_gestor: campos.texto_gestor ?? null,
      })
      .eq('id', avaliacao.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('salvar-autoavaliacao error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
