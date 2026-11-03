'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { STATUS_CONFIG, type StatusCandidato } from '@/lib/status'
import { StatusChip } from '@/components/admin/StatusChip'
import { ModalConvocacao } from '@/components/admin/ModalConvocacao'
import { getPerfilUsuario, type PerfilUsuario } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALERTAS_MAP: Record<string, { nome: string; penalidade: number; descricao: string }> = {
  A01: { nome: 'Baixa Energia', penalidade: -2, descricao: "Linguagem passiva identificada nas respostas abertas (uso de 'tentei', 'esperava', 'procurei')" },
  A02: { nome: 'Perfil Confortável', penalidade: -3, descricao: 'Candidato demonstrou preferência por ambiente equilibrado, tranquilo ou estável' },
  A03: { nome: 'Pouca Cobrança', penalidade: -3, descricao: 'Baixo histórico de cobrança: nunca demitiu e resposta sobre cobrança muito curta ou passiva' },
  A04: { nome: 'Instabilidade Profissional', penalidade: -2, descricao: 'Múltiplas trocas de emprego em curto período sem evolução salarial declarada' },
  A05: { nome: 'Pouca Liderança', penalidade: -2, descricao: 'Pouca ou nenhuma experiência em liderança de pessoas' },
  A06: { nome: 'Resultado Fraco', penalidade: -3, descricao: 'Ausência de números concretos nas respostas sobre resultado comercial' },
  A07: { nome: 'Cansaço', penalidade: -2, descricao: 'Motivo de saída relacionado a esgotamento, burnout ou necessidade de descanso' },
  A08: { nome: 'Baixa Ambição', penalidade: -2, descricao: 'Objetivo profissional vago ou sem direção clara para os próximos anos' },
  A09: { nome: 'Respostas Incoerentes', penalidade: -3, descricao: 'Incoerência: afirma ter liderado equipe grande mas nunca precisou tomar decisão disciplinar' },
  A10: { nome: 'Deslocamento Ruim', penalidade: -1, descricao: 'Mais de 2 conduções ou tempo elevado até a unidade de interesse' },
  A11: { nome: 'Baixa Disponibilidade', penalidade: -2, descricao: 'Disponibilidade de horário parcial ou restrita' },
  A12: { nome: 'Vitimismo', penalidade: -3, descricao: 'Candidato culpa empresa ou liderança anterior em 2 ou mais experiências' },
  A13: { nome: 'Pretensão Acima do Teto', penalidade: -2, descricao: 'Pretensão salarial acima do teto configurado para o cargo' },
  A14: { nome: 'Sem Experiência em Varejo', penalidade: -2, descricao: 'Nenhuma das empresas informadas atua no segmento de varejo' },
  A15: { nome: 'Baixo Perfil Comercial', penalidade: 0, descricao: 'Respostas indicam perfil predominantemente não-comercial' },
  V01: { nome: 'Saiu sem Avisar', penalidade: -5, descricao: 'Saiu do emprego anterior sem cumprir aviso prévio por motivo pessoal' },
  V02: { nome: 'Baixa Vocação', penalidade: -5, descricao: 'Motivação indefinida em vendas e reação desmotivada quando sem resultado' },
  V03: { nome: 'Resistência a Regras', penalidade: -3, descricao: 'Questiona orientações na hora ou prefere ambientes sem regras fixas' },
  V04: { nome: 'Restrição de Horário', penalidade: -4, descricao: 'Possui restrições de horário incompatíveis com escala de shopping' },
  V05: { nome: 'Instabilidade Abrupta', penalidade: -3, descricao: 'Emprego curto com saída sem aviso — sinal de instabilidade' },
  V06: { nome: 'Pouco Comunicativo', penalidade: -2, descricao: 'Sem redes sociais e prefere comunicação escrita — perfil pouco comunicativo para varejo' },
  V07: { nome: 'Faculdade em Andamento', penalidade: -2, descricao: 'Faculdade em andamento — pode ter restrições de horário por conta dos estudos' },
  V08: { nome: 'Baixa Vocação para Vendas', penalidade: 0, descricao: 'Vocação abaixo do mínimo esperado — classificação limitada a C' },
  V09: { nome: 'Deslocamento com Esforço', penalidade: -1, descricao: 'Pelo menos um trajeto exige 2 conduções — considerar na decisão' },
  V10: { nome: 'Disponibilidade Parcial', penalidade: -2, descricao: 'Disponibilidade parcial — shopping exige horário total' },
  V11: { nome: 'Pretensão Acima do Teto', penalidade: -2, descricao: 'Pretensão salarial acima do teto configurado para o cargo' },
}

// Alertas exclusivos do score v3
const ALERTAS_V3_MAP: Record<string, { nome: string; penalidade: number; descricao: string }> = {
  V01: { nome: 'Saiu sem Avisar',    penalidade: -5, descricao: 'Saiu do emprego anterior sem cumprir aviso prévio' },
  V02: { nome: 'Emprego Curto',      penalidade: -3, descricao: 'Permanência muito curta no último emprego' },
  V03: { nome: 'Alta Incoerência',   penalidade:  0, descricao: '3 ou mais pares de perguntas com respostas contraditórias — score limitado a 55' },
  V04: { nome: 'Piso Executor',      penalidade:  0, descricao: 'Perfil Executor coerente — piso de 45 aplicado' },
}

const PERFIL4_LABEL: Record<string, string> = {
  N: 'Vendedor Nato', R: 'Relacional', E: 'Executor', L: 'Liderança Emergente',
}
const PERFIL4_COR: Record<string, { bg: string; text: string; dot: string }> = {
  N: { bg: 'bg-red-100',    text: 'text-red-800',    dot: '🔴' },
  R: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '🔵' },
  E: { bg: 'bg-green-100',  text: 'text-green-800',  dot: '🟢' },
  L: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: '🟡' },
}

function recomendacaoV3(score: number): { label: string; cls: string } {
  if (score >= 75) return { label: '🎯 Prioridade alta',      cls: 'bg-[#0A0A0A] text-white' }
  if (score >= 60) return { label: '👀 Avaliar',             cls: 'bg-blue-100 text-blue-800' }
  if (score >= 45) return { label: '⬇ Baixa prioridade',    cls: 'bg-yellow-100 text-yellow-800' }
  return              { label: '✕ Provavelmente não',        cls: 'bg-red-100 text-red-700' }
}

const PERFIL_ESTILO: Record<string, string> = {
  A: 'bg-[#0A0A0A] text-white',
  B: 'bg-[#404040] text-white',
  C: 'bg-[#B0B0B0] text-white',
  D: 'bg-[#E8E8E8] text-[#0A0A0A]',
}

const QUIZ_V3_LABELS: Record<string, string> = {
  tensao_meta_fim_dia:        'Meta do dia — 20h, casal indeciso entrando',
  reacao_tres_perdas:         'Três atendimentos perdidos seguidos',
  cliente_vou_pensar:         'Cliente diz "vou pensar e volto depois"',
  dois_clientes_simultaneos:  'Dois clientes chegam ao mesmo tempo',
  elogio_preferido_1:         'Elogio preferido — par 1',
  elogio_preferido_2:         'Elogio preferido — par 2',
  frase_combina_1:            'Frase que mais combina — par 1',
  frase_combina_2:            'Frase que mais combina — par 2',
  loja_sem_movimento:         'Loja sem movimento há uma hora',
  chega_peca_nova:            'Chega uma peça nova na loja',
  inicio_turno:               'Como prefere começar o turno',
  discorda_gerente:           'Gerente decide algo que você acha errado',
  muitas_regras:              'Empresa com muitas regras e procedimentos',
  meta_loja_individual_atras: 'Meta da loja batida, individual ficou pra trás',
  tempo_ultimo_emprego:       'Tempo no último emprego',
  tipo_saida:                 'Como foi a saída do último emprego',
  peso_mudar_trabalho:        'O que mais pesa ao mudar de trabalho',
  sucesso_futuro:             'O que seria sucesso daqui a alguns anos',
}

