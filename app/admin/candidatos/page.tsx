'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase'
import { getPerfilUsuario, type PerfilUsuario } from '@/lib/auth'
import { StatusChip } from '@/components/admin/StatusChip'

const UNIDADES_OPCOES = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']

const PERFIS_GERENTE  = ['Comercial', 'Pessoas', 'Operacional', 'Estratégico']
const PERFIS_VENDEDOR = ['Vendedor Nato', 'Relacional', 'Executor', 'Liderança Emergente']
const PERFIS_GERENTE_SET  = new Set(PERFIS_GERENTE)
const PERFIS_VENDEDOR_SET = new Set(PERFIS_VENDEDOR)

const CARGO_CHIP: Record<string, string> = {
  gerente:  'bg-[#0A0A0A] text-white',
  vendedor: 'bg-[#1E3A8A] text-white',
  caixa:    'bg-[#4C1D95] text-white',
}
const CARGO_LABEL: Record<string, string> = {
  gerente: 'Gerente', vendedor: 'Vendedor', caixa: 'Caixa',
}

function perfilGerenteCls(pg: string): string {
  if (pg.startsWith('Misto'))       return 'bg-[#FEF9C3] text-[#854D0E]'
  if (pg.startsWith('Comercial'))   return 'bg-[#DBEAFE] text-[#1E40AF]'
  if (pg.startsWith('Pessoas'))     return 'bg-[#DCFCE7] text-[#166534]'
  if (pg.startsWith('Operacional')) return 'bg-[#F3F4F6] text-[#374151]'
  if (pg.startsWith('Estratégico')) return 'bg-[#EDE9FE] text-[#5B21B6]'
  return 'bg-[#F3F4F6] text-[#0A0A0A]'
}

type KanbanColuna = {
  id: string
  label: string
  status: string[]
  alvo: string
}

const COLUNAS_KANBAN: KanbanColuna[] = [
  { id: 'prova_feita',    label: 'Prova Feita',       status: ['PROVA_FEITA'],          alvo: 'PROVA_FEITA' },
  { id: 'entrevista',     label: 'Entrevista',        status: ['ENTREVISTA_AGENDADA'],  alvo: 'ENTREVISTA_AGENDADA' },
  { id: 'aprovado',       label: 'Aprovado',          status: ['APROVADO'],             alvo: 'APROVADO' },
  { id: 'banco_talentos', label: 'Banco de Talentos', status: ['BANCO_TALENTOS'],       alvo: 'BANCO_TALENTOS' },
  { id: 'reprovado',      label: 'Reprovado',         status: ['REPROVADO'],            alvo: 'REPROVADO' },
]

type Candidato = {
  id: string
  criado_em: string
  nome: string
  cargo: string | null
  unidades: string[]
  score_final: number
  perfil: string | null
  alertas: string[]
  status: string
  foto_url: string | null
  ia_tipo_perfil: string | null
  perfil_gerente: string | null
  perfil_vendedor: string | null
  etapa_atual: number | null
  entrevista_data: string | null
  entrevista_resultado: string | null
  score_disciplina_v: number | null
  quiz_vendedor_v3: { versao: string; mix_pct: { N: number; R: number; E: number; L: number } } | null
  motivo_reprovacao: string | null
}

const PERFIL4_LABEL_L: Record<string, string> = {
  N: 'Nato', R: 'Relacional', E: 'Executor', L: 'Liderança',
}
const PERFIL4_DOT: Record<string, string> = { N: '🔴', R: '🔵', E: '🟢', L: '🟡' }
const PERFIL4_BAR_CLS: Record<string, string> = {
  N: 'bg-red-400', R: 'bg-blue-400', E: 'bg-green-400', L: 'bg-yellow-400',
}


