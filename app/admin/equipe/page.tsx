'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { getPerfilUsuario, type PerfilUsuario } from '@/lib/auth'
import {
  BLOCO_ENGAJAMENTO,
  BLOCO_AMBICAO_ESCALAS,
  BLOCO_AMBICAO_VISAO,
  BLOCO_REMUNERACAO,
  BLOCO_PERFIL,
  labelObjetivo,
} from '@/lib/perguntas-avaliacao'

const LOJAS = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']

const CARGO_LABEL: Record<string, string> = {
  gerente: 'Gerente', vendedor: 'Vendedor', caixa: 'Caixa',
}

const RADAR_CORES = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F97316']

type Colaborador = {
  id: string
  candidato_id: string | null
  cpf: string
  nome: string
  cargo: string
  loja: string
  estado: 'TREINAMENTO' | 'ATIVO' | 'DESLIGADO'
  data_entrada: string
  data_efetivacao: string | null
  data_saida: string | null
  motivo_saida: string | null
  movido_por: string | null
  criado_em: string
  nivel: number
}

type Autoavaliacao = {
  id: string
  colaborador_id: string
  periodo: string
  respondido_em: string | null
  mix_pct: { N: number; R: number; E: number; L: number } | null
  perfil_dominante: string | null
  texto_gestor?: string
  texto_melhoria?: string | null
  criado_em: string
  // Engajamento
  eng_pertencimento: number | null
  eng_longevidade: number | null
  eng_enps: number | null
  // Ambição
  amb_objetivo: string | null
  amb_responsabilidades: number | null
  amb_visao_2anos: string | null
  // Remuneração
  rem_justa: number | null
  rem_reconhecimento: number | null
  // Perfil
  respostas_perfil: Record<string, { resposta: string; perfil: string; peso: number; grupo: string }> | null
}

type AvaliacaoGestor = {
  id: string
  colaborador_id: string
  periodo: string
  autoavaliacao_id: string | null
  cota_pct: number | null
  desempenho_vendas: number | null
  comportamento: number | null
  pontos_fortes: string | null
  pontos_desenvolver: string | null
  recomendacao: string | null
  criado_em: string
}

type LinkColetivo = {
  id: string
  token: string
  rotulo: string
  criado_em: string
  encerrado: boolean
  total_esperados: number
  total_respondidos: number
}

type ColabPendente = { nome: string; loja: string; cargo: string; respondido_em?: string }
type PendentesData = {
  link: { id: string; rotulo: string; criado_em: string }
  responderam: ColabPendente[]
  faltam: ColabPendente[]
}

function BarraEscala({ valor, max }: { valor: number | null; max: 5 | 10 }) {
  if (valor === null) return <span className="text-[#B0B0B0]">—</span>
  const pct = (valor / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#F0F0F0] rounded-full h-1.5">
        <div className="bg-[#0A0A0A] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#0A0A0A] font-medium w-8 text-right">{valor}/{max}</span>
    </div>
  )
}

function BadgeRecomendacao({ valor }: { valor: string | null }) {
  if (!valor) return <span className="text-[#B0B0B0]">—</span>
  const map: Record<string, { label: string; cls: string }> = {
    manter:   { label: 'Manter',   cls: 'bg-green-100 text-green-800' },
    promover: { label: 'Promover', cls: 'bg-blue-100 text-blue-800' },
    atencao:  { label: 'Atenção',  cls: 'bg-amber-100 text-amber-800' },
  }
  const m = map[valor] ?? { label: valor, cls: 'bg-gray-100 text-gray-800' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
}

function PillDesempenho({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-sm text-[#B0B0B0]">—</span>
  const [bg, fg] =
    valor >= 100 ? ['#E4F7EA', '#166B3B'] :
    valor >= 80  ? ['#FAEEDA', '#854F0B'] :
                   ['#FCEBEB', '#791F1F']
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: bg, color: fg }}
    >
      {valor}%
    </span>
  )
}

function estadoChip(estado: string) {
  if (estado === 'ATIVO') return 'bg-green-100 text-green-700'
  if (estado === 'TREINAMENTO') return 'bg-amber-100 text-amber-800'
  return 'bg-[#F3F4F6] text-[#6B6B6B]'
}