type Candidato = {
  id: string
  criado_em: string
  nome: string
  cargo?: string | null
  email?: string | null
  whatsapp?: string | null
  cpf?: string | null
  endereco?: string | null
  instagram?: string | null
  unidades?: string[] | null
  score_final: number
  perfil: string | null
  alertas: string[]
  status: string
  score_comercial?: number | null
  score_lideranca?: number | null
  score_comprometimento?: number | null
  score_cultura?: number | null
  score_ambicao?: number | null
  score_estabilidade?: number | null
  score_operacao?: number | null
  idade?: string | null
  escolaridade?: string | null
  veiculo?: string | null
  cnh?: string[] | null
  disponibilidade_horario?: string | null
  disponibilidade_mudanca?: string | null
  pretensao_salarial?: string | null
  qtd_passagens?: string | null
  tempo_deslocamento?: string | null
  vt_mensal_estimado?: string | null
  trabalhando_atualmente?: string | null
  empresa_atual?: string | null
  cargo_atual?: string | null
  tempo_empresa_atual?: string | null
  motivo_busca?: string | null
  ultima_empresa?: string | null
  ultimo_cargo?: string | null
  tempo_ultima_empresa?: string | null
  motivo_saida?: string | null
  ultimas_experiencias?: string | null
  confortavel_cobranca_meta?: string | null
  preferencia_salarial?: string | null
  incomodo_lideranca?: string | null
  gosta_vender?: string | null
  maior_meta?: string | null
  maior_resultado?: string | null
  ferramentas_comerciais?: string[] | null
  reacao_abaixo_meta?: string | null
  diferencial_vendas?: string | null
  ja_liderou?: string | null
  qtd_liderados?: string | null
  reacao_baixo_resultado?: string | null
  acoes_lideranca?: string[] | null
  motivo_lideranca_sem_experiencia?: string | null
  diferenca_gerente_forte?: string | null
  prejudica_equipe?: string | null
  para_de_crescer?: string | null
  ambiente_trabalho?: string | null
  caracteristica_principal?: string | null
  incomodo_equipe?: string | null
  perde_motivacao?: string | null
  significado_comprometimento?: string | null
  peso_crescimento?: string | null
  evolucao_profissional?: string | null
  objetivo_5_anos?: string | null
  intenso_vs_toxico?: string | null
  confortavel_cobranca_constante?: string | null
  visao_acompanhamento_meta?: string | null
  gerente_participa_vendas?: string | null
  ferramentas_utilizadas?: string[] | null
  acao_movimento_fraco?: string | null
  confortavel_operacao?: string[] | null
  permanencia_empresa?: string | null
  case_meta_5dias?: string | null
  case_vendedor_problema?: string | null
  case_equipe_acomodada?: string | null
  case_funcionario_atrasado?: string | null
  case_loja_desorganizada?: string | null
  prioridade_30dias?: string | null
  perfil_gerente?: string | null
  incomodo_lideranca_opcao?: string | null
  gosta_vender_opcao?: string | null
  reacao_abaixo_meta_opcao?: string | null
  prejudica_resultado_opcao?: string | null
  diferencial_vendas_opcao?: string | null
  diferenca_gerente_forte_opcao?: string | null
  prejudica_equipe_opcao?: string | null
  caracteristica_principal_opcao?: string | null
  incomodo_equipe_opcao?: string | null
  perde_motivacao_opcao?: string | null
  significado_comprometimento_opcao?: string | null
  intenso_vs_toxico_opcao?: string | null
  visao_acompanhamento_meta_opcao?: string | null
  acao_movimento_fraco_opcao?: string | null
  curriculo_url?: string | null
  video_url?: string | null
  foto_url?: string | null
  observacoes?: string | null
  motivo_reprovacao?: string | null
  motivo_reprovacao_categoria?: string | null
  motivo_reprovacao_obs?: string | null
  historico_tentativas?: Array<{
    data: string
    status: string
    score_final: number | null
    perfil: string | null
    cargo: string | null
    motivo_reprovacao: string | null
    ia_resumo: string | null
    ia_recomendacao: string | null
  }> | null
  tentativa_numero?: number | null
  conducoes_ida?: string | null
  conducoes_volta?: string | null
  ramo_empresa_atual?: string | null
  ramo_ultima_empresa?: string | null
  maior_resultado_valor?: string | null
  // caixa
  operou_caixa?: string | null
  facilidade_calculos?: string | null
  experiencia_troco?: string | null
  descricao_experiencia_caixa?: string | null
  // vendedor
  perfil_vendedor?: string | null
  score_vocacao?: number | null
  score_comprometimento_v?: number | null
  score_comunicacao?: number | null
  score_disciplina_v?: number | null
  score_potencial?: number | null
  tempo_ultimo_emprego?: string | null
  motivo_permanencia?: string | null
  saiu_sem_avisar?: string | null
  reacao_orientacao?: string | null
  preferencia_trabalho?: string | null
  aceita_regras?: string | null
  motivacao_vendas?: string | null
  situacao_venda?: string | null
  reacao_sem_venda?: string | null
  experiencia_persuasao?: string | null
  lida_movimento_fraco?: string | null
  aceita_horario_shopping?: string | null
  restricao_horario_detalhe?: string | null
  ativo_redes_sociais?: string | null
  comunicacao_pessoal?: string | null
  defeito_segundo_gerente?: string | null
  por_que_confiar?: string | null
  quiz_vendedor_v3?: {
    versao: string
    respostas: Record<string, { perfil: string | null; resposta: string; peso: number; grupo: string }>
    mix_pct: { N: number; R: number; E: number; L: number }
    objetivas?: { tipo_saida?: string; tempo_ultimo_emprego?: string }
  } | null
  ia_tipo_perfil?: string | null
  ia_resumo?: string | null
  ia_pontos_fortes?: string[] | null
  ia_pontos_atencao?: string[] | null
  ia_recomendacao?: string | null
  ia_justificativa?: string | null
  ia_analisado_em?: string | null
  entrevista_data?: string | null
  entrevista_hora?: string | null
  entrevista_modalidade?: string | null
  entrevista_local?: string | null
  entrevista_gestor?: string | null
  entrevista_email_unidade?: string | null
  entrevista_agendada_em?: string | null
  entrevista_resultado?: string | null
  entrevista_motivo_nao_contratacao?: string | null
  entrevista_tipo?: string | null
  entrevista_confirmada?: boolean | null
  historico_anterior?: {
    data?: string
    status?: string
    score_final?: number
    perfil?: string
    motivo_reprovacao?: string
    cargo?: string
    ia_resumo?: string
    ia_recomendacao?: string
  } | null
  feedback_candidato?: string | null
  logistica_por_unidade?: Record<string, {
    minutos_carro: number | null
    minutos_transit: number | null
    aprovada: boolean
    motivo_reprovacao?: string
    vt?: string | null
  }> | null
}

// — helpers ——————————————————————————————————————————————

function hasText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function hasItems(v: string[] | null | undefined): v is string[] {
  return Array.isArray(v) && v.length > 0
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#E5E5E5] rounded-xl p-6">
      <h2 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-4">
        {titulo}
      </h2>
      {children}
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!hasText(valor)) return null
  return (
    <div>
      <p className="text-xs text-[#6B6B6B] mb-0.5">{label}</p>
      <p className="text-sm text-[#0A0A0A] whitespace-pre-wrap">{valor}</p>
    </div>
  )
}

function CampoLink({
  label,
  href,
  texto,
}: {
  label: string
  href: string | null | undefined
  texto: string | null | undefined
}) {
  if (!hasText(href) || !hasText(texto)) return null
  return (
    <div>
      <p className="text-xs text-[#6B6B6B] mb-0.5">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#0A0A0A] underline underline-offset-2 hover:text-[#404040] transition-colors"
      >
        {texto}
      </a>
    </div>
  )
}

