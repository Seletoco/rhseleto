'use client'

import { useEffect, useState, useId } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ── UI helpers ────────────────────────────────────────────────────────────────

const cls =
  'w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#0A0A0A] transition-colors bg-white'

function Field({
  label, required, hint, children, id,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode; id?: string
}) {
  return (
    <div id={id} className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#0A0A0A]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-[#6B6B6B] -mt-0.5">{hint}</p>}
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      className={cls}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function TA({ value, onChange, placeholder, rows = 4, minLen, error, id }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number; minLen?: number
  error?: boolean; id?: string
}) {
  return (
    <div id={id}>
      <textarea
        className={`${cls} resize-none${error ? ' border-red-400 focus:border-red-500' : ''}`}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {minLen !== undefined && (
        <p className={`text-xs mt-1 ${error ? 'text-red-500 font-medium' : value.length >= minLen ? 'text-[#6B6B6B]' : 'text-[#9CA3AF]'}`}>
          {error
            ? `Desenvolva sua resposta (mínimo ${minLen} caracteres)`
            : `${value.length} / ${minLen} caracteres mínimos`}
        </p>
      )}
    </div>
  )
}

function RG({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  const uid = useId()
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => {
        const id = `${uid}-${opt}`
        const checked = value === opt
        return (
          <div key={opt} className="flex items-center gap-3">
            <input type="radio" id={id} name={uid} value={opt} checked={checked}
              onChange={() => onChange(opt)} className="sr-only" />
            <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors
                ${checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D0D0D0] group-hover:border-[#0A0A0A]'}`}>
                {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-[#0A0A0A]">{opt}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

function CG({ value, onChange, options }: {
  value: string[]; onChange: (v: string[]) => void; options: string[]
}) {
  const uid = useId()
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt])
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => {
        const id = `${uid}-${opt}`
        const checked = value.includes(opt)
        return (
          <div key={opt} className="flex items-center gap-3">
            <input type="checkbox" id={id} checked={checked}
              onChange={() => toggle(opt)} className="sr-only" />
            <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                ${checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D0D0D0] group-hover:border-[#0A0A0A]'}`}>
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-[#0A0A0A]">{opt}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <input
        type="range" min={0} max={10} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#0A0A0A]"
      />
      <div className="flex justify-between text-xs text-[#6B6B6B]">
        <span>0 — Não importa</span>
        <span className="font-semibold text-[#0A0A0A] text-sm">{value}</span>
        <span>10 — Prioridade máxima</span>
      </div>
    </div>
  )
}

function CardOpcao({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-left px-4 py-3.5 rounded-lg border text-sm transition-colors leading-snug ${
            value === opt
              ? 'border-[#0A0A0A] bg-[#F5F5F5] font-medium text-[#0A0A0A]'
              : 'border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#B0B0B0]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Sel({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <select
      className={cls}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder ?? 'Selecione...'}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

// Textarea complementar (aparece abaixo de CardOpcao com hint padrão)
function TAComplementar({ value, onChange, error, id }: {
  value: string; onChange: (v: string) => void; error?: boolean; id?: string
}) {
  return (
    <div className="mt-3" id={id}>
      <p className="text-xs text-[#6B6B6B] mb-1.5">Desenvolva com suas próprias palavras</p>
      <textarea
        className={`${cls} resize-none${error ? ' border-red-400 focus:border-red-500' : ''}`}
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Explique com suas palavras..."
      />
      <p className={`text-xs mt-1 ${error ? 'text-red-500 font-medium' : value.length >= 15 ? 'text-[#6B6B6B]' : 'text-[#9CA3AF]'}`}>
        {error
          ? 'Desenvolva sua resposta (mínimo 15 caracteres)'
          : `${value.length} / 15 caracteres mínimos`}
      </p>
    </div>
  )
}

const RAMOS = [
  'Varejo de moda, calçados ou acessórios',
  'Varejo de esporte e artigos fitness',
  'Varejo de eletrônicos ou telefonia',
  'Alimentação e bebidas',
  'Serviços (academia, salão, clínica, etc.)',
  'Construção e materiais',
  'Atacado e distribuição',
  'Indústria',
  'Tecnologia e software',
  'Outro',
]

function formatMoeda(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10)
  const reais = Math.floor(num / 100)
  const cents = num % 100
  return `R$ ${reais.toLocaleString('pt-BR')},${cents.toString().padStart(2, '0')}`
}

// ── Form state ────────────────────────────────────────────────────────────────

type F = {
  trabalhando_atualmente: string
  empresa_atual: string
  ramo_empresa_atual: string
  ramo_empresa_atual_outro: string
  cargo_atual: string
  tempo_empresa_atual: string
  motivo_busca: string
  ultima_empresa: string
  ramo_ultima_empresa: string
  ramo_ultima_empresa_outro: string
  ultimo_cargo: string
  tempo_ultima_empresa: string
  motivo_saida: string
  ultimas_experiencias: string
  confortavel_cobranca_meta: string
  preferencia_salarial: string
  incomodo_lideranca: string
  incomodo_lideranca_opcao: string
  gosta_vender: string
  gosta_vender_opcao: string
  maior_percentual_meta: string
  maior_meta: string
  maior_resultado_valor: string
  maior_resultado: string
  ferramentas_comerciais: string[]
  reacao_abaixo_meta: string
  reacao_abaixo_meta_opcao: string
  prejudica_resultado: string
  prejudica_resultado_opcao: string
  diferencial_vendas: string
  diferencial_vendas_opcao: string
  ja_liderou: string
  qtd_liderados: string
  acoes_lideranca: string[]
  motivo_lideranca_sem_experiencia: string
  reacao_baixo_resultado: string
  diferenca_gerente_forte: string
  diferenca_gerente_forte_opcao: string
  prejudica_equipe: string
  prejudica_equipe_opcao: string
  para_de_crescer: string
  ambiente_trabalho: string
  caracteristica_principal: string
  caracteristica_principal_opcao: string
  incomodo_equipe: string
  incomodo_equipe_opcao: string
  perde_motivacao: string
  perde_motivacao_opcao: string
  significado_comprometimento: string
  significado_comprometimento_opcao: string
  peso_crescimento: number
  evolucao_profissional: string
  objetivo_5_anos: string
  intenso_vs_toxico: string
  intenso_vs_toxico_opcao: string
  confortavel_cobranca_constante: string
  visao_acompanhamento_meta: string
  visao_acompanhamento_meta_opcao: string
  gerente_participa_vendas: string
  ferramentas_utilizadas: string[]
  acao_movimento_fraco: string
  acao_movimento_fraco_opcao: string
  confortavel_operacao: string[]
  permanencia_empresa: string
  case_meta_5dias: string
  case_vendedor_problema: string
  case_equipe_acomodada: string
  case_funcionario_atrasado: string
  case_loja_desorganizada: string
  prioridade_30dias: string
  video_url: string
}

const EMPTY: F = {
  trabalhando_atualmente: '', empresa_atual: '',
  ramo_empresa_atual: '', ramo_empresa_atual_outro: '',
  cargo_atual: '',
  tempo_empresa_atual: '', motivo_busca: '', ultima_empresa: '',
  ramo_ultima_empresa: '', ramo_ultima_empresa_outro: '',
  ultimo_cargo: '', tempo_ultima_empresa: '', motivo_saida: '',
  ultimas_experiencias: '', confortavel_cobranca_meta: '',
  preferencia_salarial: '', incomodo_lideranca: '', incomodo_lideranca_opcao: '',
  gosta_vender: '', gosta_vender_opcao: '',
  maior_percentual_meta: '', maior_meta: '', maior_resultado_valor: '', maior_resultado: '',
  ferramentas_comerciais: [], reacao_abaixo_meta: '', reacao_abaixo_meta_opcao: '',
  prejudica_resultado: '', prejudica_resultado_opcao: '',
  diferencial_vendas: '', diferencial_vendas_opcao: '',
  ja_liderou: '', qtd_liderados: '', acoes_lideranca: [],
  motivo_lideranca_sem_experiencia: '', reacao_baixo_resultado: '',
  diferenca_gerente_forte: '', diferenca_gerente_forte_opcao: '',
  prejudica_equipe: '', prejudica_equipe_opcao: '',
  para_de_crescer: '', ambiente_trabalho: '',
  caracteristica_principal: '', caracteristica_principal_opcao: '',
  incomodo_equipe: '', incomodo_equipe_opcao: '',
  perde_motivacao: '', perde_motivacao_opcao: '',
  significado_comprometimento: '', significado_comprometimento_opcao: '',
  peso_crescimento: 7, evolucao_profissional: '', objetivo_5_anos: '',
  intenso_vs_toxico: '', intenso_vs_toxico_opcao: '',
  confortavel_cobranca_constante: '',
  visao_acompanhamento_meta: '', visao_acompanhamento_meta_opcao: '',
  gerente_participa_vendas: '', ferramentas_utilizadas: [],
  acao_movimento_fraco: '', acao_movimento_fraco_opcao: '',
  confortavel_operacao: [], permanencia_empresa: '',
  case_meta_5dias: '', case_vendedor_problema: '', case_equipe_acomodada: '',
  case_funcionario_atrasado: '', case_loja_desorganizada: '',
  prioridade_30dias: '', video_url: '',
}

function mapPeso(v: number): string {
  if (v >= 9) return 'É minha prioridade principal'
  if (v >= 7) return 'Pesa bastante'
  if (v >= 5) return 'Considero importante'
  return 'Não é prioridade no momento'
}

// ── Validation ────────────────────────────────────────────────────────────────

const TITULOS_SECAO = [
  'Histórico Profissional',
  'Resultado Comercial',
  'Liderança e Gestão',
  'Perfil Comportamental',
  'Cultura SELETO',
  'Situações Práticas',
  'Apresentação em Vídeo',
]

type ValidationResult = { erros: string[]; camposErro: Set<string> }

function validar(secao: number, f: F, curriculo?: File | null): ValidationResult {
  const erros: string[] = []
  const camposErro = new Set<string>()

  const req = (val: string, campo: string, label: string) => {
    if (!val.trim()) { erros.push(`"${label}" é obrigatório`); camposErro.add(campo) }
  }
  const minReq = (val: string, n: number, campo: string, label: string) => {
    if (!val.trim()) { erros.push(`"${label}" é obrigatório`); camposErro.add(campo) }
    else if (val.trim().length < n) { erros.push(`"${label}": mínimo ${n} caracteres`); camposErro.add(campo) }
  }

  if (secao === 0) {
    req(f.trabalhando_atualmente, 'trabalhando_atualmente', 'Situação de emprego')
    if (f.trabalhando_atualmente === 'Sim') {
      req(f.empresa_atual, 'empresa_atual', 'Empresa atual')
      req(f.ramo_empresa_atual, 'ramo_empresa_atual', 'Ramo de atuação')
      if (f.ramo_empresa_atual === 'Outro') req(f.ramo_empresa_atual_outro, 'ramo_empresa_atual_outro', 'Qual ramo?')
      req(f.cargo_atual, 'cargo_atual', 'Cargo atual')
      req(f.tempo_empresa_atual, 'tempo_empresa_atual', 'Tempo na empresa')
      req(f.motivo_busca, 'motivo_busca', 'Motivo da busca')
    } else if (f.trabalhando_atualmente === 'Não') {
      req(f.ultima_empresa, 'ultima_empresa', 'Última empresa')
      req(f.ramo_ultima_empresa, 'ramo_ultima_empresa', 'Ramo de atuação')
      if (f.ramo_ultima_empresa === 'Outro') req(f.ramo_ultima_empresa_outro, 'ramo_ultima_empresa_outro', 'Qual ramo?')
      req(f.ultimo_cargo, 'ultimo_cargo', 'Último cargo')
      req(f.tempo_ultima_empresa, 'tempo_ultima_empresa', 'Tempo na empresa')
      req(f.motivo_saida, 'motivo_saida', 'Motivo de saída')
    }
    minReq(f.ultimas_experiencias, 80, 'ultimas_experiencias', 'Últimas 3 experiências')
    if (!curriculo) { erros.push('"Currículo" é obrigatório'); camposErro.add('curriculo') }
    minReq(f.incomodo_lideranca, 15, 'incomodo_lideranca', 'O que te incomoda em uma liderança')
  } else if (secao === 1) {
    req(f.maior_resultado_valor, 'maior_resultado_valor', 'Valor do maior resultado')
    minReq(f.maior_resultado, 80, 'maior_resultado', 'Maior resultado comercial')
    minReq(f.maior_meta, 3, 'maior_meta', 'Maior meta atingida')
    minReq(f.gosta_vender, 15, 'gosta_vender', 'O que te motiva em vender')
    minReq(f.reacao_abaixo_meta, 15, 'reacao_abaixo_meta', 'Como age abaixo da meta')
    minReq(f.prejudica_resultado, 15, 'prejudica_resultado', 'Diferencial de quem entrega resultado')
    minReq(f.diferencial_vendas, 15, 'diferencial_vendas', 'Seu maior diferencial como gestor')
  } else if (secao === 2) {
    req(f.ja_liderou, 'ja_liderou', 'Experiência de liderança')
    minReq(f.reacao_baixo_resultado, 80, 'reacao_baixo_resultado', 'Como age com funcionário abaixo do resultado')
    minReq(f.diferenca_gerente_forte, 15, 'diferenca_gerente_forte', 'O que separa um gerente forte')
    minReq(f.prejudica_equipe, 15, 'prejudica_equipe', 'O que mais prejudica uma equipe')
  } else if (secao === 3) {
    minReq(f.caracteristica_principal, 15, 'caracteristica_principal', 'Sua principal característica')
    minReq(f.incomodo_equipe, 15, 'incomodo_equipe', 'O que te incomoda na equipe')
    minReq(f.perde_motivacao, 15, 'perde_motivacao', 'O que te faz perder motivação')
    minReq(f.significado_comprometimento, 15, 'significado_comprometimento', 'O que significa comprometimento')
    minReq(f.intenso_vs_toxico, 15, 'intenso_vs_toxico', 'Diferença entre intenso e tóxico')
    minReq(f.para_de_crescer, 30, 'para_de_crescer', 'O que faz um profissional parar de crescer')
    minReq(f.ambiente_trabalho, 30, 'ambiente_trabalho', 'Ambiente de trabalho preferido')
  } else if (secao === 4) {
    minReq(f.confortavel_cobranca_meta, 30, 'confortavel_cobranca_meta', 'Como se sente sendo cobrado por metas')
    minReq(f.visao_acompanhamento_meta, 15, 'visao_acompanhamento_meta', 'Como vê o acompanhamento diário de meta')
    minReq(f.acao_movimento_fraco, 15, 'acao_movimento_fraco', 'Como age em movimento fraco')
    minReq(f.permanencia_empresa, 30, 'permanencia_empresa', 'O que te faz permanecer na empresa')
  } else if (secao === 5) {
    const cases = [
      f.case_meta_5dias, f.case_vendedor_problema, f.case_equipe_acomodada,
      f.case_funcionario_atrasado, f.case_loja_desorganizada,
    ]
    const casesOk = cases.filter(c => c.trim().length >= 80).length
    if (casesOk < 3) {
      erros.push('Responda pelo menos 3 situações práticas com detalhes (mínimo 80 caracteres cada)')
    }
    minReq(f.prioridade_30dias, 30, 'prioridade_30dias', 'Prioridades nos primeiros 30 dias')
  }

  return { erros, camposErro }
}

// ── Formulário ────────────────────────────────────────────────────────────────

function FormularioEtapa2({ token }: { token: string }) {
  const router = useRouter()
  const [secao, setSecao] = useState(0)
  const [f, setF] = useState<F>(EMPTY)
  const [curriculo, setCurriculo] = useState<File | null>(null)
  const [curriculoErro, setCurriculoErro] = useState('')
  const [erros, setErros] = useState<string[]>([])
  const [errosCampos, setErrosCampos] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  // Restaurar rascunho ao montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`seleto_rascunho_${token}`)
      if (saved) setF(JSON.parse(saved))
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Salvar rascunho automaticamente quando f mudar
  useEffect(() => {
    try {
      sessionStorage.setItem(`seleto_rascunho_${token}`, JSON.stringify(f))
    } catch {}
  }, [f, token])

  const set = (campo: keyof F) => (v: F[typeof campo]) =>
    setF(prev => ({ ...prev, [campo]: v }))

  function handleContinuar() {
    const { erros: e, camposErro: ce } = validar(secao, f, curriculo)
    if (e.length > 0) {
      setErros(e)
      setErrosCampos(ce)
      // Scroll até o primeiro campo inválido
      const primeiroCampo = [...ce][0]
      if (primeiroCampo) {
        setTimeout(() => {
          const el = document.getElementById(`campo-${primeiroCampo}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 50)
      }
      return
    }
    setErros([])
    setErrosCampos(new Set())
    setSecao(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleEnviar() {
    if (enviando) return
    setErroEnvio('')
    setEnviando(true)

    const candidato_id = sessionStorage.getItem('seleto_candidato_id')
    if (!candidato_id) { setErroEnvio('Sessão inválida. Recarregue a página.'); setEnviando(false); return }

    let curriculo_url = ''
    if (curriculo) {
      const fd = new FormData()
      fd.append('arquivo', curriculo)
      const res = await fetch('/api/upload-curriculo', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        curriculo_url = data.url ?? ''
      }
    }

    const {
      ramo_empresa_atual_outro,
      ramo_ultima_empresa_outro,
      ...rest
    } = f

    const payload = {
      candidato_id,
      ...rest,
      ramo_empresa_atual: f.ramo_empresa_atual === 'Outro' ? ramo_empresa_atual_outro : f.ramo_empresa_atual,
      ramo_ultima_empresa: f.ramo_ultima_empresa === 'Outro' ? ramo_ultima_empresa_outro : f.ramo_ultima_empresa,
      peso_crescimento: mapPeso(f.peso_crescimento),
      curriculo_url: curriculo_url || undefined,
    }

    const res = await fetch('/api/finalizar-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setErroEnvio('Ocorreu um erro ao enviar. Tente novamente.')
      setEnviando(false)
      return
    }

    try {
      sessionStorage.removeItem(`seleto_rascunho_${token}`)
      sessionStorage.removeItem('seleto_candidato_id')
    } catch {}
    router.push('/obrigado')
  }

  const totalSecoes = 7
  const progresso = ((secao + 1) / totalSecoes) * 100

  const err = (campo: string) => errosCampos.has(campo)

  function renderSecao() {
    switch (secao) {
      case 0: return (
        <div className="flex flex-col gap-6">
          <Field label="Você está trabalhando atualmente?" required id="campo-trabalhando_atualmente">
            <RG value={f.trabalhando_atualmente} onChange={set('trabalhando_atualmente')} options={['Sim', 'Não']} />
          </Field>

          {f.trabalhando_atualmente === 'Sim' && <>
            <Field label="Qual empresa?" required id="campo-empresa_atual">
              <Inp value={f.empresa_atual} onChange={set('empresa_atual')} placeholder="Nome da empresa" />
            </Field>
            <Field label="Ramo de atuação da empresa" required id="campo-ramo_empresa_atual">
              <Sel value={f.ramo_empresa_atual} onChange={set('ramo_empresa_atual')} options={RAMOS} placeholder="Selecione o ramo..." />
              {f.ramo_empresa_atual === 'Outro' && (
                <div className="mt-2">
                  <Inp value={f.ramo_empresa_atual_outro} onChange={set('ramo_empresa_atual_outro')} placeholder="Qual ramo?" />
                </div>
              )}
            </Field>
            <Field label="Qual seu cargo atual?" required id="campo-cargo_atual">
              <Inp value={f.cargo_atual} onChange={set('cargo_atual')} placeholder="Ex: Gerente de loja" />
            </Field>
            <Field label="Há quanto tempo está nessa empresa?" required id="campo-tempo_empresa_atual">
              <Inp value={f.tempo_empresa_atual} onChange={set('tempo_empresa_atual')} placeholder="Ex: 2 anos e 3 meses" />
            </Field>
            <Field label="Por que está buscando uma nova oportunidade?" required hint="Seja específico sobre o que motivou essa busca agora." id="campo-motivo_busca">
              <TA value={f.motivo_busca} onChange={set('motivo_busca')} error={err('motivo_busca')} />
            </Field>
          </>}

          {f.trabalhando_atualmente === 'Não' && <>
            <Field label="Qual foi sua última empresa?" required id="campo-ultima_empresa">
              <Inp value={f.ultima_empresa} onChange={set('ultima_empresa')} placeholder="Nome da empresa" />
            </Field>
            <Field label="Ramo de atuação da empresa" required id="campo-ramo_ultima_empresa">
              <Sel value={f.ramo_ultima_empresa} onChange={set('ramo_ultima_empresa')} options={RAMOS} placeholder="Selecione o ramo..." />
              {f.ramo_ultima_empresa === 'Outro' && (
                <div className="mt-2">
                  <Inp value={f.ramo_ultima_empresa_outro} onChange={set('ramo_ultima_empresa_outro')} placeholder="Qual ramo?" />
                </div>
              )}
            </Field>
            <Field label="Qual era seu cargo?" required id="campo-ultimo_cargo">
              <Inp value={f.ultimo_cargo} onChange={set('ultimo_cargo')} placeholder="Ex: Gerente de loja" />
            </Field>
            <Field label="Quanto tempo ficou nessa empresa?" required id="campo-tempo_ultima_empresa">
              <Inp value={f.tempo_ultima_empresa} onChange={set('tempo_ultima_empresa')} placeholder="Ex: 1 ano e 6 meses" />
            </Field>
            <Field label="Por que saiu?" required hint="Evite críticas genéricas. Conte o contexto real." id="campo-motivo_saida">
              <TA value={f.motivo_saida} onChange={set('motivo_saida')} error={err('motivo_saida')} />
            </Field>
          </>}

          <Field label="Descreva suas últimas 3 experiências profissionais" hint="Cite empresa, cargo, tempo e principal resultado em cada uma." required id="campo-ultimas_experiencias">
            <TA value={f.ultimas_experiencias} onChange={set('ultimas_experiencias')} rows={6} minLen={80}
              error={err('ultimas_experiencias')} />
          </Field>

          <Field label="O que mais te incomoda em uma liderança?" required id="campo-incomodo_lideranca_opcao">
            <CardOpcao value={f.incomodo_lideranca_opcao} onChange={set('incomodo_lideranca_opcao')} options={[
              'Falta de clareza nas metas e direcionamento',
              'Não reconhecer o esforço e desenvolvimento da equipe',
              'Desorganização e falta de processos definidos',
              'Liderança que não pensa no crescimento do negócio',
              'Microgerenciamento sem autonomia',
            ]} />
            <TAComplementar
              value={f.incomodo_lideranca} onChange={set('incomodo_lideranca')}
              error={err('incomodo_lideranca')} id="campo-incomodo_lideranca"
            />
          </Field>

          <Field label="Qual sua preferência de remuneração?">
            <RG value={f.preferencia_salarial} onChange={set('preferencia_salarial')}
              options={['Fixo maior com variável menor', 'Fixo menor com variável agressivo', 'Tanto faz, desde que o total seja justo']} />
          </Field>

          <Field label="Currículo (PDF ou Word)" required>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => {
                const file = e.target.files?.[0] ?? null
                if (file) {
                  const tipos = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                  if (!tipos.includes(file.type)) {
                    setCurriculoErro('Formato inválido. Use PDF, DOC ou DOCX.')
                    setCurriculo(null)
                    e.target.value = ''
                    return
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setCurriculoErro('Arquivo muito grande. Máximo 5MB.')
                    setCurriculo(null)
                    e.target.value = ''
                    return
                  }
                  setCurriculoErro('')
                }
                setCurriculo(file)
              }}
              className="text-sm text-[#6B6B6B] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F3F4F6] file:text-sm file:font-medium file:text-[#0A0A0A] hover:file:bg-[#E5E5E5] cursor-pointer"
            />
            {curriculo && (
              <p className="text-xs text-[#6B6B6B] mt-1">
                {curriculo.name} — {(curriculo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            {curriculoErro && <p className="text-xs text-red-500 mt-1">{curriculoErro}</p>}
          </Field>
        </div>
      )

      case 1: return (
        <div className="flex flex-col gap-6">
          <Field label="O que mais te motiva em vender?" required id="campo-gosta_vender_opcao">
            <CardOpcao value={f.gosta_vender_opcao} onChange={set('gosta_vender_opcao')} options={[
              'Bater e superar metas — adrenalina do resultado',
              'Ver o cliente satisfeito com o que indicou',
              'Construir uma equipe que vende bem junto',
              'Organizar o processo para a equipe vender mais',
            ]} />
            <TAComplementar
              value={f.gosta_vender} onChange={set('gosta_vender')}
              error={err('gosta_vender')} id="campo-gosta_vender"
            />
          </Field>

          <Field label="Qual a maior % de meta que você já atingiu?" hint="Ex: atingi 134% em dezembro de 2024 numa loja de calçados.">
            <Inp value={f.maior_percentual_meta} onChange={set('maior_percentual_meta')} placeholder="Ex: atingi 134% em dezembro de 2024" />
          </Field>

          <Field label="Qual era a meta naquele período?" required hint="Ex: R$ 150k, 200 peças, 120%" id="campo-maior_meta">
            <Inp value={f.maior_meta} onChange={set('maior_meta')} placeholder="Ex: R$ 150k, 200 peças, 120%" />
            {err('maior_meta') && <p className="text-xs text-red-500 mt-1 font-medium">Campo obrigatório (mínimo 3 caracteres)</p>}
          </Field>

          <Field label="Como você age quando sua loja está abaixo da meta?" required id="campo-reacao_abaixo_meta_opcao">
            <CardOpcao value={f.reacao_abaixo_meta_opcao} onChange={set('reacao_abaixo_meta_opcao')} options={[
              'Convoco reunião, revejo números e monto plano de ação imediato',
              'Converso individualmente com cada vendedor para entender o que está travando',
              'Revejo processos, organização da loja e abordagem da equipe',
              'Analiso o mercado, concorrência e ajusto estratégia',
            ]} />
            <TAComplementar
              value={f.reacao_abaixo_meta} onChange={set('reacao_abaixo_meta')}
              error={err('reacao_abaixo_meta')} id="campo-reacao_abaixo_meta"
            />
          </Field>

          <Field label="Qual foi o valor do seu maior resultado?" required hint="Informe em reais. Ex: R$ 190.000,00" id="campo-maior_resultado_valor">
            <input
              type="text"
              inputMode="numeric"
              className={`${cls}${err('maior_resultado_valor') ? ' border-red-400' : ''}`}
              value={f.maior_resultado_valor}
              onChange={e => set('maior_resultado_valor')(formatMoeda(e.target.value))}
              placeholder="R$ 0,00"
            />
            {err('maior_resultado_valor') && <p className="text-xs text-red-500 mt-1 font-medium">Campo obrigatório</p>}
          </Field>

          <Field label="Qual o maior volume em vendas que você gerou em um mês?" required hint="Informe o valor aproximado em R$ e o contexto. Seja concreto." id="campo-maior_resultado">
            <TA value={f.maior_resultado} onChange={set('maior_resultado')} minLen={80}
              error={err('maior_resultado')}
              placeholder="Ex: vendi R$ 180.000 em dezembro trabalhando numa loja de eletrodomésticos" />
          </Field>

          <Field label="O que diferencia quem entrega resultado de quem não entrega?" required id="campo-prejudica_resultado_opcao">
            <CardOpcao value={f.prejudica_resultado_opcao} onChange={set('prejudica_resultado_opcao')} options={[
              'Foco, disciplina e não aceitar desculpas',
              'Motivação da equipe e ambiente saudável',
              'Processos bem definidos e execução consistente',
              'Visão clara do negócio e adaptação rápida',
            ]} />
            <TAComplementar
              value={f.prejudica_resultado} onChange={set('prejudica_resultado')}
              error={err('prejudica_resultado')} id="campo-prejudica_resultado"
            />
          </Field>

          <Field label="Com quais ferramentas comerciais você já trabalhou?">
            <CG value={f.ferramentas_comerciais} onChange={set('ferramentas_comerciais')}
              options={['CRM', 'Planilha de metas', 'WhatsApp Business', 'Sistema de PDV', 'Relatórios de vendas', 'Nenhuma']} />
          </Field>

          <Field label="Qual é o seu maior diferencial como gestor comercial?" required id="campo-diferencial_vendas_opcao">
            <CardOpcao value={f.diferencial_vendas_opcao} onChange={set('diferencial_vendas_opcao')} options={[
              'Extraio o máximo de cada vendedor individualmente',
              'Crio urgência e pressão positiva pelo resultado',
              'Mantenho processos e padrão mesmo sob pressão',
              'Enxergo oportunidades que outros não veem',
            ]} />
            <TAComplementar
              value={f.diferencial_vendas} onChange={set('diferencial_vendas')}
              error={err('diferencial_vendas')} id="campo-diferencial_vendas"
            />
          </Field>
        </div>
      )

      case 2: return (
        <div className="flex flex-col gap-6">
          <Field label="Você já liderou equipes?" required id="campo-ja_liderou">
            <RG value={f.ja_liderou} onChange={set('ja_liderou')} options={['Sim', 'Não']} />
          </Field>

          {f.ja_liderou === 'Sim' && <>
            <Field label="Quantas pessoas você já liderou?">
              <Inp value={f.qtd_liderados} onChange={set('qtd_liderados')} placeholder="Ex: 8 pessoas" />
            </Field>
            <Field label="Quais ações de liderança você já realizou?">
              <CG
                value={f.acoes_lideranca}
                onChange={newVal => {
                  const NENHUMA = 'Nenhuma das anteriores'
                  const prevHad = f.acoes_lideranca.includes(NENHUMA)
                  const newHas = newVal.includes(NENHUMA)
                  if (newHas && !prevHad) {
                    set('acoes_lideranca')([NENHUMA])
                  } else if (newHas && newVal.length > 1) {
                    set('acoes_lideranca')(newVal.filter(v => v !== NENHUMA))
                  } else {
                    set('acoes_lideranca')(newVal)
                  }
                }}
                options={['Demiti funcionário', 'Apliquei advertência', 'Fiz plano de melhoria (PDI)', 'Conduzi reunião de feedback', 'Promovi alguém', 'Treinei novos funcionários', 'Nenhuma das anteriores']}
              />
            </Field>
          </>}

          {f.ja_liderou === 'Não' && (
            <Field label="Por que você acredita estar pronto para liderar mesmo sem experiência formal?" hint="Conte algo concreto que já fez que demonstra liderança.">
              <TA value={f.motivo_lideranca_sem_experiencia} onChange={set('motivo_lideranca_sem_experiencia')} rows={5} />
            </Field>
          )}

          <Field label="Como você age quando um funcionário está com resultado abaixo do esperado?" required hint="Descreva uma situação real — o que você fez, como reagiu, qual foi o resultado." id="campo-reacao_baixo_resultado">
            <TA value={f.reacao_baixo_resultado} onChange={set('reacao_baixo_resultado')} minLen={80}
              error={err('reacao_baixo_resultado')} />
          </Field>

          <Field label="O que separa um gerente forte de um comum?" required id="campo-diferenca_gerente_forte_opcao">
            <CardOpcao value={f.diferenca_gerente_forte_opcao} onChange={set('diferenca_gerente_forte_opcao')} options={[
              'O forte cobra resultado todos os dias sem aceitar justificativa',
              'O forte desenvolve pessoas e cria novos líderes',
              'O forte mantém padrão e processo mesmo sob pressão',
              'O forte pensa além da loja e enxerga o negócio como um todo',
            ]} />
            <TAComplementar
              value={f.diferenca_gerente_forte} onChange={set('diferenca_gerente_forte')}
              error={err('diferenca_gerente_forte')} id="campo-diferenca_gerente_forte"
            />
          </Field>

          <Field label="O que mais prejudica uma equipe?" required id="campo-prejudica_equipe_opcao">
            <CardOpcao value={f.prejudica_equipe_opcao} onChange={set('prejudica_equipe_opcao')} options={[
              'Falta de meta clara e cobrança consistente',
              'Clima ruim, fofoca e falta de reconhecimento',
              'Desorganização e falta de processo definido',
              'Liderança sem visão e sem direção estratégica',
              'Acomodação e tolerância com baixa performance',
            ]} />
            <TAComplementar
              value={f.prejudica_equipe} onChange={set('prejudica_equipe')}
              error={err('prejudica_equipe')} id="campo-prejudica_equipe"
            />
          </Field>
        </div>
      )

      case 3: return (
        <div className="flex flex-col gap-6">
          <Field label="Qual sua principal característica como profissional?" required id="campo-caracteristica_principal_opcao">
            <CardOpcao value={f.caracteristica_principal_opcao} onChange={set('caracteristica_principal_opcao')} options={[
              'Determinação — não paro enquanto não bato a meta',
              'Empatia — entendo e desenvolvo as pessoas ao meu redor',
              'Disciplina — sigo e faço seguir processos sem exceção',
              'Visão — enxergo oportunidades e penso no longo prazo',
            ]} />
            <TAComplementar
              value={f.caracteristica_principal} onChange={set('caracteristica_principal')}
              error={err('caracteristica_principal')} id="campo-caracteristica_principal"
            />
          </Field>

          <Field label="O que mais te incomoda nas pessoas da sua equipe?" required id="campo-incomodo_equipe_opcao">
            <CardOpcao value={f.incomodo_equipe_opcao} onChange={set('incomodo_equipe_opcao')} options={[
              'Não bater meta e não se esforçar para melhorar',
              'Falta de comprometimento com o grupo e clima ruim',
              'Desorganização e não seguir processos definidos',
              'Acomodação e falta de ambição de crescer',
            ]} />
            <TAComplementar
              value={f.incomodo_equipe} onChange={set('incomodo_equipe')}
              error={err('incomodo_equipe')} id="campo-incomodo_equipe"
            />
          </Field>

          <Field label="O que faz você perder a motivação no trabalho?" required id="campo-perde_motivacao_opcao">
            <CardOpcao value={f.perde_motivacao_opcao} onChange={set('perde_motivacao_opcao')} options={[
              'Não ter meta desafiadora ou resultado para buscar',
              'Ambiente tóxico e equipe sem engajamento',
              'Desorganização e falta de processos claros',
              'Estagnação sem crescimento ou novos desafios',
            ]} />
            <TAComplementar
              value={f.perde_motivacao} onChange={set('perde_motivacao')}
              error={err('perde_motivacao')} id="campo-perde_motivacao"
            />
          </Field>

          <Field label="O que significa comprometimento para você?" required id="campo-significado_comprometimento_opcao">
            <CardOpcao value={f.significado_comprometimento_opcao} onChange={set('significado_comprometimento_opcao')} options={[
              'Entregar resultado independente das circunstâncias',
              'Estar presente para a equipe e não deixar ninguém pra trás',
              'Cumprir processos e horários sem precisar ser cobrado',
              'Pensar no crescimento da empresa como se fosse minha',
            ]} />
            <TAComplementar
              value={f.significado_comprometimento} onChange={set('significado_comprometimento')}
              error={err('significado_comprometimento')} id="campo-significado_comprometimento"
            />
          </Field>

          <Field label="Qual a diferença entre ser intenso/competitivo e ser tóxico?" required id="campo-intenso_vs_toxico_opcao">
            <CardOpcao value={f.intenso_vs_toxico_opcao} onChange={set('intenso_vs_toxico_opcao')} options={[
              'Intenso cobra resultado, tóxico humilha quem não entrega',
              'Intenso exige o melhor, tóxico destrói a autoestima da equipe',
              'Intenso mantém padrão alto, tóxico cria caos e insegurança',
              'Intenso eleva o nível de todos, tóxico afasta os melhores talentos',
              'Não sei definir bem essa diferença',
            ]} />
            <TAComplementar
              value={f.intenso_vs_toxico} onChange={set('intenso_vs_toxico')}
              error={err('intenso_vs_toxico')} id="campo-intenso_vs_toxico"
            />
          </Field>

          <Field label="O que você acha que faz um profissional parar de crescer?" required
            hint="Mínimo 30 caracteres." id="campo-para_de_crescer">
            <TA value={f.para_de_crescer} onChange={set('para_de_crescer')} minLen={30}
              error={err('para_de_crescer')} rows={3}
              placeholder="Na sua visão, o que trava o crescimento de alguém na carreira?" />
          </Field>

          <Field label="Que tipo de ambiente de trabalho você prefere?" required
            hint="Mínimo 30 caracteres." id="campo-ambiente_trabalho">
            <TA value={f.ambiente_trabalho} onChange={set('ambiente_trabalho')} minLen={30}
              error={err('ambiente_trabalho')} rows={3}
              placeholder="Descreva o ambiente onde você performa melhor..." />
          </Field>

          <Field label="O que você faz ativamente para evoluir profissionalmente?" hint="Cite ações reais — cursos, leituras, mentorias, práticas do dia a dia.">
            <TA value={f.evolucao_profissional} onChange={set('evolucao_profissional')} />
          </Field>

          <Field label="Qual seu objetivo profissional daqui a 5 anos?" hint="Seja específico. Evite 'quero crescer' — diga onde quer estar e o que quer ter conquistado.">
            <TA value={f.objetivo_5_anos} onChange={set('objetivo_5_anos')} />
          </Field>
        </div>
      )

      case 4: return (
        <div className="flex flex-col gap-6">
          <Field label="Você se sente confortável sendo cobrado diariamente por metas e resultados?">
            <RG value={f.confortavel_cobranca_constante} onChange={set('confortavel_cobranca_constante')}
              options={['Sim', 'Depende da liderança', 'Depende do ambiente', 'Não']} />
          </Field>

          <Field label="Como você se sente sendo cobrado por metas?" required
            hint="Descreva sua relação com cobrança no dia a dia. Mínimo 30 caracteres." id="campo-confortavel_cobranca_meta">
            <TA value={f.confortavel_cobranca_meta} onChange={set('confortavel_cobranca_meta')} minLen={30}
              error={err('confortavel_cobranca_meta')} rows={3}
              placeholder="Fale sobre como você lida com cobrança constante por resultados..." />
          </Field>

          <Field label="Como você vê o acompanhamento diário de meta?" required id="campo-visao_acompanhamento_meta_opcao">
            <CardOpcao value={f.visao_acompanhamento_meta_opcao} onChange={set('visao_acompanhamento_meta_opcao')} options={[
              'Essencial — sem acompanhamento diário a equipe perde o foco',
              'Importante mas precisa ser feito com sensibilidade para não pressionar demais',
              'Necessário e deve seguir um processo padrão todos os dias',
              'Útil mas o foco deve ser na estratégia semanal, não só no dia a dia',
            ]} />
            <TAComplementar
              value={f.visao_acompanhamento_meta} onChange={set('visao_acompanhamento_meta')}
              error={err('visao_acompanhamento_meta')} id="campo-visao_acompanhamento_meta"
            />
          </Field>

          <Field label="Você acredita que o gerente deve participar ativamente das vendas?">
            <RG value={f.gerente_participa_vendas} onChange={set('gerente_participa_vendas')}
              options={['Sim, sempre', 'Depende da situação', 'Não, o papel é só gestão']} />
          </Field>

          <Field label="Como você age em períodos de movimento fraco na loja?" required id="campo-acao_movimento_fraco_opcao">
            <CardOpcao value={f.acao_movimento_fraco_opcao} onChange={set('acao_movimento_fraco_opcao')} options={[
              'Intensifico abordagem ativa — equipe na porta, ligações, remarketing',
              'Uso o tempo para treinar e motivar a equipe',
              'Organizo loja, estoque, processos e visual merchandising',
              'Analiso dados, revejo estratégia e planejo ações para o próximo pico',
            ]} />
            <TAComplementar
              value={f.acao_movimento_fraco} onChange={set('acao_movimento_fraco')}
              error={err('acao_movimento_fraco')} id="campo-acao_movimento_fraco"
            />
          </Field>

          <Field label="Em quais situações operacionais você se sente confortável?">
            <CG value={f.confortavel_operacao} onChange={set('confortavel_operacao')}
              options={['Abrir e fechar loja', 'Operar caixa', 'Fazer reposição', 'Treinar equipe', 'Fazer inventário', 'Atender cliente diretamente']} />
          </Field>

          <Field label="O que te faz permanecer e crescer em uma empresa?" required
            hint="Mínimo 30 caracteres." id="campo-permanencia_empresa">
            <TA value={f.permanencia_empresa} onChange={set('permanencia_empresa')} minLen={30}
              error={err('permanencia_empresa')} rows={3}
              placeholder="O que faz você se comprometer de verdade com um empregador?" />
          </Field>

          <Field label="Com quais ferramentas você já trabalhou?">
            <CG value={f.ferramentas_utilizadas} onChange={set('ferramentas_utilizadas')}
              options={['Excel / Planilhas', 'WhatsApp Business', 'Sistema ERP', 'CRM', 'Power BI / Dashboard', 'Nenhuma']} />
          </Field>
        </div>
      )

      case 5: return (
        <div className="flex flex-col gap-6">
          <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-4 py-3">
            <p className="text-sm text-[#0A0A0A]">
              Responda com base em situações reais que você já viveu ou como agiria de forma concreta.{' '}
              <strong className="font-medium">Evite respostas genéricas</strong> — o gestor quer saber como você pensa e age na prática.
              Preencha pelo menos <strong className="font-medium">3 situações</strong> com no mínimo 80 caracteres cada.
            </p>
          </div>

          <Field label="Case 1 — Sua loja está 20% abaixo da meta e faltam 5 dias para fechar o mês. O que você faz?" hint="Seja específico — cite ações reais, não intenções genéricas.">
            <TA value={f.case_meta_5dias} onChange={set('case_meta_5dias')} rows={5} minLen={80}
              placeholder="Descreva sua estratégia e as ações concretas que você tomaria..." />
          </Field>
          <Field label="Case 2 — Você tem um vendedor que bate meta todo mês, mas gera conflito interno constante. Como você lida?" hint="Descreva sua abordagem passo a passo.">
            <TA value={f.case_vendedor_problema} onChange={set('case_vendedor_problema')} rows={5} minLen={80} />
          </Field>
          <Field label="Case 3 — Sua equipe perdeu energia, está acomodada e o clima está pesado. O que você faz?" hint="O que você faria de concreto? Cite ações reais.">
            <TA value={f.case_equipe_acomodada} onChange={set('case_equipe_acomodada')} rows={5} minLen={80} />
          </Field>
          <Field label="Case 4 — Você tem um funcionário que frequentemente se atrasa, mas é um dos melhores em resultado. Como você age?" hint="Como você equilibraria resultado e disciplina nesse caso?">
            <TA value={f.case_funcionario_atrasado} onChange={set('case_funcionario_atrasado')} rows={5} minLen={80} />
          </Field>
          <Field label="Case 5 — Você assumiu uma loja desorganizada, com equipe desmotivada e abaixo da meta. Quais são suas prioridades nos primeiros 30 dias?" hint="Liste suas prioridades em ordem e justifique cada uma.">
            <TA value={f.case_loja_desorganizada} onChange={set('case_loja_desorganizada')} rows={5} minLen={80} />
          </Field>

          <Field label="Quais seriam suas prioridades nos primeiros 30 dias de uma nova loja?" required
            hint="Mínimo 30 caracteres — seja específico sobre o que você faria primeiro." id="campo-prioridade_30dias">
            <TA value={f.prioridade_30dias} onChange={set('prioridade_30dias')} minLen={30}
              error={err('prioridade_30dias')} rows={3}
              placeholder="Liste suas prioridades reais nos primeiros 30 dias..." />
          </Field>
        </div>
      )

      case 6: return (
        <div className="flex flex-col gap-6">
          <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-4 py-3">
            <p className="text-sm text-[#0A0A0A]">
              Grave um vídeo de até <strong className="font-medium">90 segundos</strong> se apresentando: quem você é,
              sua trajetória e por que quer trabalhar na SELETO. Suba no YouTube ou Google Drive e cole o link abaixo.
            </p>
          </div>
          <Field label="Link do vídeo (YouTube ou Google Drive)" hint="Opcional, mas recomendado">
            <Inp value={f.video_url} onChange={set('video_url')} placeholder="https://youtube.com/... ou drive.google.com/..." />
          </Field>
        </div>
      )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Barra de progresso */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[600px] mx-auto px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-[#6B6B6B]">Etapa 2 de 3</p>
          <p className="text-xs font-medium text-[#0A0A0A]">
            Seção {secao + 2} de 8
          </p>
        </div>
        <div className="h-0.5 bg-[#F3F4F6]">
          <div
            className="h-full bg-[#0A0A0A] transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-[600px] mx-auto px-5 pt-20 pb-32">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#6B6B6B] mb-1">
            Seção {secao + 1} de {totalSecoes}
          </p>
          <h1 className="text-xl font-semibold text-[#0A0A0A] tracking-tight">
            {TITULOS_SECAO[secao]}
          </h1>
        </div>

        {renderSecao()}

        {erros.length > 0 && (
          <div className="mt-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-[#EF4444] mb-1">Corrija os campos abaixo:</p>
            <ul className="list-disc list-inside">
              {erros.map((e, i) => (
                <li key={i} className="text-sm text-[#EF4444]">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {erroEnvio && (
          <div className="mt-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
            <p className="text-sm text-[#EF4444]">{erroEnvio}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {secao > 0 && (
            <button
              onClick={() => { setSecao(s => s - 1); setErros([]); setErrosCampos(new Set()); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex-1 border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] py-3.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              Voltar
            </button>
          )}

          {secao < totalSecoes - 1 ? (
            <button
              onClick={handleContinuar}
              className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-3.5 rounded-lg hover:bg-[#222] transition-colors"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="flex-1 bg-[#0A0A0A] text-white text-sm font-medium py-3.5 rounded-lg hover:bg-[#222] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                'Enviar avaliação'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Estado = 'carregando' | 'boas_vindas' | 'formulario' | 'erro_invalido' | 'erro_usado'

export default function AvaliacaoPage() {
  const { token } = useParams<{ token: string }>()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [nomeCandidato, setNomeCandidato] = useState('')
  const [iniciando, setIniciando] = useState(false)

  useEffect(() => {
    if (!token) { setEstado('erro_invalido'); return }

    fetch(`/api/buscar-candidato-por-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.encontrado) { setEstado('erro_invalido'); return }
        if (data.ja_usado) { setEstado('erro_usado'); return }
        setNomeCandidato(data.nome ?? '')
        setEstado('boas_vindas')
      })
      .catch(() => setEstado('erro_invalido'))
  }, [token])

  async function handleComecar() {
    if (iniciando) return
    setIniciando(true)

    const res = await fetch('/api/iniciar-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) { setIniciando(false); return }

    const { candidato_id } = await res.json()
    sessionStorage.setItem('seleto_candidato_id', candidato_id)
    setEstado('formulario')
  }

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (estado === 'formulario') return <FormularioEtapa2 token={token} />

  if (estado === 'erro_invalido') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="max-w-[400px] w-full text-center py-24">
          <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#0A0A0A] tracking-tight mb-3">Link inválido</h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            Este link de avaliação não existe ou foi removido. Verifique o link recebido e tente novamente.
          </p>
        </div>
      </div>
    )
  }

  if (estado === 'erro_usado') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="max-w-[400px] w-full text-center py-24">
          <div className="w-14 h-14 rounded-full bg-[#FEF3C7] flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="#D97706" strokeWidth="1.5" />
              <path d="M12 8v4m0 4h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#0A0A0A] tracking-tight mb-3">Este link já foi utilizado</h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            A avaliação correspondente a este link já foi iniciada e não pode ser acessada novamente.
          </p>
        </div>
      </div>
    )
  }

  // boas_vindas
  const primeiroNome = nomeCandidato.split(' ')[0]
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="max-w-[480px] w-full text-center py-20">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#6B6B6B] mb-12">SELETO</p>
        <h1 className="text-3xl font-semibold text-[#0A0A0A] tracking-tight mb-4">
          Olá, {primeiroNome || nomeCandidato}
        </h1>
        <p className="text-sm text-[#6B6B6B] leading-relaxed mb-8 max-w-sm mx-auto">
          Você avançou para a <strong className="text-[#0A0A0A] font-medium">Etapa 2</strong> do processo seletivo.
          Esta avaliação abrange perguntas sobre perfil profissional, experiências e fit com a cultura da empresa.
          Reserve cerca de <strong className="text-[#0A0A0A] font-medium">entre 20 e 30 minutos</strong> para respondê-la com calma.
        </p>

        {/* Card de aviso */}
        <div className="text-left bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-[#92400E] mb-1">Antes de começar — leia com atenção</p>
              <p className="text-sm text-[#78350F] leading-relaxed">
                A prova leva entre 20 e 30 minutos. Certifique-se de estar em um lugar tranquilo e com boa conexão antes de iniciar. Se a página fechar, você pode reabrir o link e continuar de onde parou.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleComecar}
          disabled={iniciando}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-[#0A0A0A] text-white text-sm font-medium px-6 py-3.5 rounded-lg hover:bg-[#222] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {iniciando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-spin" />
              Aguarde...
            </>
          ) : 'Começar avaliação'}
        </button>
      </div>
    </div>
  )
}
