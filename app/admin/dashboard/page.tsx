'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getPerfilUsuario } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PERFIL_ESTILO: Record<string, string> = {
  A: 'bg-[#0A0A0A] text-white',
  B: 'bg-[#404040] text-white',
  C: 'bg-[#B0B0B0] text-white',
  D: 'bg-[#E8E8E8] text-[#0A0A0A]',
}

const CARGO_CHIP: Record<string, string> = {
  gerente:  'bg-[#0A0A0A] text-white',
  vendedor: 'bg-[#1E3A8A] text-white',
  caixa:    'bg-[#4C1D95] text-white',
}
const CARGO_LABEL: Record<string, string> = {
  gerente: 'Gerente', vendedor: 'Vendedor', caixa: 'Caixa',
}

function formatarDataLocal(data: string | null | undefined): string {
  if (!data) return '—'
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y}`
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Funil = {
  triagem: number; triagem_aprovados: number; triagem_reprovados: number
  prova: number; prova_aprovados: number; prova_reprovados: number
  entrevista: number; entrevista_confirmadas: number; entrevista_canceladas: number
  contratados: number; repescagem: number; banco_talentos: number
}

type AlertaItem = { id: string; nome: string; cargo: string | null; score_final: number | null; perfil: string | null; unidades: string[] | null }
type EntrevistaVencida = {
  id: string; nome: string; cargo: string | null; entrevista_data: string | null
  entrevista_gestor: string | null; entrevista_modalidade: string | null
  unidades: string[] | null; dias_vencida: number
}
type UnidadeRow = { unidade: string; total: number; triagem: number; prova: number; entrevista: number; contratados: number }
type CargoRow = { cargo: string; total: number; triagem: number; prova: number; entrevista: number; contratados: number }
type TopCandidato = { id: string; nome: string; cargo: string | null; score_final: number | null; perfil: string | null; unidades: string[] | null; criado_em: string }

type DashboardData = {
  funil: Funil
  funil_por_cargo: Record<string, Funil>
  alertas: { aguardando_convocacao: AlertaItem[]; entrevistas_vencidas: EntrevistaVencida[] }
  por_unidade: UnidadeRow[]
  por_cargo: CargoRow[]
  top_candidatos: TopCandidato[]
  vendedores_ativos: number
}

function FunilCard({ titulo, total, sub1Label, sub1, sub2Label, sub2 }: {
  titulo: string; total: number; sub1Label: string; sub1: number; sub2Label: string; sub2: number
}) {
  return (
    <div className="border border-[#E5E5E5] rounded-xl p-6">
      <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">{titulo}</p>
      <p className="text-4xl font-semibold tabular-nums text-[#0A0A0A] mb-2">{total}</p>
      <p className="text-xs text-[#6B6B6B]">
        <span className="text-[#15803D] font-medium">{sub1} {sub1Label}</span>
        <span className="mx-1.5 text-[#D1D5DB]">·</span>
        <span className="text-[#DC2626] font-medium">{sub2} {sub2Label}</span>
      </p>
    </div>
  )
}

function ResultadoCard({ funil }: { funil: Funil }) {
  return (
    <div className="border border-[#E5E5E5] rounded-xl p-6">
      <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Resultado Final</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#0A0A0A]">Contratados</span>
          <span className="text-2xl font-semibold tabular-nums text-[#166534]">{funil.contratados}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#0A0A0A]">Repescagem</span>
          <span className="text-2xl font-semibold tabular-nums text-[#CA8A04]">{funil.repescagem}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#0A0A0A]">Banco de Talentos</span>
          <span className="text-2xl font-semibold tabular-nums text-[#6B7280]">{funil.banco_talentos}</span>
        </div>
      </div>
    </div>
  )
}

const CARGO_FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'caixa', label: 'Caixa' },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [filtroCargo, setFiltroCargo] = useState('')

  useEffect(() => {
    async function carregar() {
      const perfil = await getPerfilUsuario(supabase)
      if (!perfil || perfil.role !== 'master') {
        router.replace('/admin/candidatos')
        return
      }

      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setDados(json)
      }
      setCarregando(false)
    }
    carregar()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#6B6B6B]">Carregando…</p>
      </div>
    )
  }

  if (!dados) return null

  const { alertas, por_unidade, por_cargo, top_candidatos } = dados

  const funilAtivo: Funil = filtroCargo
    ? (dados.funil_por_cargo[filtroCargo] ?? dados.funil)
    : dados.funil

  const alertasConvocacao = filtroCargo
    ? alertas.aguardando_convocacao.filter(c => c.cargo === filtroCargo)
    : alertas.aguardando_convocacao

  const alertasEntrevistas = filtroCargo
    ? alertas.entrevistas_vencidas.filter(c => c.cargo === filtroCargo)
    : alertas.entrevistas_vencidas

  const topFiltrados = filtroCargo
    ? top_candidatos.filter(c => c.cargo === filtroCargo)
    : top_candidatos

  const temAlertas = alertasConvocacao.length > 0 || alertasEntrevistas.length > 0

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">SELETO</span>
            <nav className="flex items-center gap-4">
              <Link href="/admin/candidatos" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                Candidatos
              </Link>
              <Link href="/admin/dashboard" className="text-sm font-medium text-[#0A0A0A] border-b border-[#0A0A0A] pb-0.5">
                Dashboard
              </Link>
              <Link href="/admin/configuracoes" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                Configurações
              </Link>
            </nav>
          </div>
          <button onClick={sair} className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-16 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro de cargo */}
            <div className="flex items-center gap-2">
              {CARGO_FILTROS.map(op => (
                <button
                  key={op.value}
                  onClick={() => setFiltroCargo(op.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filtroCargo === op.value
                      ? op.value === '' ? 'bg-[#0A0A0A] text-white' : `${CARGO_CHIP[op.value]} `
                      : 'border border-[#E5E5E5] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] bg-white'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            {temAlertas && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FEF2F2] text-red-700 border border-red-200">
                {alertasConvocacao.length + alertasEntrevistas.length} alertas ativos
              </span>
            )}
          </div>
        </div>

        {/* KPIs de destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden border border-[#E5E5E5] divide-y sm:divide-y-0 sm:divide-x divide-[#E5E5E5]">
          <div className="px-6 py-5" style={{ background: '#E7F1FC', borderLeft: '4px solid #1D7FC2' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#0C4A75' }}>Total Aprovados</p>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: '#0C4A75' }}>{funilAtivo.contratados}</p>
          </div>
          <div className="px-6 py-5" style={{ background: '#FDECE0', borderLeft: '4px solid #FF9430' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8A4A0E' }}>Taxa de Conversão</p>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: '#8A4A0E' }}>
              {funilAtivo.triagem > 0 ? Math.round(funilAtivo.contratados / funilAtivo.triagem * 100) : 0}%
            </p>
          </div>
          <div className="px-6 py-5" style={{ background: '#E4F7EA', borderLeft: '4px solid #2DC76E' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#166B3B' }}>Vendedores Ativos</p>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: '#166B3B' }}>{dados.vendedores_ativos}</p>
          </div>
        </div>

        {/* Linha 1 — Funil */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FunilCard
            titulo="Triagem"
            total={funilAtivo.triagem}
            sub1Label="aprovados"
            sub1={funilAtivo.triagem_aprovados}
            sub2Label="reprovados"
            sub2={funilAtivo.triagem_reprovados}
          />
          <FunilCard
            titulo="Prova"
            total={funilAtivo.prova}
            sub1Label="aprovados"
            sub1={funilAtivo.prova_aprovados}
            sub2Label="reprovados"
            sub2={funilAtivo.prova_reprovados}
          />
          <FunilCard
            titulo="Entrevista"
            total={funilAtivo.entrevista}
            sub1Label="confirmadas"
            sub1={funilAtivo.entrevista_confirmadas}
            sub2Label="canceladas"
            sub2={funilAtivo.entrevista_canceladas}
          />
          <ResultadoCard funil={funilAtivo} />
        </div>

        {/* Linha 2 — Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Aguardando convocação */}
          <div className={`border rounded-xl p-6 ${alertasConvocacao.length > 0 ? 'border-l-4 border-l-red-400 border-[#E5E5E5]' : 'border-[#E5E5E5]'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Aguardando Convocação</p>
              <span className={`text-lg font-semibold tabular-nums ${alertasConvocacao.length > 0 ? 'text-red-600' : 'text-[#6B6B6B]'}`}>
                {alertasConvocacao.length}
              </span>
            </div>
            {alertasConvocacao.length === 0 ? (
              <p className="text-sm text-[#B0B0B0]">Nenhum candidato aguardando convocação.</p>
            ) : (
              <div className="space-y-2">
                {alertasConvocacao.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.perfil && (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0 ${PERFIL_ESTILO[c.perfil] ?? 'bg-[#E8E8E8] text-[#0A0A0A]'}`}>
                          {c.perfil}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nome}</p>
                        <p className="text-xs text-[#6B6B6B]">
                          {c.score_final != null ? `Score ${c.score_final.toFixed(1)}` : '—'}
                          {c.unidades && c.unidades.length > 0 && ` · ${c.unidades.join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/candidatos/${c.id}`}
                      className="text-xs font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors shrink-0"
                    >
                      Ver perfil
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entrevistas vencidas */}
          <div className={`border rounded-xl p-6 ${alertasEntrevistas.length > 0 ? 'border-l-4 border-l-red-400 border-[#E5E5E5]' : 'border-[#E5E5E5]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${alertasEntrevistas.length > 0 ? 'text-red-700' : 'text-[#6B6B6B]'}`}>
                  Entrevistas Vencidas
                </p>
                {alertasEntrevistas.length > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                    {alertasEntrevistas.length}
                  </span>
                )}
              </div>
              {alertasEntrevistas.length === 0 && (
                <span className="text-lg font-semibold tabular-nums text-[#6B6B6B]">0</span>
              )}
            </div>
            {alertasEntrevistas.length === 0 ? (
              <p className="text-sm text-[#B0B0B0]">Nenhuma entrevista vencida.</p>
            ) : (
              <div className="space-y-3">
                {alertasEntrevistas.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-sm mt-0.5 shrink-0">⚠️</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nome}</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">
                          Entrevista dia {formatarDataLocal(c.entrevista_data)}
                          {c.entrevista_modalidade && ` — ${c.entrevista_modalidade}`}
                          {c.unidades && c.unidades.length > 0 && ` — ${c.unidades.join(', ')}`}
                        </p>
                        <p className="text-xs text-[#6B6B6B]">
                          {c.entrevista_gestor && `Responsável: ${c.entrevista_gestor} · `}
                          <span className="text-red-600 font-medium">
                            vencida há {c.dias_vencida} {c.dias_vencida === 1 ? 'dia' : 'dias'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/candidatos/${c.id}`}
                      className="text-xs font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors shrink-0"
                    >
                      Ver perfil
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Linha 3 — Por unidade */}
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Por Unidade</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                {['Unidade', 'Total', 'Triagem', 'Prova', 'Entrevista', 'Contratados'].map((col) => (
                  <th key={col} className="text-left px-6 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {por_unidade.map((row) => (
                <tr key={row.unidade} className="border-b border-[#E5E5E5] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#0A0A0A]">{row.unidade}</td>
                  <td className="px-6 py-4 tabular-nums font-semibold text-[#0A0A0A]">{row.total}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.triagem}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.prova}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.entrevista}</td>
                  <td className="px-6 py-4 tabular-nums font-semibold text-[#166534]">{row.contratados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Linha 4 — Por cargo */}
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Por Cargo</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                {['Cargo', 'Total', 'Triagem', 'Prova', 'Entrevista', 'Contratados'].map((col) => (
                  <th key={col} className="text-left px-6 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...por_cargo, {
                cargo: 'total',
                total: por_cargo.reduce((s, r) => s + r.total, 0),
                triagem: por_cargo.reduce((s, r) => s + r.triagem, 0),
                prova: por_cargo.reduce((s, r) => s + r.prova, 0),
                entrevista: por_cargo.reduce((s, r) => s + r.entrevista, 0),
                contratados: por_cargo.reduce((s, r) => s + r.contratados, 0),
              }].map((row) => (
                <tr key={row.cargo} className={`border-b border-[#E5E5E5] last:border-0 transition-colors ${row.cargo === 'total' ? 'bg-[#FAFAFA] font-semibold' : 'hover:bg-[#FAFAFA]'}`}>
                  <td className="px-6 py-4">
                    {row.cargo === 'total' ? (
                      <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Total</span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${CARGO_CHIP[row.cargo] ?? 'bg-[#E5E5E5] text-[#0A0A0A]'}`}>
                        {CARGO_LABEL[row.cargo] ?? row.cargo}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 tabular-nums font-semibold text-[#0A0A0A]">{row.total}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.triagem}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.prova}</td>
                  <td className="px-6 py-4 tabular-nums text-[#6B6B6B]">{row.entrevista}</td>
                  <td className="px-6 py-4 tabular-nums font-semibold text-[#166534]">{row.contratados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Linha 5 — Top candidatos */}
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Top Candidatos — Aprovados Aguardando Convocação
            </p>
          </div>
          {topFiltrados.length === 0 ? (
            <p className="text-sm text-[#B0B0B0] px-6 py-8">Nenhum candidato aprovado aguardando convocação.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  {['Nome', 'Cargo', 'Score', 'Perfil', 'Unidades', 'Inscrito em', ''].map((col) => (
                    <th key={col} className="text-left px-6 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topFiltrados.map((c) => (
                  <tr key={c.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0A0A0A]">{c.nome}</td>
                    <td className="px-6 py-4">
                      {c.cargo ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${CARGO_CHIP[c.cargo] ?? 'bg-[#E5E5E5] text-[#0A0A0A]'}`}>
                          {CARGO_LABEL[c.cargo] ?? c.cargo}
                        </span>
                      ) : <span className="text-[#B0B0B0]">—</span>}
                    </td>
                    <td className="px-6 py-4 tabular-nums font-semibold text-[#0A0A0A]">
                      {c.score_final != null ? c.score_final.toFixed(1) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {c.perfil ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${PERFIL_ESTILO[c.perfil] ?? 'bg-[#E8E8E8] text-[#0A0A0A]'}`}>
                          {c.perfil}
                        </span>
                      ) : (
                        <span className="text-[#B0B0B0]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B]">
                      {c.unidades?.join(', ') ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] whitespace-nowrap">
                      {formatarData(c.criado_em)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/candidatos/${c.id}`}
                        className="text-xs font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