function entrevistaVencida(c: Candidato): boolean {
  if (!c.entrevista_data || c.entrevista_resultado !== 'Aguardando') return false
  const hoje = new Date().toISOString().split('T')[0]
  return c.entrevista_data < hoje
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const selectCls =
  'border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] bg-white transition-colors cursor-pointer'

export const dynamic = 'force-dynamic'

export default function CandidatosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroStatusMacro, setFiltroStatusMacro] = useState('')
  const [filtroKanbanCargo, setFiltroKanbanCargo] = useState('')
  const [ordenacao, setOrdenacao] = useState<'recente' | 'score'>('recente')
  const [filtroSistema, setFiltroSistema] = useState('')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'kanban'>('lista')

  const STATUS_MACRO: Record<string, string[]> = {
    em_andamento:   ['EM_ANDAMENTO'],
    prova_feita:    ['PROVA_FEITA'],
    entrevista:     ['ENTREVISTA_AGENDADA'],
    aprovado:       ['APROVADO'],
    reprovado:      ['REPROVADO'],
    banco_talentos: ['BANCO_TALENTOS'],
  }

  const [verEmAndamento, setVerEmAndamento] = useState(false)
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ draggableId: string; destinoColunaId: string } | null>(null)

  useEffect(() => {
    async function carregar() {
      const p = await getPerfilUsuario(supabase)
      setPerfil(p)

      let query = supabase
        .from('candidatos')
        .select('id, criado_em, nome, cargo, unidades, score_final, perfil, alertas, status, foto_url, ia_tipo_perfil, perfil_gerente, perfil_vendedor, etapa_atual, entrevista_data, entrevista_resultado, score_disciplina_v, quiz_vendedor_v3, motivo_reprovacao')
        .is('expirado_em', null)
        .order('criado_em', { ascending: false })

      if (p?.role === 'gestor' && p.unidade) {
        query = query.contains('unidades', [p.unidade])
      }

      const { data } = await query
      if (data) setCandidatos(data)
      setCarregando(false)
    }
    carregar()
  }, [])

  const filtradosBase = candidatos.filter((c) => {
    if (visualizacao === 'lista') {
      if (verEmAndamento && c.status !== 'EM_ANDAMENTO') return false
      if (!verEmAndamento && c.status === 'EM_ANDAMENTO') return false
    }
    if (filtroUnidade && !c.unidades?.includes(filtroUnidade)) return false
    if (filtroCargo && c.cargo !== filtroCargo) return false
    if (filtroPerfil) {
      if (PERFIS_GERENTE_SET.has(filtroPerfil)) {
        if (!c.perfil_gerente?.includes(filtroPerfil)) return false
      } else if (PERFIS_VENDEDOR_SET.has(filtroPerfil)) {
        if (c.perfil_vendedor !== filtroPerfil) return false
      }
    }
    if (filtroStatusMacro && !STATUS_MACRO[filtroStatusMacro]?.includes(c.status)) return false
    if (filtroSistema && c.cargo === 'vendedor') {
      const isV3 = c.quiz_vendedor_v3?.versao === 'v3'
      if (filtroSistema === 'novo' && !isV3) return false
      if (filtroSistema === 'antigo' && isV3) return false
    }
    return true
  })

  const filtrados = [...filtradosBase].sort((a, b) =>
    ordenacao === 'score'
      ? (b.score_final ?? 0) - (a.score_final ?? 0)
      : new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  )

  async function sair() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const STATUS_RETORNO: Record<string, string> = {
    prova_feita: 'PROVA_FEITA',
    entrevista:  'ENTREVISTA_AGENDADA',
  }

  const STATUS_REPROVADO = ['REPROVADO']

  async function executarMove(draggableId: string, destinoColunaId: string) {
    const srcIdx = COLUNAS_KANBAN.findIndex(c => c.id === COLUNAS_KANBAN.find(col => col.status.includes(candidatos.find(c => c.id === draggableId)?.status ?? ''))?.id)
    const dstIdx = COLUNAS_KANBAN.findIndex(c => c.id === destinoColunaId)
    const coluna = COLUNAS_KANBAN[dstIdx]
    if (!coluna) return

    const movendoEsquerda = dstIdx < srcIdx
    const novoStatus = movendoEsquerda
      ? (STATUS_RETORNO[coluna.id] ?? coluna.alvo)
      : coluna.alvo

    setCandidatos((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: novoStatus } : c)),
    )
    await supabase.from('candidatos').update({ status: novoStatus }).eq('id', draggableId)
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const srcIdx = COLUNAS_KANBAN.findIndex(c => c.id === source.droppableId)
    const dstIdx = COLUNAS_KANBAN.findIndex(c => c.id === destination.droppableId)
    const movendoDireita = dstIdx > srcIdx

    const candidato = candidatos.find(c => c.id === draggableId)
    if (movendoDireita && candidato && STATUS_REPROVADO.includes(candidato.status)) {
      setConfirmMove({ draggableId, destinoColunaId: destination.droppableId })
      return
    }

    await executarMove(draggableId, destination.droppableId)
  }

  const filtroAtivo = filtroUnidade || filtroCargo || filtroPerfil || filtroStatusMacro || filtroSistema

  return (
    <div className="min-h-screen bg-white">
      {/* Header fixo */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">
            SELETO
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/equipe"
              className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Equipe
            </Link>
            {perfil?.role === 'master' && (
              <>
                <Link
                  href="/admin/dashboard"
                  className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/configuracoes"
                  className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                >
                  Configurações
                </Link>
              </>
            )}
            <button
              onClick={sair}
              className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-4">
        {/* Título + filtros + toggle */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">Candidatos</h1>

          <div className="flex items-center gap-3 flex-wrap">
            {perfil?.role === 'gestor' ? (
              <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-[#E5E5E5] bg-white text-[#0A0A0A]">
                {perfil.unidade}
              </span>
            ) : (
              <select
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value)}
                className={selectCls}
              >
                <option value="">Todas as unidades</option>
                {UNIDADES_OPCOES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            )}

            <select
              value={filtroCargo}
              onChange={(e) => { setFiltroCargo(e.target.value); setFiltroPerfil('') }}
              className={selectCls}
            >
              <option value="">Todos os cargos</option>
              <option value="gerente">Gerente</option>
              <option value="vendedor">Vendedor</option>
              <option value="caixa">Caixa</option>
            </select>

            {filtroCargo !== 'caixa' && (
              <select
                value={filtroPerfil}
                onChange={(e) => setFiltroPerfil(e.target.value)}
                className={selectCls}
              >
                <option value="">Todos os perfis</option>
                {(filtroCargo === 'gerente' ? PERFIS_GERENTE :
                  filtroCargo === 'vendedor' ? PERFIS_VENDEDOR :
                  [...PERFIS_GERENTE, ...PERFIS_VENDEDOR]
                ).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <select
              value={filtroStatusMacro}
              onChange={(e) => setFiltroStatusMacro(e.target.value)}
              className={selectCls}
            >
              <option value="">Todos os status</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="prova_feita">Prova Feita</option>
              <option value="entrevista">Entrevista</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="banco_talentos">Banco de Talentos</option>
            </select>

            {(filtroCargo === 'vendedor' || filtroCargo === '') && (
              <select
                value={filtroSistema}
                onChange={(e) => setFiltroSistema(e.target.value)}
                className={selectCls}
              >
                <option value="">Todos os sistemas</option>
                <option value="novo">Novo (v3)</option>
                <option value="antigo">Antigo</option>
              </select>
            )}

            {visualizacao === 'lista' && (
              <>
                <button
                  onClick={() => setVerEmAndamento((v) => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    verEmAndamento
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#6B6B6B] border-[#E5E5E5] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                  }`}
                >
                  Em andamento
                </button>
                <button
                  onClick={() => setOrdenacao((o) => o === 'recente' ? 'score' : 'recente')}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-[#E5E5E5] bg-white text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
                >
                  {ordenacao === 'recente' ? '↓ Mais recentes' : '↓ Maior score'}
                </button>
              </>
            )}

            {/* Toggle lista / kanban */}
            <div className="flex items-center border border-[#E5E5E5] rounded-lg overflow-hidden">
              <button
                onClick={() => setVisualizacao('lista')}
                title="Visualização lista"
                className={`p-2 transition-colors ${
                  visualizacao === 'lista'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={() => setVisualizacao('kanban')}
                title="Visualização kanban"
                className={`p-2 transition-colors border-l border-[#E5E5E5] ${
                  visualizacao === 'kanban'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2"   y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                  <rect x="6.25" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                  <rect x="10.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <div className="text-sm text-[#6B6B6B] py-16 text-center">Carregando…</div>
      ) : visualizacao === 'lista' ? (
        /* ── LISTA ───────────────────────────────────────────────────────── */
        <div className="max-w-[1280px] mx-auto px-6 pb-16">
          {filtrados.length === 0 ? (
            <div className="border border-[#E5E5E5] rounded-xl py-16 text-center text-sm text-[#6B6B6B]">
              Nenhum candidato encontrado.
            </div>
          ) : (
            <div className="border border-[#E5E5E5] rounded-xl overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '52px' }} />
                  <col />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                    {['', 'Nome', 'Cargo', 'Unidades', 'Score', 'Perfil', 'Status', 'Alertas', 'Data'].map((col) => (
                      <th
                        key={col}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtrados.map((c) => {
                    const temNovaIguacu = c.unidades?.includes('Nova Iguaçu')
                    const numAlertas = c.alertas?.length ?? 0
                    const vencida = entrevistaVencida(c)

                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-[#E5E5E5] last:border-0 hover:bg-[#FEE2E2] transition-colors ${
                          vencida ? 'bg-[#FEF2F2]' : temNovaIguacu ? 'bg-[#FAFAFA]' : 'bg-white'
                        }`}
                        style={!vencida && temNovaIguacu ? { boxShadow: 'inset 3px 0 0 #0A0A0A' } : undefined}
                      >
                        <td className="pl-5 pr-2 py-4 w-10">
                          <Link href={`/admin/candidatos/${c.id}`}>
                            {c.foto_url ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                <Image src={c.foto_url} alt={c.nome} fill className="object-cover" sizes="32px" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#E5E5E5] flex items-center justify-center">
                                <span className="text-xs font-semibold text-[#6B6B6B]">
                                  {c.nome.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </Link>
                        </td>

                        <td className="px-2 py-4 font-medium text-[#0A0A0A] whitespace-nowrap">
                          <Link href={`/admin/candidatos/${c.id}`} className="hover:underline">
                            {c.nome}
                          </Link>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {c.cargo ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${CARGO_CHIP[c.cargo] ?? 'bg-[#E5E5E5] text-[#0A0A0A]'}`}>
                              {CARGO_LABEL[c.cargo] ?? c.cargo}
                            </span>
                          ) : <span className="text-[#B0B0B0]">—</span>}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {c.unidades?.map((u) => (
                              <span
                                key={u}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border border-[#E5E5E5] text-[#6B6B6B]"
                              >
                                {u}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">
                          {c.score_final != null ? c.score_final.toFixed(1) : '—'}
                        </td>

                        <td className="px-5 py-4">
                          {c.cargo === 'gerente' ? (
                            c.perfil_gerente ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${perfilGerenteCls(c.perfil_gerente)}`}>
                                {c.perfil_gerente}
                              </span>
                            ) : <span className="text-[#B0B0B0]">—</span>
                          ) : c.cargo === 'vendedor' ? (
                            <div className="space-y-1.5">
                              {/* Mix bar v3 */}
                              {c.quiz_vendedor_v3?.versao === 'v3' && c.quiz_vendedor_v3.mix_pct ? (
                                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full max-w-[120px]">
                                  {(['N','R','E','L'] as const).map((p) => {
                                    const pct = c.quiz_vendedor_v3!.mix_pct[p] ?? 0
                                    return pct > 0 ? (
                                      <div
                                        key={p}
                                        title={`${PERFIL4_LABEL_L[p]} ${pct.toFixed(0)}%`}
                                        className={`${PERFIL4_BAR_CLS[p]} h-full`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    ) : null
                                  })}
                                </div>
                              ) : c.cargo === 'vendedor' ? (
                                <span className="text-[10px] text-[#B0B0B0]">sistema antigo</span>
                              ) : null}
                              {/* Coerência */}
                              {c.quiz_vendedor_v3?.versao === 'v3' && (
                                <span className="text-[10px] text-[#6B6B6B]">
                                  {(c.score_disciplina_v ?? 0) <= 1 ? '✅ coerente' : `⚠️ ${c.score_disciplina_v} contradições`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#B0B0B0]">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {vencida ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FEF2F2] text-red-700 border border-red-200">
                              Entrevista Vencida
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <StatusChip status={c.status} />
                              {c.status === 'REPROVADO' && c.motivo_reprovacao && (
                                <p className="text-[10px] text-[#6B6B6B] leading-tight">{c.motivo_reprovacao}</p>
                              )}
                              {c.status === 'BANCO_TALENTOS' && c.motivo_reprovacao && (
                                <p className="text-[10px] text-[#6B6B6B] leading-tight">{c.motivo_reprovacao}</p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {vencida && (
                              <span
                                title={`Entrevista do dia ${c.entrevista_data ? (() => { const [y,m,d] = c.entrevista_data!.split('-'); return `${d}/${m}/${y}` })() : ''} não finalizada — atualize o resultado`}
                                className="cursor-default"
                              >
                                ⚠️
                              </span>
                            )}
                            {numAlertas > 0 ? (
                              <span className="text-red-500 font-semibold">{numAlertas}</span>
                            ) : (
                              !vencida && <span className="text-[#B0B0B0]">0</span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[#6B6B6B] whitespace-nowrap">
                          {formatarData(c.criado_em)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!carregando && (
            <p className="mt-3 text-xs text-[#6B6B6B]">
              {filtrados.length} candidato{filtrados.length !== 1 ? 's' : ''}
              {filtroAtivo ? ' (filtrado)' : ''}
            </p>
          )}
        </div>
      ) : (
        /* ── KANBAN ──────────────────────────────────────────────────────── */
        <div className="px-6 pb-16 overflow-x-auto">
          {/* Filtro de cargo do kanban */}
          <div className="flex items-center gap-2 mb-4">
            {[{ value: '', label: 'Todos' }, { value: 'gerente', label: 'Gerente' }, { value: 'vendedor', label: 'Vendedor' }, { value: 'caixa', label: 'Caixa' }].map(op => (
              <button
                key={op.value}
                onClick={() => setFiltroKanbanCargo(op.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroKanbanCargo === op.value
                    ? op.value === '' ? 'bg-[#0A0A0A] text-white' : `${CARGO_CHIP[op.value]} ring-2 ring-offset-1 ring-current`
                    : 'border border-[#E5E5E5] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] bg-white'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 min-w-max pb-2">
              {COLUNAS_KANBAN.map((coluna) => {
                const cards = filtrados.filter((c) => coluna.status.includes(c.status) && (!filtroKanbanCargo || c.cargo === filtroKanbanCargo))
                return (
                  <div
                    key={coluna.id}
                    className="flex flex-col w-[260px] rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]"
                  >
                    {/* Header da coluna */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E5E5E5]">
                      <span className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
                        {coluna.label}
                      </span>
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5E5E5] text-xs font-semibold text-[#6B6B6B]">
                        {cards.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <Droppable droppableId={coluna.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-2 overflow-y-auto transition-colors ${
                            snapshot.isDraggingOver ? 'bg-[#EBEBEB]' : ''
                          }`}
                          style={{ maxHeight: 'calc(100vh - 220px)', minHeight: '80px' }}
                        >
                          {cards.map((c, index) => (
                            <Draggable key={c.id} draggableId={c.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => router.push(`/admin/candidatos/${c.id}`)}
                                  className={`bg-white rounded-lg border border-[#E5E5E5] p-3 mb-2 last:mb-0 cursor-pointer select-none transition-shadow ${
                                    snapshot.isDragging
                                      ? 'shadow-lg ring-1 ring-[#0A0A0A]/10'
                                      : 'shadow-sm hover:shadow-md'
                                  }`}
                                >
                                  {/* Avatar + Nome */}
                                  <div className="flex items-center gap-2 mb-2">
                                    {c.foto_url ? (
                                      <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                        <Image
                                          src={c.foto_url}
                                          alt={c.nome}
                                          fill
                                          className="object-cover"
                                          sizes="28px"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-[#E5E5E5] flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-semibold text-[#6B6B6B]">
                                          {c.nome.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-sm font-medium text-[#0A0A0A] leading-tight line-clamp-2">
                                      {c.nome}
                                    </span>
                                  </div>

                                  {/* Cargo */}
                                  {c.cargo && (
                                    <div className="mb-1.5">
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${CARGO_CHIP[c.cargo] ?? 'bg-[#E5E5E5] text-[#0A0A0A]'}`}>
                                        {CARGO_LABEL[c.cargo] ?? c.cargo}
                                      </span>
                                    </div>
                                  )}

                                  {/* Score + Perfil */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    {c.cargo === 'gerente' ? (
                                      c.perfil_gerente && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${perfilGerenteCls(c.perfil_gerente)}`}>
                                          {c.perfil_gerente}
                                        </span>
                                      )
                                    ) : c.cargo === 'vendedor' ? (
                                      c.perfil_vendedor && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#F3F4F6] text-[#0A0A0A]">
                                          {PERFIL4_LABEL_L[c.perfil_vendedor] ?? c.perfil_vendedor}
                                        </span>
                                      )
                                    ) : null}
                                    {c.score_final != null && (
                                      <span className="text-xs font-semibold text-[#6B6B6B] tabular-nums">
                                        {c.score_final.toFixed(1)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Vendedor v3 — mix de perfil */}
                                  {c.cargo === 'vendedor' && c.score_final != null && (() => {
                                    const isV3 = c.quiz_vendedor_v3?.versao === 'v3'
                                    return (
                                      <div className="mb-2 space-y-1">
                                        {isV3 && c.quiz_vendedor_v3!.mix_pct && (
                                          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                                            {(['N','R','E','L'] as const).map((p) => {
                                              const pct = c.quiz_vendedor_v3!.mix_pct[p] ?? 0
                                              return pct > 0 ? (
                                                <div key={p} className={`${PERFIL4_BAR_CLS[p]} h-full`} style={{ width: `${pct}%` }} title={`${PERFIL4_DOT[p]} ${pct.toFixed(0)}%`} />
                                              ) : null
                                            })}
                                          </div>
                                        )}
                                        {isV3 && (
                                          <span className="text-[9px] text-[#6B6B6B]">
                                            {(c.score_disciplina_v ?? 0) <= 1 ? '✅ coerente' : `⚠️ ${c.score_disciplina_v} contradições`}
                                          </span>
                                        )}
                                        {!isV3 && <span className="text-[9px] text-[#B0B0B0]">sistema antigo</span>}
                                      </div>
                                    )
                                  })()}

                                  {/* Unidades */}
                                  {c.unidades?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {c.unidades.map((u) => (
                                        <span
                                          key={u}
                                          className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium border border-[#E5E5E5] text-[#6B6B6B]"
                                        >
                                          {u}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Status */}
                                  <StatusChip status={c.status} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>

          {!carregando && (
            <p className="mt-3 text-xs text-[#6B6B6B]">
              {filtrados.length} candidato{filtrados.length !== 1 ? 's' : ''}
              {filtroAtivo ? ' (filtrado)' : ''}
            </p>
          )}
        </div>
      )}

      {/* Modal — confirmar mover reprovado */}
      {confirmMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">Candidato Reprovado</h2>
            <p className="text-sm text-[#6B6B6B] leading-relaxed mb-6">
              Este candidato está com status Reprovado. Tem certeza que deseja movê-lo para a próxima etapa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMove(null)}
                className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { draggableId, destinoColunaId } = confirmMove
                  setConfirmMove(null)
                  await executarMove(draggableId, destinoColunaId)
                }}
                className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] transition-colors"
              >
                Sim, mover mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