function estadoLabel(estado: string) {
  if (estado === 'ATIVO') return 'Ativo'
  if (estado === 'TREINAMENTO') return 'Treinamento'
  return 'Desligado'
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export const dynamic = 'force-dynamic'

export default function EquipePage() {
  const router = useRouter()
  const supabase = createClient()

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [verDesligados, setVerDesligados] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'equipe' | 'avaliacoes'>('equipe')

  // Modal desligar
  const [modalDesligar, setModalDesligar] = useState<{ id: string; nome: string } | null>(null)
  const [dataSaida, setDataSaida] = useState('')
  const [motivoSaida, setMotivoSaida] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal recontratar
  const [modalRecontratar, setModalRecontratar] = useState<{ id: string; nome: string } | null>(null)
  const [lojaRecontratar, setLojaRecontratar] = useState('')
  const [recontratando, setRecontratando] = useState(false)
  const [erroRecontratar, setErroRecontratar] = useState('')

  // Aba Avaliações — Filtro cargo + links coletivos + pendentes
  const [filtroCargoAval, setFiltroCargoAval] = useState<'todos' | 'vendedor' | 'gerente' | 'caixa'>('todos')
  const [linksColetivos, setLinksColetivos] = useState<LinkColetivo[]>([])
  const [carregandoLinks, setCarregandoLinks] = useState(false)
  const [modalPendentes, setModalPendentes] = useState<{ id: string; rotulo: string } | null>(null)
  const [pendentesData, setPendentesData] = useState<PendentesData | null>(null)
  const [carregandoPendentes, setCarregandoPendentes] = useState(false)
  // Mapa colaborador_id → respondido_em para o período do link coletivo mais recente
  const [respondidosLinkRecente, setRespondidosLinkRecente] = useState<Map<string, string>>(new Map())

  // Aba Avaliações — Link coletivo
  const [modalColetivo, setModalColetivo] = useState(false)
  const [rotuloColetivo, setRotuloColetivo] = useState('')
  const [gerandoColetivo, setGerandoColetivo] = useState(false)
  const [linkColetivoGerado, setLinkColetivoGerado] = useState('')
  const [erroColetivo, setErroColetivo] = useState('')

  // Aba Avaliações — Gerar link
  const [modalGerarLink, setModalGerarLink] = useState<{ id: string; nome: string } | null>(null)
  const [periodoLink, setPeriodoLink] = useState('')
  const [gerandoLink, setGerandoLink] = useState(false)
  const [linkGerado, setLinkGerado] = useState('')
  const [erroLink, setErroLink] = useState('')

  // Aba Avaliações — Histórico
  const [modalHistorico, setModalHistorico] = useState<{ id: string; nome: string; cargo: string } | null>(null)
  const [historicoCargando, setHistoricoCargando] = useState(false)
  const [autoavaliacoes, setAutoavaliacoes] = useState<Autoavaliacao[]>([])
  const [avaliacoesGestor, setAvaliacoesGestor] = useState<AvaliacaoGestor[]>([])

  // Formulário gestor
  const [formGestor, setFormGestor] = useState({
    autoavaliacao_id: '',
    periodo: '',
    cota_pct: '',
    desempenho_vendas: '',
    comportamento: '',
    pontos_fortes: '',
    pontos_desenvolver: '',
    recomendacao: '',
  })
  const [salvandoGestor, setSalvandoGestor] = useState(false)
  const [erroGestor, setErroGestor] = useState('')
  const [sucessoGestor, setSucessoGestor] = useState(false)

  useEffect(() => {
    async function carregar() {
      const p = await getPerfilUsuario(supabase)
      setPerfil(p)

      let query = supabase
        .from('colaboradores')
        .select('*')
        .order('criado_em', { ascending: false })

      if (p?.role === 'gestor' && p.unidade) {
        query = query.eq('loja', p.unidade)
      }

      const { data } = await query
      if (data) setColaboradores(data as Colaborador[])
      setCarregando(false)
    }
    carregar()
  }, [])

  // Carrega links coletivos ao entrar na aba Avaliações (lazy)
  useEffect(() => {
    if (abaAtiva === 'avaliacoes' && linksColetivos.length === 0 && !carregandoLinks) {
      carregarLinksColetivos()
    }
  }, [abaAtiva])

  const filtrados = colaboradores.filter((c) =>
    verDesligados ? c.estado === 'DESLIGADO' : c.estado !== 'DESLIGADO'
  )

  const totalAtivos = colaboradores.filter((c) => c.estado === 'ATIVO').length
  const totalTreino = colaboradores.filter((c) => c.estado === 'TREINAMENTO').length
  const totalDesligados = colaboradores.filter((c) => c.estado === 'DESLIGADO').length
  const totalLojas = new Set(
    colaboradores.filter((c) => c.estado !== 'DESLIGADO').map((c) => c.loja)
  ).size

  async function efetivar(colaborador_id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/efetivar-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colaborador_id }),
    })
    if (res.ok) {
      const hoje = new Date().toISOString().split('T')[0]
      setColaboradores((prev) =>
        prev.map((c) =>
          c.id === colaborador_id ? { ...c, estado: 'ATIVO' as const, data_efetivacao: hoje } : c
        )
      )
    }
  }

  async function confirmarDesligamento() {
    if (!modalDesligar || !dataSaida || !motivoSaida.trim()) return
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/desligar-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        colaborador_id: modalDesligar.id,
        data_saida: dataSaida,
        motivo_saida: motivoSaida,
      }),
    })
    if (res.ok) {
      setColaboradores((prev) =>
        prev.map((c) =>
          c.id === modalDesligar.id
            ? { ...c, estado: 'DESLIGADO' as const, data_saida: dataSaida, motivo_saida: motivoSaida }
            : c
        )
      )
      setModalDesligar(null)
      setDataSaida('')
      setMotivoSaida('')
    }
    setSalvando(false)
  }

  function renderEstrelas(nivel: number, cargo: string): React.ReactNode {
    const n = Math.max(1, nivel)
    if (n <= 5) {
      return (
        <span className="inline-flex items-center gap-1 leading-none">
          <span className="text-amber-400">{'★'.repeat(n)}</span>
          <span className="text-[#D1D5DB]">{'☆'.repeat(5 - n)}</span>
          {cargo === 'vendedor' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/insignias/nivel-${n}.png`} alt={`Insígnia nível ${n}`} className="h-5 w-auto inline-block" />
          )}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 leading-none">
        <span className="text-amber-400">{'★'.repeat(n)}</span>
        {cargo === 'vendedor' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/insignias/nivel-${Math.min(n, 5)}.png`} alt={`Insígnia nível ${n}`} className="h-5 w-auto inline-block" />
        )}
      </span>
    )
  }

  function calcularTempo(entrada: string | null, saida: string | null): string {
    if (!entrada || !saida) return ''
    const ms = new Date(saida).getTime() - new Date(entrada).getTime()
    const dias = Math.floor(ms / (1000 * 60 * 60 * 24))
    if (dias < 30) return `${dias}d`
    const meses = Math.floor(dias / 30)
    if (meses < 12) return `${meses}m`
    const anos = Math.floor(meses / 12)
    const mesesRest = meses % 12
    return mesesRest > 0 ? `${anos}a ${mesesRest}m` : `${anos}a`
  }

  async function alterarNivel(colaborador_id: string, novoNivel: number) {
    if (novoNivel < 1) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/alterar-nivel-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colaborador_id, nivel: novoNivel }),
    })
    if (res.ok) {
      setColaboradores((prev) =>
        prev.map((c) => c.id === colaborador_id ? { ...c, nivel: novoNivel } : c)
      )
    }
  }

  async function recontratar() {
    if (!modalRecontratar || !lojaRecontratar) return
    setRecontratando(true)
    setErroRecontratar('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/recontratar-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colaborador_id: modalRecontratar.id, loja: lojaRecontratar }),
    })

    if (res.ok) {
      const { colaborador_id: novoId } = await res.json()
      const hoje = new Date().toISOString().split('T')[0]
      const original = colaboradores.find((c) => c.id === modalRecontratar.id)!
      setColaboradores((prev) => [
        ...prev,
        {
          ...original,
          id: novoId,
          loja: lojaRecontratar,
          estado: 'ATIVO' as const,
          data_entrada: hoje,
          data_efetivacao: hoje,
          data_saida: null,
          motivo_saida: null,
        },
      ])
      setModalRecontratar(null)
      setLojaRecontratar('')
    } else {
      const json = await res.json()
      setErroRecontratar(
        json.error === 'ja_tem_vinculo_ativo'
          ? 'Esta pessoa já tem um vínculo ativo ou em treinamento.'
          : 'Erro ao recontratar. Tente novamente.'
      )
    }
    setRecontratando(false)
  }

  // ── Avaliações ──

  async function carregarLinksColetivos() {
    setCarregandoLinks(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const res = await fetch('/api/links-coletivos', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const links: LinkColetivo[] = await res.json()
      setLinksColetivos(links)
      // Busca respondidos do período do link mais recente para badge na tabela
      // Usa periodo (= rotulo) em vez de link_coletivo_id — cobre links individuais também
      if (links.length > 0) {
        const periodo = encodeURIComponent(links[0].rotulo)
        const resResp = await fetch(`/api/respondidos-periodo?periodo=${periodo}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resResp.ok) {
          const rows: { colaborador_id: string; respondido_em: string }[] = await resResp.json()
          setRespondidosLinkRecente(new Map(rows.map((r) => [r.colaborador_id, r.respondido_em])))
        }
      } else {
        setRespondidosLinkRecente(new Map())
      }
    }
    setCarregandoLinks(false)
  }

  async function abrirPendentes(link: LinkColetivo) {
    setModalPendentes({ id: link.id, rotulo: link.rotulo })
    setPendentesData(null)
    setCarregandoPendentes(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const res = await fetch(`/api/pendentes-link?link_id=${link.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setPendentesData(await res.json())
    setCarregandoPendentes(false)
  }

  async function gerarLinkColetivo() {
    if (!rotuloColetivo.trim()) return
    setGerandoColetivo(true)
    setErroColetivo('')
    setLinkColetivoGerado('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/gerar-link-coletivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rotulo: rotuloColetivo.trim() }),
    })
    const json = await res.json()
    if (res.ok) {
      setLinkColetivoGerado(json.link)
    } else {
      setErroColetivo(json.error ?? 'Erro ao gerar link.')
    }
    setGerandoColetivo(false)
  }

  async function gerarLink() {
    if (!modalGerarLink || !periodoLink.trim()) return
    setGerandoLink(true)
    setErroLink('')
    setLinkGerado('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/gerar-autoavaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colaborador_id: modalGerarLink.id, periodo: periodoLink.trim() }),
    })
    const json = await res.json()
    if (res.ok) {
      setLinkGerado(json.link)
    } else {
      setErroLink(json.error ?? 'Erro ao gerar link.')
    }
    setGerandoLink(false)
  }

  async function abrirHistorico(colab: Colaborador) {
    setModalHistorico({ id: colab.id, nome: colab.nome, cargo: colab.cargo })
    setAutoavaliacoes([])
    setAvaliacoesGestor([])
    setHistoricoCargando(true)
    setSucessoGestor(false)
    setErroGestor('')
    setFormGestor({ autoavaliacao_id: '', periodo: '', cota_pct: '', desempenho_vendas: '', comportamento: '', pontos_fortes: '', pontos_desenvolver: '', recomendacao: '' })

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch(`/api/avaliacoes-colaborador?colaborador_id=${colab.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const json = await res.json()
      setAutoavaliacoes(json.autoavaliacoes ?? [])
      setAvaliacoesGestor(json.avaliacoes_gestor ?? [])
    }
    setHistoricoCargando(false)
  }

  async function salvarAvaliacaoGestor() {
    if (!modalHistorico || !formGestor.periodo.trim()) return
    setSalvandoGestor(true)
    setErroGestor('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/salvar-avaliacao-gestor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        colaborador_id: modalHistorico.id,
        periodo: formGestor.periodo.trim(),
        autoavaliacao_id: formGestor.autoavaliacao_id || null,
        cota_pct: formGestor.cota_pct ? Number(formGestor.cota_pct) : null,
        desempenho_vendas: formGestor.desempenho_vendas ? Number(formGestor.desempenho_vendas) : null,
        comportamento: formGestor.comportamento ? Number(formGestor.comportamento) : null,
        pontos_fortes: formGestor.pontos_fortes || null,
        pontos_desenvolver: formGestor.pontos_desenvolver || null,
        recomendacao: formGestor.recomendacao || null,
      }),
    })
    if (res.ok) {
      setSucessoGestor(true)
      // Recarrega avaliações
      abrirHistorico({ id: modalHistorico.id, nome: modalHistorico.nome, cargo: modalHistorico.cargo } as Colaborador)
    } else {
      const json = await res.json()
      setErroGestor(json.error ?? 'Erro ao salvar.')
    }
    setSalvandoGestor(false)
  }

  // Dados do radar
  function radarData(autos: Autoavaliacao[]) {
    const respondidas = autos.filter((a) => a.respondido_em && a.mix_pct).slice(0, 5)
    if (respondidas.length === 0) return null
    const subjects = [
      { key: 'N', label: 'Nato' },
      { key: 'R', label: 'Relacional' },
      { key: 'E', label: 'Executor' },
      { key: 'L', label: 'Liderança' },
    ]
    return {
      data: subjects.map((s) => {
        const row: Record<string, unknown> = { subject: s.label }
        respondidas.forEach((a) => {
          row[a.periodo] = a.mix_pct?.[s.key as 'N' | 'R' | 'E' | 'L'] ?? 0
        })
        return row
      }),
      periodos: respondidas.map((a) => a.periodo),
    }
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const ativosParaAval = colaboradores.filter((c) =>
    c.estado !== 'DESLIGADO' &&
    (filtroCargoAval === 'todos' || c.cargo === filtroCargoAval)
  )

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">
            SELETO
          </span>
          <div className="flex items-center gap-4">
            {perfil?.role === 'master' && (
              <>
                <Link href="/admin/dashboard" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/candidatos" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Candidatos
                </Link>
                <Link href="/admin/configuracoes" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Configurações
                </Link>
              </>
            )}
            {perfil?.role === 'gestor' && (
              <Link href="/admin/candidatos" className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                Candidatos
              </Link>
            )}
            <button onClick={sair} className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-16">
        {/* Título + tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">Equipe</h1>
          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex border border-[#E5E5E5] rounded-lg overflow-hidden">
              <button
                onClick={() => { setAbaAtiva('equipe'); setVerDesligados(false) }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  abaAtiva === 'equipe'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Equipe
              </button>
              <button
                onClick={() => setAbaAtiva('avaliacoes')}
                className={`px-4 py-2 text-sm font-medium border-l border-[#E5E5E5] transition-colors ${
                  abaAtiva === 'avaliacoes'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Avaliações
              </button>
            </div>
            {abaAtiva === 'equipe' && (
              <button
                onClick={() => setVerDesligados((v) => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  verDesligados
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#6B6B6B] border-[#E5E5E5] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                }`}
              >
                Ver desligados
              </button>
            )}
          </div>
        </div>

        {/* ══ ABA EQUIPE ══ */}
        {abaAtiva === 'equipe' && (
          <>
            {/* Cards de resumo */}
            {!verDesligados && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Ativos', valor: totalAtivos, cor: 'text-green-700' },
                  { label: 'Em treinamento', valor: totalTreino, cor: 'text-amber-700' },
                  { label: 'Lojas ativas', valor: totalLojas, cor: 'text-[#0A0A0A]' },
                  { label: 'Desligados', valor: totalDesligados, cor: 'text-[#6B6B6B]' },
                ].map(({ label, valor, cor }) => (
                  <div key={label} className="border border-[#E5E5E5] rounded-xl p-4">
                    <p className={`text-2xl font-semibold tabular-nums ${cor}`}>{valor}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {carregando ? (
              <div className="text-sm text-[#6B6B6B] py-16 text-center">Carregando…</div>
            ) : filtrados.length === 0 ? (
              <div className="border border-[#E5E5E5] rounded-xl py-16 text-center text-sm text-[#6B6B6B]">
                {verDesligados ? 'Nenhum colaborador desligado.' : 'Nenhum colaborador ativo ou em treinamento.'}
              </div>
            ) : (
              <div className="space-y-8">
                {LOJAS.filter((loja) => filtrados.some((c) => c.loja === loja)).map((loja) => {
                  const grupo = filtrados.filter((c) => c.loja === loja)
                  return (
                    <div key={loja}>
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">
                          {loja}
                        </h2>
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5E5E5] text-xs font-semibold text-[#6B6B6B]">
                          {grupo.length}
                        </span>
                      </div>
                      <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                              {['Nome', 'Cargo', 'Estado', 'Entrada', 'Efetivação', 'Origem', 'Ações'].map((col) => (
                                <th
                                  key={col}
                                  className="text-left px-5 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider whitespace-nowrap"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.map((c) => (
                              <tr
                                key={c.id}
                                className="border-b border-[#E5E5E5] last:border-0 bg-white hover:bg-[#FAFAFA] transition-colors"
                              >
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className="font-medium text-[#0A0A0A]">{c.nome}</span>
                                  {c.cargo === 'gerente' && (
                                    <span className="text-amber-400 ml-1" title="Gerente">👑</span>
                                  )}
                                  {c.estado !== 'DESLIGADO' && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span title={`Nível ${c.nivel}`} className="text-xs leading-none">
                                        <span className="text-[10px] text-[#6B6B6B] mr-0.5">N{c.nivel}</span>
                                        {renderEstrelas(c.nivel, c.cargo)}
                                      </span>
                                      {perfil?.role === 'master' && (
                                        <div className="flex items-center gap-0.5 ml-1">
                                          <button
                                            onClick={() => alterarNivel(c.id, c.nivel - 1)}
                                            disabled={c.nivel <= 1}
                                            className="w-4 h-4 flex items-center justify-center rounded text-[10px] text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Diminuir nível"
                                          >
                                            −
                                          </button>
                                          <button
                                            onClick={() => alterarNivel(c.id, c.nivel + 1)}
                                            className="w-4 h-4 flex items-center justify-center rounded text-[10px] text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F0F0F0] transition-colors"
                                            title="Aumentar nível"
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-[#6B6B6B] whitespace-nowrap">
                                  {CARGO_LABEL[c.cargo] ?? c.cargo}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${estadoChip(c.estado)}`}>
                                    {estadoLabel(c.estado)}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-[#6B6B6B] whitespace-nowrap tabular-nums">
                                  {formatarData(c.data_entrada)}
                                </td>
                                <td className="px-5 py-3.5 text-[#6B6B6B] whitespace-nowrap tabular-nums">
                                  {formatarData(c.data_efetivacao)}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {c.candidato_id ? (
                                    <Link
                                      href={`/admin/candidatos/${c.candidato_id}`}
                                      className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-2 transition-colors"
                                    >
                                      ver candidato →
                                    </Link>
                                  ) : (
                                    <span className="text-[#B0B0B0]">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {!verDesligados ? (
                                    <div className="flex items-center gap-3">
                                      {c.estado === 'TREINAMENTO' && (
                                        <button
                                          onClick={() => efetivar(c.id)}
                                          className="text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                                        >
                                          Efetivar
                                        </button>
                                      )}
                                      {(c.estado === 'TREINAMENTO' || c.estado === 'ATIVO') && (
                                        <button
                                          onClick={() => {
                                            setModalDesligar({ id: c.id, nome: c.nome })
                                            setDataSaida(new Date().toISOString().split('T')[0])
                                            setMotivoSaida('')
                                          }}
                                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                                        >
                                          Desligar
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs text-[#6B6B6B] tabular-nums">{formatarData(c.data_saida)}</span>
                                      {c.motivo_saida && (
                                        <span className="text-[10px] text-[#9B9B9B] max-w-[180px] truncate" title={c.motivo_saida}>
                                          {c.motivo_saida}
                                        </span>
                                      )}
                                      {calcularTempo(c.data_entrada, c.data_saida) && (
                                        <span className="text-[10px] text-[#B0B0B0]">
                                          {calcularTempo(c.data_entrada, c.data_saida)} na empresa
                                        </span>
                                      )}
                                      {perfil?.role === 'master' && (
                                        <button
                                          onClick={() => { setErroRecontratar(''); setLojaRecontratar(''); setModalRecontratar({ id: c.id, nome: c.nome }) }}
                                          className="mt-1 text-xs font-medium text-[#0A0A0A] hover:text-green-700 transition-colors text-left"
                                        >
                                          Recontratar →
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!carregando && (
              <p className="mt-4 text-xs text-[#6B6B6B]">
                {filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}
                {verDesligados ? ' desligados' : ' ativos'}
              </p>
            )}
          </>
        )}

        {/* ══ ABA AVALIAÇÕES ══ */}
        {abaAtiva === 'avaliacoes' && (
          <>
            {/* Header da aba: botão coletivo (master) + filtro cargo */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {perfil?.role === 'master' && (
                  <button
                    onClick={() => { setModalColetivo(true); setRotuloColetivo(''); setLinkColetivoGerado(''); setErroColetivo('') }}
                    className="px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors"
                  >
                    + Gerar link coletivo
                  </button>
                )}
              </div>
              <select
                value={filtroCargoAval}
                onChange={(e) => setFiltroCargoAval(e.target.value as typeof filtroCargoAval)}
                className="border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors"
              >
                <option value="todos">Todos os cargos</option>
                <option value="vendedor">Vendedor</option>
                <option value="gerente">Gerente</option>
                <option value="caixa">Caixa</option>
              </select>
            </div>

            {/* Painel de links coletivos */}
            {(linksColetivos.length > 0 || carregandoLinks) && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Links Coletivos</h3>
                {carregandoLinks ? (
                  <p className="text-sm text-[#6B6B6B]">Carregando links…</p>
                ) : (
                  <div className="space-y-2">
                    {linksColetivos.map((lk) => {
                      const pct = lk.total_esperados > 0
                        ? Math.round((lk.total_respondidos / lk.total_esperados) * 100)
                        : 0
                      const encerrado = lk.encerrado || lk.total_respondidos >= lk.total_esperados
                      return (
                        <div key={lk.id} className="border border-[#E5E5E5] rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[#0A0A0A]">{lk.rotulo}</span>
                              {encerrado && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md">
                                  ✓ Encerrado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[140px] h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${encerrado ? 'bg-green-500' : 'bg-[#0A0A0A]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-[#6B6B6B] tabular-nums whitespace-nowrap">
                                {lk.total_respondidos}/{lk.total_esperados} responderam
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirPendentes(lk)}
                              className="text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                            >
                              Ver pendentes
                            </button>
                            {perfil?.role === 'master' && (
                              <button
                                onClick={() => {
                                  setRotuloColetivo(`${lk.rotulo} (nova rodada)`)
                                  setLinkColetivoGerado('')
                                  setErroColetivo('')
                                  setModalColetivo(true)
                                }}
                                className="text-xs font-medium text-[#0A0A0A] hover:text-amber-600 transition-colors"
                              >
                                Nova rodada →
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Separador */}
            <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-4">Por colaborador</h3>

            {carregando ? (
              <div className="text-sm text-[#6B6B6B] py-16 text-center">Carregando…</div>
            ) : ativosParaAval.length === 0 ? (
              <div className="border border-[#E5E5E5] rounded-xl py-16 text-center text-sm text-[#6B6B6B]">
                {filtroCargoAval === 'todos' ? 'Nenhum colaborador ativo.' : `Nenhum ${CARGO_LABEL[filtroCargoAval]?.toLowerCase() ?? filtroCargoAval} ativo.`}
              </div>
            ) : (
              <div className="space-y-8">
                {LOJAS.filter((loja) => ativosParaAval.some((c) => c.loja === loja)).map((loja) => {
                  const grupo = ativosParaAval.filter((c) => c.loja === loja)
                  return (
                    <div key={loja}>
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">{loja}</h2>
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5E5E5] text-xs font-semibold text-[#6B6B6B]">
                          {grupo.length}
                        </span>
                      </div>
                      <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                              {['Nome', 'Cargo', 'Estado', 'Ações'].map((col) => (
                                <th key={col} className="text-left px-5 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.map((c) => (
                              <tr key={c.id} className="border-b border-[#E5E5E5] last:border-0 bg-white hover:bg-[#FAFAFA] transition-colors">
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className="font-medium text-[#0A0A0A]">{c.nome}</span>
                                  {c.cargo === 'gerente' && <span className="text-amber-400 ml-1">👑</span>}
                                  {respondidosLinkRecente.has(c.id) && (() => {
                                    const dt = respondidosLinkRecente.get(c.id)!
                                    const [y, m, d] = dt.split('T')[0].split('-')
                                    return (
                                      <span
                                        title={`Respondeu em ${d}/${m}/${y}`}
                                        className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 transition-transform duration-150 ease-out hover:scale-105 cursor-default"
                                      >
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="8" cy="8" r="7" />
                                          <path d="M5 8l2 2 4-4" />
                                        </svg>
                                        Respondeu
                                      </span>
                                    )
                                  })()}
                                </td>
                                <td className="px-5 py-3.5 text-[#6B6B6B] whitespace-nowrap">
                                  {CARGO_LABEL[c.cargo] ?? c.cargo}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${estadoChip(c.estado)}`}>
                                    {estadoLabel(c.estado)}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        setModalGerarLink({ id: c.id, nome: c.nome })
                                        setPeriodoLink('')
                                        setLinkGerado('')
                                        setErroLink('')
                                      }}
                                      className="text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                                    >
                                      Gerar link
                                    </button>
                                    <button
                                      onClick={() => abrirHistorico(c)}
                                      className="text-xs font-medium text-[#0A0A0A] hover:text-amber-600 transition-colors"
                                    >
                                      Ver avaliações →
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal desligar colaborador ── */}
      {modalDesligar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Desligar colaborador</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">{modalDesligar.nome}</p>
            <label className="block text-xs text-[#6B6B6B] mb-1">Data de saída</label>
            <input
              type="date"
              value={dataSaida}
              onChange={(e) => setDataSaida(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-3"
            />
            <label className="block text-xs text-[#6B6B6B] mb-1">Motivo (obrigatório)</label>
            <textarea
              rows={3}
              placeholder="Descreva o motivo do desligamento…"
              value={motivoSaida}
              onChange={(e) => setMotivoSaida(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-2 resize-none"
            />
            {(!dataSaida || !motivoSaida.trim()) && (
              <p className="text-xs text-amber-600 mb-3">Preencha a data e o motivo antes de confirmar.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setModalDesligar(null); setDataSaida(''); setMotivoSaida('') }}
                className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!dataSaida || !motivoSaida.trim() || salvando}
                onClick={confirmarDesligamento}
                className="flex-1 bg-[#DC2626] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50"
              >
                {salvando ? 'Salvando…' : 'Confirmar desligamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal recontratar colaborador ── */}
      {modalRecontratar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Recontratar colaborador</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">{modalRecontratar.nome}</p>
            <label className="block text-xs text-[#6B6B6B] mb-1">Loja</label>
            <select
              value={lojaRecontratar}
              onChange={(e) => setLojaRecontratar(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-4"
            >
              <option value="">Selecione a loja…</option>
              {LOJAS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {erroRecontratar && <p className="text-xs text-red-600 mb-3">{erroRecontratar}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setModalRecontratar(null); setLojaRecontratar(''); setErroRecontratar('') }}
                className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={recontratar}
                disabled={!lojaRecontratar || recontratando}
                className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {recontratando ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal gerar link de autoavaliação ── */}
      {modalGerarLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Gerar link de avaliação</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">{modalGerarLink.nome}</p>

            {!linkGerado ? (
              <>
                <label className="block text-xs text-[#6B6B6B] mb-1">Período</label>
                <input
                  type="text"
                  placeholder="ex: Jun/2026"
                  value={periodoLink}
                  onChange={(e) => setPeriodoLink(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-4"
                />
                {erroLink && <p className="text-xs text-red-600 mb-3">{erroLink}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalGerarLink(null)}
                    className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={gerarLink}
                    disabled={!periodoLink.trim() || gerandoLink}
                    className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {gerandoLink ? 'Gerando…' : 'Gerar link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-green-700 font-medium mb-2">✓ Link gerado para {periodoLink}</p>
                <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-3 py-2 mb-3 break-all">
                  <p className="text-xs text-[#0A0A0A] font-mono">{linkGerado}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(linkGerado)}
                  className="w-full border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors mb-2"
                >
                  Copiar link
                </button>
                <button
                  onClick={() => setModalGerarLink(null)}
                  className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] transition-colors"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal histórico de avaliações ── */}
      {modalHistorico && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
              <div>
                <h2 className="text-base font-semibold text-[#0A0A0A]">{modalHistorico.nome}</h2>
                <p className="text-xs text-[#6B6B6B]">Histórico de avaliações</p>
              </div>
              <button
                onClick={() => setModalHistorico(null)}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-8">
              {historicoCargando ? (
                <p className="text-sm text-[#6B6B6B] text-center py-8">Carregando…</p>
              ) : (
                <>
                  {/* ── Radar histórico (somente vendedor) ── */}
                  {modalHistorico?.cargo === 'vendedor' && (() => {
                    const rd = radarData(autoavaliacoes)
                    if (!rd) return (
                      <div className="text-center py-6 text-sm text-[#6B6B6B]">
                        Nenhuma autoavaliação respondida ainda.
                      </div>
                    )
                    return (
                      <div>
                        <h3 className="text-sm font-semibold text-[#0A0A0A] mb-4">Perfil N/R/E/L — histórico</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={rd.data}>
                            <PolarGrid stroke="#E5E5E5" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B6B6B' }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                            {rd.periodos.map((periodo, i) => (
                              <Radar
                                key={periodo}
                                name={periodo}
                                dataKey={periodo}
                                stroke={RADAR_CORES[i % RADAR_CORES.length]}
                                fill={RADAR_CORES[i % RADAR_CORES.length]}
                                fillOpacity={0.12}
                                strokeWidth={2}
                              />
                            ))}
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })()}
                  {modalHistorico?.cargo !== 'vendedor' && autoavaliacoes.filter(a => a.respondido_em).length === 0 && (
                    <div className="text-center py-6 text-sm text-[#6B6B6B]">
                      Nenhuma autoavaliação respondida ainda.
                    </div>
                  )}

                  {/* ── Detalhe por avaliação ── */}
                  {autoavaliacoes.filter(a => a.respondido_em).map((aval) => {
                    const gestorAval = avaliacoesGestor.find(ag => ag.periodo === aval.periodo) ?? null
                    return (
                      <div key={aval.id} className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                        {/* Cabeçalho da avaliação */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{aval.periodo}</p>
                          <p className="text-xs text-[#6B6B6B]">Respondida em {formatarData(aval.respondido_em)}</p>
                        </div>

                        <div className="p-5 space-y-5">

                          {/* ENGAJAMENTO */}
                          <section>
                            <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Engajamento</h4>
                            <div className="space-y-2">
                              {BLOCO_ENGAJAMENTO.map(p => (
                                <div key={p.coluna} className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-48 shrink-0">{p.descricao}</span>
                                  <div className="flex-1">
                                    <BarraEscala
                                      valor={(aval as Record<string, unknown>)[p.coluna] as number | null}
                                      max={p.escala === '0-10' ? 10 : 5}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          <hr className="border-[#F0F0F0]" />

                          {/* AMBIÇÃO */}
                          <section>
                            <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Ambição</h4>
                            <div className="space-y-2">
                              {/* objetivo */}
                              <div className="flex items-start gap-3">
                                <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Objetivo</span>
                                <span className="text-sm text-[#0A0A0A]">
                                  {labelObjetivo(aval.amb_objetivo, modalHistorico?.cargo ?? 'vendedor')}
                                </span>
                              </div>
                              {/* escalas de ambição */}
                              {BLOCO_AMBICAO_ESCALAS.map(p => (
                                <div key={p.coluna} className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">{p.label}</span>
                                  <div className="flex-1">
                                    <BarraEscala
                                      valor={(aval as Record<string, unknown>)[p.coluna] as number | null}
                                      max={5}
                                    />
                                  </div>
                                </div>
                              ))}
                              {/* visão 2 anos */}
                              {aval.amb_visao_2anos && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">{BLOCO_AMBICAO_VISAO.label}</span>
                                  <span className="text-sm text-[#0A0A0A] italic">"{aval.amb_visao_2anos}"</span>
                                </div>
                              )}
                            </div>
                          </section>

                          <hr className="border-[#F0F0F0]" />

                          {/* REMUNERAÇÃO */}
                          <section>
                            <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Remuneração</h4>
                            <div className="space-y-2">
                              {BLOCO_REMUNERACAO.map(p => (
                                <div key={p.coluna} className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">{p.label}</span>
                                  <div className="flex-1">
                                    <BarraEscala
                                      valor={(aval as Record<string, unknown>)[p.coluna] as number | null}
                                      max={5}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* PERFIL SITUACIONAL (somente vendedor) */}
                          {modalHistorico?.cargo === 'vendedor' && (
                            <>
                              <hr className="border-[#F0F0F0]" />
                              <section>
                                <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Perfil Situacional</h4>
                                {aval.perfil_dominante && (
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Perfil dominante</span>
                                    <span className="text-sm font-semibold text-[#0A0A0A]">{aval.perfil_dominante}</span>
                                    {aval.mix_pct && (
                                      <span className="text-xs text-[#6B6B6B]">
                                        N{aval.mix_pct.N}% · R{aval.mix_pct.R}% · E{aval.mix_pct.E}% · L{aval.mix_pct.L}%
                                      </span>
                                    )}
                                  </div>
                                )}
                                {aval.respostas_perfil && (
                                  <div className="space-y-2">
                                    {BLOCO_PERFIL.map(p => {
                                      const respostaItem = aval.respostas_perfil?.[p.id]
                                      const letraEscolhida = respostaItem?.resposta ?? null
                                      const opcaoEscolhida = p.opcoes.find(o => o.letra === letraEscolhida)
                                      return (
                                        <div key={p.id} className="flex items-start gap-3">
                                          <span className="text-xs text-[#6B6B6B] w-40 shrink-0 pt-0.5">{p.pergunta}</span>
                                          <div className="flex-1">
                                            {opcaoEscolhida ? (
                                              <span className="text-sm text-[#0A0A0A]">
                                                {opcaoEscolhida.texto}
                                                <span className="ml-2 text-xs text-[#B0B0B0]">({opcaoEscolhida.perfil})</span>
                                              </span>
                                            ) : (
                                              <span className="text-[#B0B0B0]">—</span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </section>
                            </>
                          )}

                          <hr className="border-[#F0F0F0]" />

                          {/* AVALIAÇÃO DO GESTOR */}
                          <section>
                            <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Avaliação do Gestor</h4>
                            {!gestorAval ? (
                              <p className="text-sm text-[#B0B0B0]">Nenhuma avaliação do gestor para este período.</p>
                            ) : (
                              <div className="space-y-2">
                                {gestorAval.cota_pct !== null && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-[#6B6B6B] w-40 shrink-0">% Cota</span>
                                    <PillDesempenho valor={gestorAval.cota_pct} />
                                  </div>
                                )}
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Desempenho</span>
                                  <PillDesempenho valor={gestorAval.desempenho_vendas !== null ? Math.round(gestorAval.desempenho_vendas / 5 * 100) : null} />
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Comportamento</span>
                                  <div className="flex-1"><BarraEscala valor={gestorAval.comportamento} max={5} /></div>
                                </div>
                                {gestorAval.pontos_fortes && (
                                  <div className="flex items-start gap-3">
                                    <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Pontos fortes</span>
                                    <span className="text-sm text-[#0A0A0A]">{gestorAval.pontos_fortes}</span>
                                  </div>
                                )}
                                {gestorAval.pontos_desenvolver && (
                                  <div className="flex items-start gap-3">
                                    <span className="text-sm text-[#6B6B6B] w-40 shrink-0">A desenvolver</span>
                                    <span className="text-sm text-[#0A0A0A]">{gestorAval.pontos_desenvolver}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Recomendação</span>
                                  <BadgeRecomendacao valor={gestorAval.recomendacao} />
                                </div>
                              </div>
                            )}
                          </section>

                          <hr className="border-[#F0F0F0]" />

                          {/* ABERTO */}
                          <section>
                            <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Espaço livre</h4>
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Melhoria</span>
                                <span className="text-sm text-[#0A0A0A]">{aval.texto_melhoria ?? <span className="text-[#B0B0B0]">—</span>}</span>
                              </div>
                              {perfil?.role === 'master' && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Msg. gestor</span>
                                  <span className="text-sm text-[#0A0A0A]">{aval.texto_gestor ?? <span className="text-[#B0B0B0]">—</span>}</span>
                                </div>
                              )}
                            </div>
                          </section>

                        </div>
                      </div>
                    )
                  })}

                  {/* Avaliações sem autoavaliação respondida (pendentes ou só gestor) */}
                  {avaliacoesGestor.filter(ag => !autoavaliacoes.find(a => a.respondido_em && a.periodo === ag.periodo)).map(ag => (
                    <div key={ag.id} className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                        <p className="text-sm font-semibold text-[#0A0A0A]">{ag.periodo}</p>
                        <p className="text-xs text-[#B0B0B0]">Sem autoavaliação respondida</p>
                      </div>
                      <div className="p-5">
                        <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Avaliação do Gestor</h4>
                        <div className="space-y-2">
                          {ag.cota_pct !== null && (
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-[#6B6B6B] w-40 shrink-0">% Cota</span>
                              <span className="text-sm text-[#0A0A0A]">{ag.cota_pct}%</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Desempenho</span>
                            <div className="flex-1"><BarraEscala valor={ag.desempenho_vendas} max={5} /></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Comportamento</span>
                            <div className="flex-1"><BarraEscala valor={ag.comportamento} max={5} /></div>
                          </div>
                          {ag.pontos_fortes && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Pontos fortes</span>
                              <span className="text-sm text-[#0A0A0A]">{ag.pontos_fortes}</span>
                            </div>
                          )}
                          {ag.pontos_desenvolver && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm text-[#6B6B6B] w-40 shrink-0">A desenvolver</span>
                              <span className="text-sm text-[#0A0A0A]">{ag.pontos_desenvolver}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#6B6B6B] w-40 shrink-0">Recomendação</span>
                            <BadgeRecomendacao valor={ag.recomendacao} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Formulário — nova avaliação do gestor */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#0A0A0A] mb-4">Nova avaliação do gestor</h3>
                    {sucessoGestor ? (
                      <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                        ✓ Avaliação salva com sucesso.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Período */}
                        <div>
                          <label className="block text-xs text-[#6B6B6B] mb-1">Período *</label>
                          <input
                            type="text"
                            placeholder="ex: Jun/2026"
                            value={formGestor.periodo}
                            onChange={(e) => setFormGestor((f) => ({ ...f, periodo: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                          />
                        </div>

                        {/* Vincular autoavaliação */}
                        {autoavaliacoes.filter((a) => a.respondido_em).length > 0 && (
                          <div>
                            <label className="block text-xs text-[#6B6B6B] mb-1">Vincular a uma autoavaliação (opcional)</label>
                            <select
                              value={formGestor.autoavaliacao_id}
                              onChange={(e) => setFormGestor((f) => ({ ...f, autoavaliacao_id: e.target.value }))}
                              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                            >
                              <option value="">Nenhuma</option>
                              {autoavaliacoes.filter((a) => a.respondido_em).map((a) => (
                                <option key={a.id} value={a.id}>{a.periodo} · {formatarData(a.respondido_em)}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Métricas */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-[#6B6B6B] mb-1">% Cota</label>
                            <input
                              type="number"
                              min={0} max={300}
                              placeholder="ex: 102"
                              value={formGestor.cota_pct}
                              onChange={(e) => setFormGestor((f) => ({ ...f, cota_pct: e.target.value }))}
                              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6B6B6B] mb-1">Desempenho (1-5)</label>
                            <input
                              type="number"
                              min={1} max={5}
                              placeholder="1–5"
                              value={formGestor.desempenho_vendas}
                              onChange={(e) => setFormGestor((f) => ({ ...f, desempenho_vendas: e.target.value }))}
                              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6B6B6B] mb-1">Comportamento (1-5)</label>
                            <input
                              type="number"
                              min={1} max={5}
                              placeholder="1–5"
                              value={formGestor.comportamento}
                              onChange={(e) => setFormGestor((f) => ({ ...f, comportamento: e.target.value }))}
                              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                            />
                          </div>
                        </div>

                        {/* Textos */}
                        <div>
                          <label className="block text-xs text-[#6B6B6B] mb-1">Pontos fortes</label>
                          <textarea
                            rows={2}
                            value={formGestor.pontos_fortes}
                            onChange={(e) => setFormGestor((f) => ({ ...f, pontos_fortes: e.target.value }))}
                            placeholder="Escreva aqui…"
                            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B6B6B] mb-1">Pontos a desenvolver</label>
                          <textarea
                            rows={2}
                            value={formGestor.pontos_desenvolver}
                            onChange={(e) => setFormGestor((f) => ({ ...f, pontos_desenvolver: e.target.value }))}
                            placeholder="Escreva aqui…"
                            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
                          />
                        </div>

                        {/* Recomendação */}
                        <div>
                          <label className="block text-xs text-[#6B6B6B] mb-1">Recomendação</label>
                          <div className="flex gap-2">
                            {[
                              { val: 'manter', label: 'Manter', cls: 'border-[#E5E5E5] text-[#6B6B6B]' },
                              { val: 'promover', label: 'Promover', cls: 'border-green-300 text-green-700' },
                              { val: 'atencao', label: 'Atenção', cls: 'border-red-300 text-red-600' },
                            ].map(({ val, label, cls }) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setFormGestor((f) => ({ ...f, recomendacao: f.recomendacao === val ? '' : val }))}
                                className={`flex-1 px-3 py-2 text-xs font-semibold border rounded-lg transition-colors ${
                                  formGestor.recomendacao === val
                                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                                    : `bg-white ${cls} hover:border-[#0A0A0A] hover:text-[#0A0A0A]`
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {erroGestor && <p className="text-xs text-red-600">{erroGestor}</p>}

                        <button
                          onClick={salvarAvaliacaoGestor}
                          disabled={!formGestor.periodo.trim() || salvandoGestor}
                          className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {salvandoGestor ? 'Salvando…' : 'Salvar avaliação'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Modal pendentes do link coletivo ── */}
      {modalPendentes && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
              <div>
                <h2 className="text-base font-semibold text-[#0A0A0A]">{modalPendentes.rotulo}</h2>
                <p className="text-xs text-[#6B6B6B]">Acompanhamento de respostas</p>
              </div>
              <button onClick={() => setModalPendentes(null)} className="text-[#6B6B6B] hover:text-[#0A0A0A] text-xl leading-none">×</button>
            </div>

            <div className="p-6">
              {carregandoPendentes ? (
                <p className="text-sm text-[#6B6B6B] text-center py-8">Carregando…</p>
              ) : !pendentesData ? (
                <p className="text-sm text-red-500 text-center py-8">Erro ao carregar dados.</p>
              ) : (
                <div className="space-y-6">
                  {/* Faltam */}
                  {pendentesData.faltam.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">
                        ⏳ Faltam responder ({pendentesData.faltam.length})
                      </h3>
                      <div className="space-y-1.5">
                        {pendentesData.faltam.map((c, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                            <span className="text-sm text-[#0A0A0A]">{c.nome}</span>
                            <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                              <span>{c.loja}</span>
                              <span>·</span>
                              <span>{CARGO_LABEL[c.cargo] ?? c.cargo}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responderam */}
                  {pendentesData.responderam.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">
                        ✅ Responderam ({pendentesData.responderam.length})
                      </h3>
                      <div className="space-y-1.5">
                        {pendentesData.responderam.map((c, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                            <span className="text-sm text-[#0A0A0A]">{c.nome}</span>
                            <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                              <span>{c.loja}</span>
                              <span>·</span>
                              <span>{formatarData(c.respondido_em)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendentesData.faltam.length === 0 && pendentesData.responderam.length === 0 && (
                    <p className="text-sm text-[#6B6B6B] text-center py-4">Nenhum colaborador no snapshot deste link.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal link coletivo ── */}
      {modalColetivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Gerar link coletivo</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Um link único para todos os colaboradores ativos responderem.
            </p>

            {!linkColetivoGerado ? (
              <>
                <label className="block text-xs text-[#6B6B6B] mb-1">Rótulo / período</label>
                <input
                  type="text"
                  placeholder="ex: Julho/2026"
                  value={rotuloColetivo}
                  onChange={(e) => setRotuloColetivo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && gerarLinkColetivo()}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-4"
                  autoFocus
                />
                {erroColetivo && <p className="text-xs text-red-600 mb-3">{erroColetivo}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalColetivo(false)}
                    className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={gerarLinkColetivo}
                    disabled={!rotuloColetivo.trim() || gerandoColetivo}
                    className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {gerandoColetivo ? 'Gerando…' : 'Gerar link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-green-700 font-medium mb-2">
                  ✓ Link gerado — {rotuloColetivo}
                </p>
                <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-3 py-2 mb-3 break-all">
                  <p className="text-xs text-[#0A0A0A] font-mono">{linkColetivoGerado}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(linkColetivoGerado)}
                  className="w-full border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors mb-2"
                >
                  Copiar link
                </button>
                <button
                  onClick={() => setModalColetivo(false)}
                  className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] transition-colors"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