function CampoChips({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!hasItems(items)) return null
  return (
    <div>
      <p className="text-xs text-[#6B6B6B] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0F0F0] text-[#0A0A0A]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function CaseCard({ pergunta, resposta }: { pergunta: string; resposta: string | null | undefined }) {
  if (!hasText(resposta)) return null
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-4">
      <p className="text-xs font-semibold text-[#0A0A0A] mb-2">{pergunta}</p>
      <p className="text-sm text-[#404040] whitespace-pre-wrap">{resposta}</p>
    </div>
  )
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatarDataLocal(data: string | null | undefined): string {
  if (!data) return ''
  const [y, m, d] = data.split('-')
  if (!y || !m || !d) return data
  return `${d}/${m}/${y}`
}

function limparTelefone(tel: string) {
  return tel.replace(/\D/g, '')
}

function formatarCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function extrairInstagram(raw: string | null | undefined): { usuario: string; link: string } | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()
  // Extrai o username de qualquer formato
  let username = s
  // Remove protocolo e domínio
  username = username.replace(/^https?:\/\//i, '')
  username = username.replace(/^(?:www\.)?instagram\.com\//i, '')
  // Remove @ inicial
  username = username.replace(/^@/, '')
  // Remove trailing slash ou query
  username = username.split(/[/?#]/)[0].trim()
  if (!username) return null
  return {
    usuario: `@${username}`,
    link: `https://instagram.com/${username}`,
  }
}

// — componente principal ————————————————————————————————

export default function CandidatoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [novoStatus, setNovoStatus] = useState('NOVO')
  const [observacoes, setObservacoes] = useState('')
  const [modalConvocacao, setModalConvocacao] = useState(false)
  const [confirmandoPresenca, setConfirmandoPresenca] = useState(false)
  const [resultadoEntrevista, setResultadoEntrevista] = useState('')
  const [motivoNaoContratacao, setMotivoNaoContratacao] = useState('')
  const [salvandoResultado, setSalvandoResultado] = useState(false)
  const [modalNovaCandidatura, setModalNovaCandidatura] = useState(false)
  const [permitindo, setPermitindo] = useState(false)
  const [modalMotivo, setModalMotivo] = useState(false)
  const [motivoCategoria, setMotivoCategoria] = useState('')
  const [motivoObs, setMotivoObs] = useState('')
  const [statusPendente, setStatusPendente] = useState<string | null>(null)
  const [salarioAlerta, setSalarioAlerta] = useState<{ teto: number } | null>(null)
  const [emailsUnidade, setEmailsUnidade] = useState<Record<string, string>>({})
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(null)
  const [colaboradorAtivo, setColaboradorAtivo] = useState<{ id: string; loja: string; estado: string; nivel: number } | null>(null)
  const [colaboradorDesligado, setColaboradorDesligado] = useState<{ id: string; loja: string; data_saida: string | null } | null>(null)
  const [modalMoverEquipe, setModalMoverEquipe] = useState(false)
  const [lojaEquipe, setLojaEquipe] = useState('')
  const [dataEntradaEquipe, setDataEntradaEquipe] = useState('')
  const [movendoEquipe, setMovendoEquipe] = useState(false)
  const [modalRecontratarCandidato, setModalRecontratarCandidato] = useState(false)
  const [lojaRecontratarCandidato, setLojaRecontratarCandidato] = useState('')
  const [recontratandoCandidato, setRecontratandoCandidato] = useState(false)
  const [erroRecontratarCandidato, setErroRecontratarCandidato] = useState('')

  useEffect(() => {
    // Buscar perfil do usuário logado (para saber unidade do gestor)
    getPerfilUsuario(supabase).then(p => setPerfilUsuario(p))

    // Buscar colaborador vinculado a este candidato (ativo ou desligado)
    supabase
      .from('colaboradores')
      .select('id, loja, estado, data_saida, nivel')
      .eq('candidato_id', id)
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const ativo = data.find((c: { estado: string }) => c.estado !== 'DESLIGADO')
        if (ativo) {
          setColaboradorAtivo(ativo as { id: string; loja: string; estado: string; nivel: number })
        } else {
          setColaboradorDesligado({ id: data[0].id, loja: data[0].loja, data_saida: data[0].data_saida ?? null })
        }
      })

    // Buscar emails configuráveis por unidade
    fetch('/api/configuracoes?chaves=email_taquara,email_aerotown,email_americas,email_nova_iguacu')
      .then(r => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          const map: Record<string, string> = {}
          for (const row of rows) {
            if (row.chave === 'email_taquara')     map['Taquara']     = row.valor
            if (row.chave === 'email_aerotown')    map['Aerotown']    = row.valor
            if (row.chave === 'email_americas')    map['Americas']    = row.valor
            if (row.chave === 'email_nova_iguacu') map['Nova Iguaçu'] = row.valor
          }
          setEmailsUnidade(map)
        }
      })
      .catch(() => {})

    supabase
      .from('candidatos')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setCandidato(data as Candidato)
          setNovoStatus(data.status ?? 'NOVO')
          setObservacoes(data.observacoes ?? '')
          if (data.pretensao_salarial && data.cargo) {
            try {
              const chave = `salario_max_${data.cargo}`
              const cfgRes = await fetch(`/api/configuracoes?chave=${chave}`)
              const cfg = await cfgRes.json()
              const teto = parseFloat(cfg.valor || '99999')
              const pretensaoTokens = String(data.pretensao_salarial).match(/\d+(?:[.,]\d+)*/g) ?? []
              const pretensaoVals = pretensaoTokens.map(t => t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t.replace(/\./g, ''))).filter(n => !isNaN(n) && n >= 100)
              const valor = pretensaoVals.length > 0 ? Math.max(...pretensaoVals) : NaN
              if (!isNaN(valor) && !isNaN(teto) && valor > teto) {
                setSalarioAlerta({ teto })
              }
            } catch {}
          }
        }
        setCarregando(false)
      })
  }, [id])

  async function salvarStatus() {
    if (novoStatus === 'REPROVADO' || novoStatus === 'BANCO_TALENTOS') {
      setStatusPendente(novoStatus)
      setMotivoCategoria('')
      setMotivoObs('')
      setModalMotivo(true)
      return
    }
    await confirmarSalvarStatus(novoStatus, null, null)
  }

  async function confirmarSalvarStatus(status: string, categoria: string | null, obs: string | null) {
    setSalvandoStatus(true)
    const updates: Record<string, unknown> = { status }
    if (categoria) {
      updates.motivo_reprovacao = categoria
      updates.motivo_reprovacao_categoria = categoria
      updates.motivo_reprovacao_obs = obs ?? null
    }
    await supabase.from('candidatos').update(updates).eq('id', id)
    setCandidato((prev) => prev ? {
      ...prev,
      status,
      motivo_reprovacao: categoria ?? prev.motivo_reprovacao,
      motivo_reprovacao_categoria: categoria ?? prev.motivo_reprovacao_categoria,
      motivo_reprovacao_obs: obs ?? prev.motivo_reprovacao_obs,
    } : prev)
    setSalvandoStatus(false)
    setModalMotivo(false)
    setStatusPendente(null)
  }

  async function salvarObservacoes() {
    setSalvandoObs(true)
    await supabase.from('candidatos').update({ observacoes }).eq('id', id)
    setCandidato((prev) => (prev ? { ...prev, observacoes } : prev))
    setSalvandoObs(false)
  }

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

  if (!candidato) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#6B6B6B]">Candidato não encontrado.</p>
      </div>
    )
  }

  const hoje = new Date().toISOString().split('T')[0]
  const entrevistaVencida =
    !!candidato.entrevista_data &&
    candidato.entrevista_resultado === 'Aguardando' &&
    candidato.entrevista_data < hoje

  const statusComEntrevista = ['ENTREVISTA_AGENDADA']
  const statusParaResultado = ['ENTREVISTA_AGENDADA']
  const statusParaConvocar = ['PROVA_FEITA', 'ENTREVISTA_AGENDADA', 'REPROVADO', 'BANCO_TALENTOS']
  const statusBloqueadoConvocacao = ['ENTREVISTA_AGENDADA']

  async function confirmarPresenca(confirmou: boolean) {
    if (!candidato) return
    setConfirmandoPresenca(true)
    const res = await fetch('/api/confirmar-presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidato_id: candidato.id, confirmou }),
    })
    if (res.ok) {
      if (confirmou) {
        setCandidato((prev) => prev ? { ...prev, entrevista_confirmada: true } : prev)
      } else {
        setCandidato((prev) => prev ? { ...prev, status: 'REPROVADO', entrevista_confirmada: false } : prev)
        setNovoStatus('REPROVADO')
      }
    }
    setConfirmandoPresenca(false)
  }

  async function salvarResultado() {
    if (!resultadoEntrevista || !candidato) return
    setSalvandoResultado(true)
    const res = await fetch('/api/resultado-entrevista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidato_id: candidato.id,
        resultado: resultadoEntrevista,
        motivo: motivoNaoContratacao,
      }),
    })
    if (res.ok) {
      const { status: novoSt } = await res.json()
      setCandidato((prev) =>
        prev
          ? {
              ...prev,
              status: novoSt,
              entrevista_resultado: resultadoEntrevista,
              entrevista_motivo_nao_contratacao:
                resultadoEntrevista === 'Não contratado' ? motivoNaoContratacao : prev.entrevista_motivo_nao_contratacao,
            }
          : prev,
      )
      setNovoStatus(novoSt)
    }
    setSalvandoResultado(false)
  }

  async function permitirNovaCandidatura() {
    if (!candidato) return
    setPermitindo(true)
    try {
      await fetch('/api/permitir-nova-candidatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidato_id: candidato.id }),
      })
      window.location.reload()
    } catch {
      setPermitindo(false)
      setModalNovaCandidatura(false)
    }
  }

  async function recontratarCandidato() {
    if (!colaboradorDesligado || !lojaRecontratarCandidato) return
    setRecontratandoCandidato(true)
    setErroRecontratarCandidato('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch('/api/recontratar-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colaborador_id: colaboradorDesligado.id, loja: lojaRecontratarCandidato }),
    })

    if (res.ok) {
      const { colaborador_id: novoId } = await res.json()
      setColaboradorAtivo({ id: novoId, loja: lojaRecontratarCandidato, estado: 'ATIVO', nivel: 1 })
      setColaboradorDesligado(null)
      setModalRecontratarCandidato(false)
      setLojaRecontratarCandidato('')
    } else {
      const json = await res.json()
      setErroRecontratarCandidato(
        json.error === 'ja_tem_vinculo_ativo'
          ? 'Esta pessoa já tem um vínculo ativo ou em treinamento.'
          : 'Erro ao recontratar. Tente novamente.'
      )
    }
    setRecontratandoCandidato(false)
  }

  async function moverParaEquipe() {
    if (!candidato || !lojaEquipe || !dataEntradaEquipe) return
    setMovendoEquipe(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/mover-para-equipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ candidato_id: candidato.id, loja: lojaEquipe, data_entrada: dataEntradaEquipe }),
    })
    if (res.ok) {
      const { colaborador } = await res.json()
      setColaboradorAtivo(colaborador)
      setModalMoverEquipe(false)
    } else {
      const { error } = await res.json()
      if (error === 'ja_e_colaborador') {
        alert('Este candidato já é colaborador ativo ou em treinamento.')
        setModalMoverEquipe(false)
      }
    }
    setMovendoEquipe(false)
  }

  const alertasCodigos = (candidato.alertas ?? []).map((a) => a.split(':')[0])

  const isVendedor = candidato.cargo === 'vendedor'
  const isVendedorV3 = isVendedor && candidato.quiz_vendedor_v3?.versao === 'v3'

  const dimensoes = isVendedorV3
    ? [
        { label: 'Força Nato',  valor: candidato.score_vocacao,           peso: 55 },
        { label: 'Equilíbrio',  valor: candidato.score_comprometimento_v, peso: 20 },
        { label: 'Coerência',   valor: candidato.score_comunicacao,       peso: 25 },
      ]
    : isVendedor
    ? [
        { label: 'Vocação para vendas', valor: candidato.score_vocacao, peso: 30 },
        { label: 'Comprometimento', valor: candidato.score_comprometimento_v, peso: 25 },
        { label: 'Comunicação e energia', valor: candidato.score_comunicacao, peso: 20 },
        { label: 'Disciplina', valor: candidato.score_disciplina_v, peso: 15 },
        { label: 'Potencial de crescimento', valor: candidato.score_potencial, peso: 10 },
      ]
    : [
        { label: 'Comercial / Resultados', valor: candidato.score_comercial, peso: 25 },
        { label: 'Liderança / Cobrança', valor: candidato.score_lideranca, peso: 18 },
        { label: 'Comprometimento / Disciplina', valor: candidato.score_comprometimento, peso: 17 },
        { label: 'Cultura SELETO', valor: candidato.score_cultura, peso: 15 },
        { label: 'Ambição / Crescimento', valor: candidato.score_ambicao, peso: 12 },
        { label: 'Estabilidade Profissional', valor: candidato.score_estabilidade, peso: 8 },
        { label: 'Organização / Operação', valor: candidato.score_operacao, peso: 5 },
      ]

  const whatsappNumero = hasText(candidato.whatsapp) ? limparTelefone(candidato.whatsapp) : null
  const instagramInfo = extrairInstagram(candidato.instagram)

  const liderouSim = candidato.ja_liderou === 'Sim'
  const liderouNao = candidato.ja_liderou === 'Não'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/candidatos"
              className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              ← Candidatos
            </Link>
            <span className="text-[#E5E5E5]">/</span>
            <span className="text-sm font-medium text-[#0A0A0A]">{candidato.nome}</span>
          </div>
          <button
            onClick={sair}
            className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-16">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {candidato.foto_url ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                <Image
                  src={candidato.foto_url}
                  alt={candidato.nome}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#E5E5E5] flex items-center justify-center shrink-0">
                <span className="text-xl font-semibold text-[#6B6B6B]">
                  {candidato.nome.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">
                  {candidato.nome}
                </h1>
                {candidato.cargo && (() => {
                  const estilos: Record<string, string> = {
                    gerente:  'bg-[#0A0A0A] text-white',
                    vendedor: 'bg-[#1E3A8A] text-white',
                    caixa:    'bg-[#4C1D95] text-white',
                  }
                  const labels: Record<string, string> = { gerente: 'Gerente', vendedor: 'Vendedor', caixa: 'Caixa' }
                  return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${estilos[candidato.cargo!] ?? 'bg-[#E5E5E5] text-[#0A0A0A]'}`}>
                      {labels[candidato.cargo!] ?? candidato.cargo}
                    </span>
                  )
                })()}
              </div>
              <p className="text-sm text-[#6B6B6B]">
                Inscrito em {formatarData(candidato.criado_em)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {colaboradorAtivo && (
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  ✓ Contratado · {colaboradorAtivo.loja}{candidato.cargo === 'gerente' ? ' 👑' : ''}
                </span>
                {(() => {
                  const n = Math.max(1, colaboradorAtivo.nivel)
                  const cargo = candidato.cargo ?? ''
                  // Futura insígnia: aqui entraria <img src={`/insignias/${cargo}-nivel-${n}.png`} alt={`Nível ${n}`} />
                  const estrelas = n <= 5
                    ? <><span className="text-amber-400">{'★'.repeat(n)}</span><span className="text-[#D1D5DB]">{'☆'.repeat(5 - n)}</span></>
                    : <span className="text-amber-400">{'★'.repeat(n)}</span>
                  return (
                    <span className="text-xs text-[#6B6B6B]" title={`Nível ${n}`}>
                      <span className="mr-0.5">N{n}</span>{estrelas}
                    </span>
                  )
                })()}
                <Link href="/admin/equipe" className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Ver na Equipe →
                </Link>
              </div>
            )}
            {!colaboradorAtivo && colaboradorDesligado && (
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8E8E8] text-[#6B6B6B]">
                  Ex-colaborador · Desligado · {colaboradorDesligado.loja}
                </span>
                {colaboradorDesligado.data_saida && (
                  <p className="text-xs text-[#B0B0B0]">
                    Desligado em {new Date(colaboradorDesligado.data_saida).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <Link href="/admin/equipe" className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Ver na Equipe →
                </Link>
              </div>
            )}
            {perfilUsuario?.role === 'master' && candidato.status === 'APROVADO' && !colaboradorAtivo && !colaboradorDesligado && (
              <button
                onClick={() => { if (!movendoEquipe) { setLojaEquipe(''); setDataEntradaEquipe(''); setModalMoverEquipe(true) } }}
                disabled={movendoEquipe}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Mover para Equipe
              </button>
            )}
            {perfilUsuario?.role === 'master' && !colaboradorAtivo && colaboradorDesligado && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setErroRecontratarCandidato(''); setLojaRecontratarCandidato(''); setModalRecontratarCandidato(true) }}
                  disabled={recontratandoCandidato}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0A0A0A] text-white hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Recontratar direto
                </button>
                <button
                  onClick={permitirNovaCandidatura}
                  disabled={permitindo}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E5E5] text-[#0A0A0A] hover:border-[#0A0A0A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {permitindo ? 'Aguarde…' : 'Reabrir candidatura'}
                </button>
              </div>
            )}
            {candidato.perfil && (
              <span
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold ${
                  PERFIL_ESTILO[candidato.perfil] ?? 'bg-[#E8E8E8] text-[#0A0A0A]'
                }`}
              >
                {candidato.perfil}
              </span>
            )}
            <div className="flex flex-col items-end gap-1">
              <StatusChip status={candidato.status} />
              {(candidato.status === 'REPROVADO' || candidato.status === 'BANCO_TALENTOS') && hasText(candidato.motivo_reprovacao) && (
                <div className="text-xs text-[#6B6B6B] space-y-0.5">
                  <p>Motivo: {candidato.motivo_reprovacao}</p>
                  {hasText(candidato.motivo_reprovacao_obs) && (
                    <p className="text-[#9B9B9B]">{candidato.motivo_reprovacao_obs}</p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums text-[#0A0A0A]">
                {candidato.score_final != null ? candidato.score_final.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-[#6B6B6B]">score final</p>
            </div>
          </div>
        </div>

        {/* Card candidatura anterior */}
        {candidato.historico_anterior && (
          <div className="mb-4 bg-[#F9FAFB] border border-[#E5E5E5] rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">Candidatura anterior</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {candidato.historico_anterior.data && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Data</p>
                  <p className="text-[#0A0A0A]">{formatarData(candidato.historico_anterior.data)}</p>
                </div>
              )}
              {candidato.historico_anterior.cargo && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Cargo</p>
                  <p className="text-[#0A0A0A] capitalize">{candidato.historico_anterior.cargo}</p>
                </div>
              )}
              {candidato.historico_anterior.status && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Status</p>
                  <p className="text-[#0A0A0A]">{candidato.historico_anterior.status}</p>
                </div>
              )}
              {candidato.historico_anterior.score_final != null && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Score</p>
                  <p className="text-[#0A0A0A]">{Number(candidato.historico_anterior.score_final).toFixed(1)}</p>
                </div>
              )}
              {candidato.historico_anterior.perfil && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Perfil</p>
                  <p className="text-[#0A0A0A]">{candidato.historico_anterior.perfil}</p>
                </div>
              )}
              {candidato.historico_anterior.ia_recomendacao && (
                <div>
                  <p className="text-xs text-[#B0B0B0]">Recomendação IA</p>
                  <p className="text-[#0A0A0A]">{candidato.historico_anterior.ia_recomendacao}</p>
                </div>
              )}
            </div>
            {candidato.historico_anterior.motivo_reprovacao && (
              <p className="mt-2 text-xs text-red-500">Motivo: {candidato.historico_anterior.motivo_reprovacao}</p>
            )}
          </div>
        )}

        {/* Timeline de tentativas anteriores */}
        {Array.isArray(candidato.historico_tentativas) && candidato.historico_tentativas.length > 0 && (
          <div className="mb-4 bg-[#F9FAFB] border border-[#E5E5E5] rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-3">
              Histórico de candidaturas ({candidato.historico_tentativas.length})
            </p>
            <div className="space-y-3">
              {candidato.historico_tentativas.map((t, i) => (
                <div key={i} className="border-l-2 border-[#E5E5E5] pl-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[#B0B0B0]">#{i + 1} — {formatarData(t.data)}</span>
                    {t.cargo && <span className="text-xs capitalize text-[#6B6B6B]">{t.cargo}</span>}
                    {t.status && <span className="text-xs text-[#6B6B6B]">· {t.status}</span>}
                    {t.score_final != null && <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">{Number(t.score_final).toFixed(1)} pts</span>}
                  </div>
                  {t.motivo_reprovacao && (
                    <p className="text-xs text-[#9B9B9B]">Motivo: {t.motivo_reprovacao}</p>
                  )}
                  {t.ia_recomendacao && (
                    <p className="text-xs text-[#9B9B9B]">IA: {t.ia_recomendacao}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card feedback do candidato */}
        {hasText(candidato.feedback_candidato) && (
          <div className="mb-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-[#92400E] uppercase tracking-wider mb-2">💬 Feedback do candidato</p>
            <p className="text-sm text-[#0A0A0A] whitespace-pre-wrap">{candidato.feedback_candidato}</p>
          </div>
        )}

        {/* Card alerta entrevista vencida */}
        {entrevistaVencida && (
          <div className="mb-4 bg-[#FEF2F2] border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-base mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Entrevista não finalizada</p>
              <p className="text-sm text-red-600">
                A entrevista do dia {formatarDataLocal(candidato.entrevista_data)} já passou. Atualize o resultado abaixo.
              </p>
            </div>
          </div>
        )}

        {/* Card entrevista agendada / confirmada / cancelada */}
        {statusComEntrevista.includes(candidato.status) && candidato.entrevista_data && (
          <div className="mb-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-4 space-y-4">
            {/* Dados da entrevista */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#92400E] uppercase tracking-wider">
                  Entrevista agendada
                </p>
                <p className="text-sm text-[#0A0A0A] font-medium">
                  {formatarDataLocal(candidato.entrevista_data)}
                  {candidato.entrevista_hora && ` às ${candidato.entrevista_hora}h`}
                  {candidato.entrevista_modalidade && ` — ${candidato.entrevista_modalidade}`}
                </p>
                {candidato.entrevista_local && (
                  <p className="text-xs text-[#6B6B6B]">{candidato.entrevista_local}</p>
                )}
                {candidato.entrevista_gestor && (
                  <p className="text-xs text-[#6B6B6B]">Gestor: {candidato.entrevista_gestor}</p>
                )}
              </div>
            </div>

            {/* Confirmação de presença */}
            {candidato.status === 'ENTREVISTA_AGENDADA' && !candidato.entrevista_confirmada && (
              <div className="border-t border-[#FDE68A] pt-4">
                <p className="text-xs font-semibold text-[#92400E] mb-2">Candidato confirmou presença?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmarPresenca(true)}
                    disabled={confirmandoPresenca}
                    className="flex-1 bg-[#166534] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#14532d] transition-colors disabled:opacity-50"
                  >
                    Confirmou (SIM)
                  </button>
                  <button
                    onClick={() => confirmarPresenca(false)}
                    disabled={confirmandoPresenca}
                    className="flex-1 bg-[#DC2626] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50"
                  >
                    Cancelou (NÃO)
                  </button>
                </div>
              </div>
            )}
            {candidato.status === 'ENTREVISTA_AGENDADA' && candidato.entrevista_confirmada && (
              <div className="border-t border-[#FDE68A] pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  ✓ Presença confirmada
                </span>
              </div>
            )}

          </div>
        )}

        {/* Bloco resultado da entrevista */}
        {statusParaResultado.includes(candidato.status) && (
          <div className="mb-6 border border-[#E5E5E5] rounded-xl px-5 py-4 space-y-4">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Resultado da entrevista</p>
            <div className="flex flex-col gap-2">
              {(['Contratado', 'Não contratado', 'Repescagem'] as const).map((opt) => {
                const labels: Record<string, string> = {
                  'Contratado': 'Aprovado — chamar para treinamento',
                  'Não contratado': 'Não contratado',
                  'Repescagem': 'Repescagem',
                }
                return (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resultado_entrevista"
                      value={opt}
                      checked={resultadoEntrevista === opt}
                      onChange={() => setResultadoEntrevista(opt)}
                      className="accent-[#0A0A0A]"
                    />
                    <span className="text-sm text-[#0A0A0A]">{labels[opt]}</span>
                  </label>
                )
              })}
            </div>
            {resultadoEntrevista === 'Não contratado' && (
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={motivoNaoContratacao}
                onChange={(e) => setMotivoNaoContratacao(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
              />
            )}
            <button
              onClick={salvarResultado}
              disabled={salvandoResultado || !resultadoEntrevista}
              className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            >
              {salvandoResultado ? 'Salvando…' : 'Salvar resultado'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Coluna principal (2/3) ─────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contato */}
            <Bloco titulo="Contato">
              <Grid>
                <Campo label="CPF" valor={candidato.cpf ? formatarCPF(candidato.cpf) : null} />
                {hasText(candidato.email) ? (
                  <CampoLink label="E-mail" href={`mailto:${candidato.email}`} texto={candidato.email} />
                ) : (
                  <Campo label="E-mail" valor={null} />
                )}
                {whatsappNumero && (
                  <CampoLink
                    label="WhatsApp"
                    href={`https://wa.me/55${whatsappNumero}`}
                    texto={candidato.whatsapp}
                  />
                )}
                <Campo label="Endereço" valor={candidato.endereco} />
                {instagramInfo && (
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-0.5">Instagram</p>
                    <a
                      href={instagramInfo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0A0A0A] underline underline-offset-2 hover:text-[#404040] transition-colors inline-flex items-center gap-1"
                    >
                      {instagramInfo.usuario}
                      <span className="text-[#6B6B6B]">↗</span>
                    </a>
                  </div>
                )}
              </Grid>
            </Bloco>

            {/* Dados pessoais */}
            <Bloco titulo="Dados Pessoais">
              <Grid>
                <Campo label="Idade" valor={candidato.idade} />
                <Campo label="Escolaridade" valor={candidato.escolaridade} />
                <Campo label="Veículo" valor={candidato.veiculo} />
                <Campo label="Disponibilidade de horário" valor={candidato.disponibilidade_horario} />
                <Campo label="Disponibilidade para mudança" valor={candidato.disponibilidade_mudanca} />
                <Campo label="Pretensão salarial" valor={candidato.pretensao_salarial} />
                {salarioAlerta && (
                  <div className="col-span-2">
                    <p className="text-xs text-amber-600">⚠️ Pretensão acima do teto configurado (R$ {salarioAlerta.teto.toLocaleString('pt-BR')})</p>
                  </div>
                )}
                <Campo label="Qtd. de conduções" valor={candidato.qtd_passagens} />
                <Campo label="Tempo de deslocamento" valor={candidato.tempo_deslocamento} />
                <Campo label="VT mensal estimado" valor={candidato.vt_mensal_estimado} />
                {(candidato.conducoes_ida || candidato.conducoes_volta) && (
                  <Campo
                    label="Conduções informadas"
                    valor={`Ida: ${candidato.conducoes_ida ?? '—'} condução(ões) | Volta: ${candidato.conducoes_volta ?? '—'} condução(ões)`}
                  />
                )}
              </Grid>
              {hasItems(candidato.cnh) && (
                <div className="mt-4">
                  <CampoChips label="CNH" items={candidato.cnh} />
                </div>
              )}
              {hasItems(candidato.unidades) && (
                <div className="mt-4">
                  {/* Unidades de interesse */}
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-1.5">Unidades de interesse</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(candidato.unidades ?? []).map((unidade: string) => {
                        const log = candidato.logistica_por_unidade?.[unidade]
                        const cor = !log
                          ? 'bg-gray-100 text-gray-600'
                          : log.aprovada
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        const label = log && !log.aprovada ? `${unidade} — inviável` : unidade
                        return (
                          <span key={unidade} className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${cor}`}>
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Bloco>

            {/* Experiência */}
            {(hasText(candidato.empresa_atual) ||
              hasText(candidato.ultima_empresa) ||
              hasText(candidato.trabalhando_atualmente)) && (
              <Bloco titulo="Experiência">
                <div className="space-y-5">
                  <Campo label="Trabalhando atualmente?" valor={candidato.trabalhando_atualmente} />
                  {(hasText(candidato.empresa_atual) ||
                    hasText(candidato.cargo_atual) ||
                    hasText(candidato.tempo_empresa_atual) ||
                    hasText(candidato.motivo_busca)) && (
                    <div>
                      <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider mb-3">
                        Empresa atual
                      </p>
                      <Grid>
                        <Campo label="Empresa" valor={candidato.empresa_atual} />
                        <Campo label="Ramo de atuação" valor={candidato.ramo_empresa_atual} />
                        <Campo label="Cargo" valor={candidato.cargo_atual} />
                        <Campo label="Tempo na empresa" valor={candidato.tempo_empresa_atual} />
                        <Campo label="Motivo da busca" valor={candidato.motivo_busca} />
                      </Grid>
                    </div>
                  )}
                  {(hasText(candidato.ultima_empresa) ||
                    hasText(candidato.ultimo_cargo) ||
                    hasText(candidato.tempo_ultima_empresa) ||
                    hasText(candidato.motivo_saida)) && (
                    <div>
                      <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider mb-3">
                        Última empresa
                      </p>
                      <Grid>
                        <Campo label="Empresa" valor={candidato.ultima_empresa} />
                        <Campo label="Ramo de atuação" valor={candidato.ramo_ultima_empresa} />
                        <Campo label="Cargo" valor={candidato.ultimo_cargo} />
                        <Campo label="Tempo na empresa" valor={candidato.tempo_ultima_empresa} />
                        <Campo label="Motivo de saída" valor={candidato.motivo_saida} />
                      </Grid>
                    </div>
                  )}
                </div>
              </Bloco>
            )}

            {/* ── Respostas abertas ─── */}

            {/* Histórico e perfil */}
            {(hasText(candidato.confortavel_cobranca_meta) ||
              hasText(candidato.preferencia_salarial) ||
              hasText(candidato.incomodo_lideranca) ||
              hasText(candidato.ultimas_experiencias)) && (
              <Bloco titulo="Histórico e Perfil">
                <div className="space-y-4">
                  <Campo label="Confortável com cobrança diária de meta?" valor={candidato.confortavel_cobranca_meta} />
                  <Campo label="Preferência de remuneração" valor={candidato.preferencia_salarial} />
                  <Campo label="O que mais incomoda em uma liderança" valor={candidato.incomodo_lideranca} />
                  <Campo label="Últimas 3 experiências profissionais" valor={candidato.ultimas_experiencias} />
                </div>
              </Bloco>
            )}

            {/* Resultado comercial */}
            {(hasText(candidato.gosta_vender) ||
              hasText(candidato.maior_meta) ||
              hasText(candidato.maior_resultado) ||
              hasItems(candidato.ferramentas_comerciais) ||
              hasText(candidato.reacao_abaixo_meta) ||
              hasText(candidato.diferencial_vendas)) && (
              <Bloco titulo="Resultado Comercial">
                <div className="space-y-4">
                  <Campo label="Gosta de vender? Por quê?" valor={candidato.gosta_vender} />
                  <Campo label="Maior meta batida ou superada" valor={candidato.maior_meta} />
                  <Campo label="Valor do resultado" valor={candidato.maior_resultado_valor} />
                  <Campo label="Maior resultado comercial concreto" valor={candidato.maior_resultado} />
                  <CampoChips label="Ferramentas comerciais que já usou" items={candidato.ferramentas_comerciais} />
                  <Campo label="Reação quando abaixo da meta" valor={candidato.reacao_abaixo_meta} />
                  <Campo label="O que diferencia quem entrega resultado" valor={candidato.diferencial_vendas} />
                </div>
              </Bloco>
            )}

            {/* Liderança */}
            {(hasText(candidato.ja_liderou) ||
              hasText(candidato.diferenca_gerente_forte) ||
              hasText(candidato.prejudica_equipe)) && (
              <Bloco titulo="Liderança">
                <div className="space-y-4">
                  <Campo label="Já liderou equipe?" valor={candidato.ja_liderou} />
                  {liderouSim && (
                    <>
                      <Campo label="Quantas pessoas já liderou" valor={candidato.qtd_liderados} />
                      <Campo label="Como age com funcionário de baixo resultado" valor={candidato.reacao_baixo_resultado} />
                      <CampoChips label="Ações de liderança já realizadas" items={candidato.acoes_lideranca} />
                    </>
                  )}
                  {liderouNao && (
                    <Campo label="Por que acredita estar pronto para liderar" valor={candidato.motivo_lideranca_sem_experiencia} />
                  )}
                  <Campo label="O que diferencia um gerente forte" valor={candidato.diferenca_gerente_forte} />
                  <Campo label="O que mais prejudica uma equipe" valor={candidato.prejudica_equipe} />
                </div>
              </Bloco>
            )}

            {/* Perfil comportamental */}
            {(hasText(candidato.para_de_crescer) ||
              hasText(candidato.ambiente_trabalho) ||
              hasText(candidato.caracteristica_principal) ||
              hasText(candidato.incomodo_equipe) ||
              hasText(candidato.perde_motivacao) ||
              hasText(candidato.significado_comprometimento) ||
              hasText(candidato.peso_crescimento) ||
              hasText(candidato.evolucao_profissional) ||
              hasText(candidato.objetivo_5_anos) ||
              hasText(candidato.intenso_vs_toxico)) && (
              <Bloco titulo="Perfil Comportamental">
                <div className="space-y-4">
                  <Campo label="O que faz um profissional parar de crescer" valor={candidato.para_de_crescer} />
                  <Campo label="Ambiente de trabalho preferido" valor={candidato.ambiente_trabalho} />
                  <Campo label="Característica que mais combina" valor={candidato.caracteristica_principal} />
                  <Campo label="O que incomoda nas pessoas da equipe" valor={candidato.incomodo_equipe} />
                  <Campo label="O que faz perder motivação" valor={candidato.perde_motivacao} />
                  <Campo label="O que significa comprometimento" valor={candidato.significado_comprometimento} />
                  <Campo label="Quanto crescimento profissional pesa hoje" valor={candidato.peso_crescimento} />
                  <Campo label="O que faz atualmente para evoluir" valor={candidato.evolucao_profissional} />
                  <Campo label="Onde pretende estar em 5 anos" valor={candidato.objetivo_5_anos} />
                  <Campo label="Diferença entre intenso/competitivo e tóxico" valor={candidato.intenso_vs_toxico} />
                </div>
              </Bloco>
            )}

            {/* Cultura SELETO */}
            {(hasText(candidato.confortavel_cobranca_constante) ||
              hasText(candidato.visao_acompanhamento_meta) ||
              hasText(candidato.gerente_participa_vendas) ||
              hasItems(candidato.ferramentas_utilizadas) ||
              hasText(candidato.acao_movimento_fraco) ||
              hasItems(candidato.confortavel_operacao) ||
              hasText(candidato.permanencia_empresa)) && (
              <Bloco titulo="Cultura SELETO">
                <div className="space-y-4">
                  <Campo label="Confortável com cobrança constante por resultado?" valor={candidato.confortavel_cobranca_constante} />
                  <Campo label="Visão sobre acompanhamento diário de meta" valor={candidato.visao_acompanhamento_meta} />
                  <Campo label="Gerente deve participar ativamente das vendas?" valor={candidato.gerente_participa_vendas} />
                  <CampoChips label="Ferramentas já utilizadas" items={candidato.ferramentas_utilizadas} />
                  <Campo label="Como age em períodos de movimento fraco" valor={candidato.acao_movimento_fraco} />
                  <CampoChips label="Confortável em" items={candidato.confortavel_operacao} />
                  <Campo label="O que faz permanecer em uma empresa" valor={candidato.permanencia_empresa} />
                </div>
              </Bloco>
            )}

            {/* Situações práticas */}
            {(hasText(candidato.case_meta_5dias) ||
              hasText(candidato.case_vendedor_problema) ||
              hasText(candidato.case_equipe_acomodada) ||
              hasText(candidato.case_funcionario_atrasado) ||
              hasText(candidato.case_loja_desorganizada) ||
              hasText(candidato.prioridade_30dias)) && (
              <Bloco titulo="Situações Práticas">
                <div className="space-y-3">
                  <CaseCard
                    pergunta="Faltam 5 dias, loja muito abaixo da meta. O que faz?"
                    resposta={candidato.case_meta_5dias}
                  />
                  <CaseCard
                    pergunta="Vendedor vende muito mas gera problema interno. Como lida?"
                    resposta={candidato.case_vendedor_problema}
                  />
                  <CaseCard
                    pergunta="Equipe perdeu energia e entrou em rotina acomodada. Primeira ação?"
                    resposta={candidato.case_equipe_acomodada}
                  />
                  <CaseCard
                    pergunta="Funcionário frequentemente atrasado mas entrega resultado. Como age?"
                    resposta={candidato.case_funcionario_atrasado}
                  />
                  <CaseCard
                    pergunta="Assumiu loja desorganizada, abaixo da meta, equipe sem direção. O que faz?"
                    resposta={candidato.case_loja_desorganizada}
                  />
                  <CaseCard
                    pergunta="Prioridade nos primeiros 30 dias liderando loja nova"
                    resposta={candidato.prioridade_30dias}
                  />
                </div>
              </Bloco>
            )}

            {/* Arquivos */}
            {(hasText(candidato.curriculo_url) || hasText(candidato.video_url)) && (
              <Bloco titulo="Arquivos">
                <div className="flex flex-wrap gap-3">
                  {hasText(candidato.curriculo_url) && (
                    <a
                      href={candidato.curriculo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-4 py-2 hover:bg-[#F5F5F5] transition-colors"
                    >
                      Ver currículo ↗
                    </a>
                  )}
                  {hasText(candidato.video_url) && (
                    <a
                      href={candidato.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-4 py-2 hover:bg-[#F5F5F5] transition-colors"
                    >
                      Ver vídeo ↗
                    </a>
                  )}
                </div>
              </Bloco>
            )}

            {/* Prova — Vendedor */}
            {candidato.cargo === 'vendedor' && (
              <Bloco titulo="Prova — Vendedor">
                <div className="space-y-4">
                  {hasText(candidato.perfil_vendedor) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-1.5">Perfil identificado</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[#0A0A0A] text-white">
                        {candidato.perfil_vendedor}
                      </span>
                    </div>
                  )}

                  {/* Quiz v3 — respostas reais com labels legíveis */}
                  {candidato.quiz_vendedor_v3?.versao === 'v3' ? (() => {
                    const respostas = candidato.quiz_vendedor_v3!.respostas
                    // Ordem canônica P1-P16: comportamentais na ordem do QUIZ_V3_LABELS, depois objetivas
                    const ORDEM_CAMPOS = Object.keys(QUIZ_V3_LABELS)
                    const comportamentais = ORDEM_CAMPOS
                      .filter(c => respostas[c] && respostas[c].perfil !== null)
                      .map(c => [c, respostas[c]] as const)
                    const objetivas = ORDEM_CAMPOS
                      .filter(c => respostas[c] && respostas[c].perfil === null)
                      .map(c => [c, respostas[c]] as const)
                    const PERFIL_BADGE: Record<string, string> = {
                      N: 'text-red-500', R: 'text-blue-500', E: 'text-green-600', L: 'text-yellow-600',
                    }
                    return (
                      <>
                        <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider pt-1">Respostas do Quiz</p>
                        <div className="space-y-3">
                          {comportamentais.map(([campo, v], idx) => (
                            <div key={campo}>
                              <p className="text-xs text-[#6B6B6B] mb-0.5">
                                P{idx + 1} — {QUIZ_V3_LABELS[campo] ?? campo}
                              </p>
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm text-[#0A0A0A] leading-snug">{v.resposta}</p>
                                {v.perfil && (
                                  <span className={`text-xs font-semibold shrink-0 ${PERFIL_BADGE[v.perfil] ?? 'text-[#B0B0B0]'}`}>
                                    [{v.perfil}]
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {objetivas.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider pt-2">Dados Objetivos</p>
                            <div className="space-y-3">
                              {objetivas.map(([campo, v]) => (
                                <div key={campo}>
                                  <p className="text-xs text-[#6B6B6B] mb-0.5">{QUIZ_V3_LABELS[campo] ?? campo}</p>
                                  <p className="text-sm text-[#0A0A0A]">{v.resposta}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })() : (
                    /* Fallback — candidatos sistema antigo (v1/v2) */
                    <>
                      <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider pt-1">Respostas do Quiz</p>
                      <Grid>
                        <Campo label="P1 — Tempo no último emprego" valor={candidato.tempo_ultimo_emprego} />
                        <Campo label="P2 — Motivo de permanência" valor={candidato.motivo_permanencia} />
                        <Campo label="P3 — Aviso prévio" valor={candidato.saiu_sem_avisar} />
                        <Campo label="P4 — Preferência de trabalho" valor={candidato.preferencia_trabalho} />
                        <Campo label="P5 — Reação a orientação" valor={candidato.reacao_orientacao} />
                        <Campo label="P6 — Aceita regras" valor={candidato.aceita_regras} />
                        <Campo label="P7 — Motivação em vendas" valor={candidato.motivacao_vendas} />
                        <Campo label="P8 — Situação de venda" valor={candidato.situacao_venda} />
                        <Campo label="P9 — Reação sem venda" valor={candidato.reacao_sem_venda} />
                        <Campo label="P10 — Experiência em persuasão" valor={candidato.experiencia_persuasao} />
                        <Campo label="P11 — Movimento fraco" valor={candidato.lida_movimento_fraco} />
                        <Campo label="P12 — Horário de shopping" valor={candidato.aceita_horario_shopping} />
                        {hasText(candidato.restricao_horario_detalhe) && (
                          <Campo label="Restrição de horário (detalhe)" valor={candidato.restricao_horario_detalhe} />
                        )}
                        <Campo label="P13 — Redes sociais" valor={candidato.ativo_redes_sociais} />
                        <Campo label="P14 — Comunicação pessoal" valor={candidato.comunicacao_pessoal} />
                      </Grid>
                      {hasText(candidato.defeito_segundo_gerente) && (
                        <Campo label="P15 — Defeito segundo o gerente" valor={candidato.defeito_segundo_gerente} />
                      )}
                      {hasText(candidato.por_que_confiar) && (
                        <Campo label="P16 — Por que confiar?" valor={candidato.por_que_confiar} />
                      )}
                    </>
                  )}
                </div>
              </Bloco>
            )}
          </div>

          {/* ── Coluna lateral (1/3) ───────────────────────── */}
          <div className="space-y-6">

            {/* Experiência com Caixa */}
            {candidato.cargo === 'caixa' && (
              <Bloco titulo="Experiência com Caixa">
                <div className="space-y-3">
                  <Campo label="Já operou caixa ou PDV?" valor={candidato.operou_caixa} />
                  <Campo label="Facilidade com cálculos e dinheiro" valor={candidato.facilidade_calculos} />
                  <Campo label="Experiência com troco ou fechamento de caixa" valor={candidato.experiencia_troco} />
                  <Campo label="Descrição da experiência" valor={candidato.descricao_experiencia_caixa} />
                </div>
              </Bloco>
            )}

            {/* Perfil de Gestão */}
            {candidato.cargo === 'gerente' && hasText(candidato.perfil_gerente) && (
              <Bloco titulo="Perfil de Gestão">
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-2">Perfil identificado</p>
                  {(() => {
                    const p = candidato.perfil_gerente ?? ''
                    const estilos: Record<string, string> = {
                      'Comercial':   'bg-[#DBEAFE] text-[#1E40AF]',
                      'Pessoas':     'bg-[#DCFCE7] text-[#166534]',
                      'Operacional': 'bg-[#F3F4F6] text-[#374151]',
                      'Estratégico': 'bg-[#EDE9FE] text-[#5B21B6]',
                    }
                    const base = Object.keys(estilos).find(k => p.startsWith(k)) ?? ''
                    const cls = estilos[base] ?? 'bg-[#FEF9C3] text-[#854D0E]'
                    return (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${cls}`}>
                        {p}
                      </span>
                    )
                  })()}
                </div>
              </Bloco>
            )}

            {/* Análise IA — condicional por cargo */}
            {candidato.cargo === 'caixa' ? (
              <Bloco titulo="Análise IA">
                <p className="text-sm text-[#6B6B6B]">Candidato avaliado manualmente na entrevista.</p>
              </Bloco>
            ) : candidato.cargo === 'vendedor' && !candidato.ia_analisado_em && hasText(candidato.perfil_vendedor) ? (
              <Bloco titulo="Perfil do Vendedor">
                {(() => {
                  const p = candidato.perfil_vendedor ?? ''
                  const estilos: Record<string, string> = {
                    'Vendedor Nato':        'bg-[#FEF3C7] text-[#92400E]',
                    'Relacional':           'bg-[#DCFCE7] text-[#166534]',
                    'Executor':             'bg-[#F3F4F6] text-[#374151]',
                    'Organizador':          'bg-[#FFFBEB] text-[#854D0E]',
                    'Liderança Emergente':  'bg-[#EDE9FE] text-[#5B21B6]',
                  }
                  const cls = estilos[p] ?? 'bg-[#F3F4F6] text-[#374151]'
                  return (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${cls}`}>
                      {p}
                    </span>
                  )
                })()}
              </Bloco>
            ) : candidato.ia_analisado_em ? (
              <Bloco titulo="Análise IA">
                <div className="space-y-4">
                  {/* Recomendação */}
                  {hasText(candidato.ia_recomendacao) && (
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        candidato.ia_recomendacao === 'Chamar para entrevista' || candidato.ia_recomendacao === 'Recomendado'
                          ? 'bg-[#0A0A0A] text-white'
                          : candidato.ia_recomendacao === 'Banco de talentos' || candidato.ia_recomendacao === 'Avaliar com atenção'
                          ? 'bg-[#E8E8E8] text-[#0A0A0A]'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {candidato.ia_recomendacao}
                      </span>
                    </div>
                  )}

                  {/* Tipo de perfil */}
                  {hasText(candidato.ia_tipo_perfil) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-0.5">Tipo de perfil</p>
                      <p className="text-sm font-medium text-[#0A0A0A]">{candidato.ia_tipo_perfil}</p>
                    </div>
                  )}

                  {/* Resumo */}
                  {hasText(candidato.ia_resumo) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-0.5">Resumo</p>
                      <p className="text-sm text-[#0A0A0A] leading-relaxed">{candidato.ia_resumo}</p>
                    </div>
                  )}

                  {/* Justificativa */}
                  {hasText(candidato.ia_justificativa) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-0.5">Justificativa</p>
                      <p className="text-sm text-[#404040] leading-relaxed">{candidato.ia_justificativa}</p>
                    </div>
                  )}

                  {/* Pontos fortes */}
                  {hasItems(candidato.ia_pontos_fortes) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-2">Pontos fortes</p>
                      <ul className="space-y-1.5">
                        {candidato.ia_pontos_fortes!.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#0A0A0A]">
                            <span className="text-green-600 mt-0.5 shrink-0">+</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pontos de atenção */}
                  {hasItems(candidato.ia_pontos_atencao) && (
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-2">Pontos de atenção</p>
                      <ul className="space-y-1.5">
                        {candidato.ia_pontos_atencao!.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#0A0A0A]">
                            <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-[#B0B0B0] pt-1">
                    Analisado em {formatarData(candidato.ia_analisado_em)}
                  </p>
                </div>
              </Bloco>
            ) : null}

            {/* ── Mix de perfil v3 (exclusivo vendedor v3) ── */}
            {isVendedorV3 && (() => {
              const mix = candidato.quiz_vendedor_v3!.mix_pct
              const dom = (['N','R','E','L'] as const).reduce((a,b) => mix[a] >= mix[b] ? a : b)
              const div = typeof candidato.score_disciplina_v === 'number' ? candidato.score_disciplina_v : 0
              const rec = recomendacaoV3(candidato.score_final ?? 0)
              return (
                <Bloco titulo="Perfil do Candidato">
                  <div className="space-y-4">
                    {/* Barra de mix */}
                    <div className="space-y-2">
                      {(['N','R','E','L'] as const).map((p) => {
                        const pct = mix[p] ?? 0
                        const cor = PERFIL4_COR[p]
                        return (
                          <div key={p}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-[#6B6B6B]">{cor.dot} {PERFIL4_LABEL[p]}</span>
                              <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${cor.bg.replace('bg-', 'bg-').replace('-100', '-400')}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Perfil dominante */}
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-1">Perfil dominante</p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PERFIL4_COR[dom].bg} ${PERFIL4_COR[dom].text}`}>
                        {PERFIL4_COR[dom].dot} {PERFIL4_LABEL[dom]}
                      </span>
                    </div>

                    {/* Coerência */}
                    <div>
                      {div <= 1
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700">✅ Respostas coerentes</span>
                        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700">⚠️ {div} contradição{div > 1 ? 'ões' : ''}</span>
                      }
                    </div>

                    {/* Recomendação */}
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-1">Recomendação</p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${rec.cls}`}>
                        {rec.label}
                      </span>
                    </div>
                  </div>
                </Bloco>
              )
            })()}

            {/* ── Sistema antigo (vendedor sem v3) ── */}
            {isVendedor && !isVendedorV3 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-[#F9FAFB]">
                <span className="text-xs text-[#6B6B6B]">📋 Score calculado pelo sistema antigo</span>
              </div>
            )}

            {/* Score por dimensão */}
            {candidato.cargo === 'caixa' ? (
              <Bloco titulo="Score por Dimensão">
                <p className="text-sm text-[#6B6B6B]">Avaliação: sem score automático</p>
              </Bloco>
            ) : (
              <Bloco titulo="Score por Dimensão">
                <div className="space-y-1">
                  {dimensoes.map((d) => {
                    const pontuacao = d.valor != null ? Number(d.valor) : null
                    const contribuicao = pontuacao != null
                      ? (pontuacao * d.peso / 100).toFixed(2)
                      : null
                    return (
                      <div key={d.label} className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">
                            {d.label}
                            <span className="text-gray-400 ml-1">({d.peso}%)</span>
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">
                              {pontuacao != null ? pontuacao.toFixed(1) : '—'}
                            </span>
                            <span className="text-xs text-gray-400">→</span>
                            <span className="text-sm font-bold text-gray-900 w-10 text-right">
                              {contribuicao ?? '—'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          {pontuacao != null && (
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, pontuacao)}%`,
                                background: 'linear-gradient(to right, #EF4444 0%, #EAB308 50%, #22C55E 100%)',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Score Final</span>
                    <span className="text-lg font-bold text-gray-900">
                      {candidato.score_final != null ? candidato.score_final.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              </Bloco>
            )}

            {/* Alertas */}
            <Bloco titulo="Alertas">
              {alertasCodigos.length === 0 ? (
                <p className="text-sm text-[#6B6B6B]">Nenhum alerta.</p>
              ) : (
                <div className="space-y-4">
                  {alertasCodigos.map((codigo) => {
                    const info = (isVendedorV3 ? ALERTAS_V3_MAP[codigo] : null) ?? ALERTAS_MAP[codigo]
                    return (
                      <div key={codigo} className="border-l-2 border-red-200 pl-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-[#0A0A0A]">
                            <span className="text-red-500 mr-1">{codigo}</span>
                            {info?.nome ?? codigo}
                          </span>
                          {info && info.penalidade !== 0 && (
                            <span className="text-red-500 font-semibold tabular-nums text-xs ml-2 shrink-0">
                              {info.penalidade}
                            </span>
                          )}
                        </div>
                        {info?.descricao && (
                          <p className="text-xs text-[#6B6B6B] leading-relaxed">{info.descricao}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Bloco>

            {/* Status */}
            <Bloco titulo="Status">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1.5">Status atual</p>
                  <StatusChip status={candidato.status} />
                </div>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as StatusCandidato)}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] bg-white transition-colors"
                >
                  {(Object.entries(STATUS_CONFIG) as [StatusCandidato, { label: string }][]).map(([value, cfg]) => (
                    <option key={value} value={value}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={salvarStatus}
                  disabled={salvandoStatus}
                  className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                  {salvandoStatus ? 'Salvando…' : 'Salvar status'}
                </button>
              </div>
            </Bloco>

            {/* Convocar para entrevista */}
            {statusParaConvocar.includes(candidato.status) && (
              <div
                className="relative group"
                title={statusBloqueadoConvocacao.includes(candidato.status) ? 'Candidato já está em processo de entrevista com outro gestor. Aguarde a finalização.' : undefined}
              >
                <button
                  onClick={() => !statusBloqueadoConvocacao.includes(candidato.status) && setModalConvocacao(true)}
                  disabled={statusBloqueadoConvocacao.includes(candidato.status)}
                  className={`w-full text-sm font-medium py-2.5 rounded-lg transition-colors ${
                    statusBloqueadoConvocacao.includes(candidato.status)
                      ? 'bg-[#E5E5E5] text-[#B0B0B0] cursor-not-allowed'
                      : 'bg-[#0A0A0A] text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  Convocar para entrevista
                </button>
                {statusBloqueadoConvocacao.includes(candidato.status) && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-2 bg-[#0A0A0A] text-white text-xs rounded-lg leading-snug opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Candidato já está em processo de entrevista com outro gestor. Aguarde a finalização.
                  </div>
                )}
              </div>
            )}

            {/* Observações */}
            <Bloco titulo="Observações">
              <div className="space-y-3">
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={5}
                  placeholder="Anotações internas sobre este candidato…"
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] bg-white transition-colors resize-none"
                />
                <button
                  onClick={salvarObservacoes}
                  disabled={salvandoObs}
                  className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                  {salvandoObs ? 'Salvando…' : 'Salvar observações'}
                </button>
              </div>
            </Bloco>

            {/* Permitir nova candidatura */}
            {(candidato.status === 'REPROVADO' || candidato.status === 'BANCO_TALENTOS') && (
              <button
                onClick={() => setModalNovaCandidatura(true)}
                className="w-full border border-[#E5E5E5] text-[#6B6B6B] text-xs font-medium py-2.5 rounded-lg hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
              >
                Permitir nova candidatura
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal — motivo de reprovação / banco de talentos */}
      {modalMotivo && statusPendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-sm w-full p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">
              {statusPendente === 'REPROVADO' ? 'Reprovar candidato' : 'Enviar ao Banco de Talentos'}
            </h2>
            <p className="text-sm text-[#6B6B6B] mb-4">Selecione o motivo (obrigatório)</p>
            <select
              value={motivoCategoria}
              onChange={(e) => setMotivoCategoria(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-3"
            >
              <option value="">Selecione…</option>
              {statusPendente === 'REPROVADO' ? (
                <>
                  <option>Não compareceu à entrevista</option>
                  <option>Perfil não compatível com a vaga</option>
                  <option>Desistência do candidato</option>
                  <option>Pretensão salarial incompatível</option>
                  <option>Disponibilidade incompatível</option>
                  <option>Reprovado na entrevista</option>
                  <option>Outro</option>
                </>
              ) : (
                <>
                  <option>Bom perfil sem vaga no momento</option>
                  <option>Aguardando abertura de unidade</option>
                  <option>Candidato promissor para o futuro</option>
                  <option>Outro</option>
                </>
              )}
            </select>
            <textarea
              rows={2}
              placeholder="Observação (obrigatória)"
              value={motivoObs}
              onChange={(e) => setMotivoObs(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors mb-2 resize-none"
            />
            {(!motivoCategoria || !motivoObs.trim()) && (
              <p className="text-xs text-amber-600 mb-3">
                Escreva uma observação para registrar o motivo antes de salvar.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setModalMotivo(false); setStatusPendente(null) }}
                className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!motivoCategoria || !motivoObs.trim() || salvandoStatus}
                onClick={() => confirmarSalvarStatus(statusPendente, motivoCategoria, motivoObs || null)}
                className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {salvandoStatus ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNovaCandidatura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Permitir nova candidatura</h2>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              O histórico atual será salvo e o candidato poderá se candidatar novamente para o mesmo cargo. Tem certeza?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalNovaCandidatura(false)}
                className="flex-1 border border-[#E5E5E5] text-[#6B6B6B] text-sm font-medium py-2.5 rounded-lg hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={permitirNovaCandidatura}
                disabled={permitindo}
                className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
              >
                {permitindo ? 'Processando…' : 'Sim, permitir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Mover para Equipe */}
      {modalMoverEquipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">Mover para Equipe</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#6B6B6B] mb-1">Loja</label>
                <select
                  value={lojaEquipe}
                  onChange={e => setLojaEquipe(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]"
                >
                  <option value="">Selecione a loja</option>
                  {['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6B6B6B] mb-1">Data de início do treinamento</label>
                <input
                  type="date"
                  value={dataEntradaEquipe}
                  onChange={e => setDataEntradaEquipe(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]"
                />
                <p className="text-xs text-[#6B6B6B] mt-1">Use a data real em que o colaborador começou (ou vai começar) o treinamento na loja.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalMoverEquipe(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={moverParaEquipe}
                disabled={!lojaEquipe || !dataEntradaEquipe || movendoEquipe}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {movendoEquipe ? 'Movendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRecontratarCandidato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Recontratar direto</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">{candidato.nome}</p>
            <label className="block text-xs text-[#6B6B6B] mb-1">Loja</label>
            <select
              value={lojaRecontratarCandidato}
              onChange={(e) => setLojaRecontratarCandidato(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] mb-4"
            >
              <option value="">Selecione a loja…</option>
              {['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {erroRecontratarCandidato && (
              <p className="text-xs text-red-600 mb-3">{erroRecontratarCandidato}</p>
            )}
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => { setModalRecontratarCandidato(false); setLojaRecontratarCandidato(''); setErroRecontratarCandidato('') }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={recontratarCandidato}
                disabled={!lojaRecontratarCandidato || recontratandoCandidato}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0A0A0A] text-white hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {recontratandoCandidato ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConvocacao && (
        <ModalConvocacao
          candidatoId={candidato.id}
          candidatoNome={candidato.nome}
          candidatoWhatsapp={candidato.whatsapp}
          candidatoEmail={candidato.email}
          candidatoCargo={candidato.cargo}
          candidatoUnidades={candidato.unidades}
          emailsUnidade={emailsUnidade}
          gestorUnidade={perfilUsuario?.unidade ?? null}
          onClose={() => setModalConvocacao(false)}
          onSuccess={(dados) => {
            setCandidato((prev) =>
              prev
                ? {
                    ...prev,
                    ...dados,
                    status: 'ENTREVISTA_AGENDADA',
                    entrevista_agendada_em: new Date().toISOString(),
                    entrevista_resultado: 'Aguardando',
                  }
                : prev,
            )
            setNovoStatus('ENTREVISTA_AGENDADA')
            setModalConvocacao(false)
          }}
        />
      )}
    </div>
  )
}
