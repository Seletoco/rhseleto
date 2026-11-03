import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const TRIAGEM_STATUS = ['TRIAGEM', 'APROVADO_E1']
const PROVA_STATUS = ['EM_PROVA', 'APROVADO_E2', 'BANCO_TALENTOS']
const ENTREVISTA_STATUS = ['ENTREVISTA_AGENDADA', 'ENTREVISTA_CONFIRMADA', 'ENTREVISTA_CANCELADA']
const UNIDADES = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']
const CARGOS = ['gerente', 'vendedor', 'caixa'] as const

function calcFunil(subset: { status: string }[]) {
  return {
    triagem: subset.filter(c => TRIAGEM_STATUS.includes(c.status)).length,
    triagem_aprovados: subset.filter(c => c.status === 'APROVADO_E1').length,
    triagem_reprovados: 0,
    prova: subset.filter(c => PROVA_STATUS.includes(c.status)).length,
    prova_aprovados: subset.filter(c => c.status === 'APROVADO_E2').length,
    prova_reprovados: 0,
    entrevista: subset.filter(c => ENTREVISTA_STATUS.includes(c.status)).length,
    entrevista_confirmadas: subset.filter(c => c.status === 'ENTREVISTA_CONFIRMADA').length,
    entrevista_canceladas: subset.filter(c => c.status === 'ENTREVISTA_CANCELADA').length,
    contratados: subset.filter(c => c.status === 'CONTRATADO').length,
    repescagem: subset.filter(c => c.status === 'REPESCAGEM').length,
    banco_talentos: subset.filter(c => c.status === 'BANCO_TALENTOS').length,
  }
}

export async function GET() {
  try {
    const supabase = supabaseAdmin()

    const { data, error } = await supabase
      .from('candidatos')
      .select('id, nome, cargo, status, score_final, perfil, unidades, entrevista_data, entrevista_resultado, entrevista_gestor, entrevista_modalidade, criado_em')
      .is('expirado_em', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Headcount real de vendedores ativos/em treinamento
    const { count: vendedoresAtivos } = await supabase
      .from('colaboradores')
      .select('*', { count: 'exact', head: true })
      .eq('cargo', 'vendedor')
      .in('estado', ['ATIVO', 'TREINAMENTO'])

    const candidatos = data ?? []
    const hoje = new Date().toISOString().split('T')[0]

    const funil = calcFunil(candidatos)

    const funil_por_cargo = Object.fromEntries(
      CARGOS.map(cargo => [cargo, calcFunil(candidatos.filter(c => c.cargo === cargo))])
    ) as Record<typeof CARGOS[number], ReturnType<typeof calcFunil>>

    const aguardando_convocacao = candidatos
      .filter(c => c.status === 'APROVADO_E2')
      .sort((a, b) => (b.score_final ?? 0) - (a.score_final ?? 0))
      .map(c => ({ id: c.id, nome: c.nome, cargo: c.cargo, score_final: c.score_final, perfil: c.perfil, unidades: c.unidades }))

    const hojeDate = new Date()
    const entrevistas_vencidas = candidatos
      .filter(c => c.entrevista_data && c.entrevista_resultado === 'Aguardando' && c.entrevista_data < hoje)
      .sort((a, b) => (a.entrevista_data ?? '').localeCompare(b.entrevista_data ?? ''))
      .map(c => {
        const dataEntrevista = new Date(c.entrevista_data + 'T12:00:00')
        const diasVencida = Math.floor((hojeDate.getTime() - dataEntrevista.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: c.id, nome: c.nome, cargo: c.cargo,
          entrevista_data: c.entrevista_data,
          entrevista_gestor: c.entrevista_gestor,
          entrevista_modalidade: c.entrevista_modalidade,
          unidades: c.unidades, dias_vencida: diasVencida,
        }
      })

    const por_unidade = UNIDADES.map(unidade => {
      const u = candidatos.filter(c => Array.isArray(c.unidades) && c.unidades.includes(unidade))
      return {
        unidade,
        total: u.length,
        triagem: u.filter(c => TRIAGEM_STATUS.includes(c.status)).length,
        prova: u.filter(c => PROVA_STATUS.includes(c.status)).length,
        entrevista: u.filter(c => ENTREVISTA_STATUS.includes(c.status)).length,
        contratados: u.filter(c => c.status === 'CONTRATADO').length,
      }
    })

    const por_cargo = CARGOS.map(cargo => {
      const subset = candidatos.filter(c => c.cargo === cargo)
      return {
        cargo,
        total: subset.length,
        triagem: subset.filter(c => TRIAGEM_STATUS.includes(c.status)).length,
        prova: subset.filter(c => PROVA_STATUS.includes(c.status)).length,
        entrevista: subset.filter(c => ENTREVISTA_STATUS.includes(c.status)).length,
        contratados: subset.filter(c => c.status === 'CONTRATADO').length,
      }
    })

    const top_candidatos = candidatos
      .filter(c => c.status === 'APROVADO_E2')
      .sort((a, b) => (b.score_final ?? 0) - (a.score_final ?? 0))
      .slice(0, 5)
      .map(c => ({ id: c.id, nome: c.nome, cargo: c.cargo, score_final: c.score_final, perfil: c.perfil, unidades: c.unidades, criado_em: c.criado_em }))

    return NextResponse.json({
      funil, funil_por_cargo,
      alertas: { aguardando_convocacao, entrevistas_vencidas },
      por_unidade, por_cargo, top_candidatos,
      vendedores_ativos: vendedoresAtivos ?? 0,
    })
  } catch (err) {
    console.error('dashboard error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
