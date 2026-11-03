'use client'

import { useState, useEffect, useRef, useId, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
// FASE 3: o cálculo de score do vendedor será reimplementado (mix N/R/E/L + coerência).
// O array de perguntas v3 abaixo já guarda o perfil de cada alternativa para esse cálculo.
import { Loader } from '@googlemaps/js-api-loader'

const UNIDADES = [
  { label: 'Taquara — Rua Bacairis, 248',                    value: 'Taquara' },
  { label: 'Aerotown — Av. Ayrton Senna, 2541',             value: 'Aerotown' },
  { label: 'Américas Shopping — Av. das Américas, 15500',   value: 'Americas' },
  { label: 'Nova Iguaçu — Av. Abílio Augusto Távora, 1111', value: 'Nova Iguaçu' },
]

const inputBase = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#EEE] bg-[#FAFAFA] text-[#0A0A0A] placeholder-[#BBBBBB] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-colors'

function inputCls(value: string) {
  return `${inputBase} ${value ? 'border-[#0A0A0A] bg-white' : ''}`
}


function Field({ label, required, error, info, children }: {
  label: string; required?: boolean; error?: string; info?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="block text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {info && <p className="text-xs text-[#6B6B6B]">{info}</p>}
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} className={inputCls(value)} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-6">
      <div className="h-px flex-1 bg-[#F0F0F0]"/>
      <span className="text-[10px] font-medium text-[#CCCCCC] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[#F0F0F0]"/>
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
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors pointer-events-none
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
  value: string[]; onChange: (v: string[]) => void
  options: ({ label: string; value: string } | string)[]
}) {
  const uid = useId()
  const norm = options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  return (
    <div className="flex flex-col gap-2">
      {norm.map(opt => {
        const id = `${uid}-${opt.value}`
        const checked = value.includes(opt.value)
        return (
          <div key={opt.value} className="flex items-center gap-3">
            <input type="checkbox" id={id} value={opt.value} checked={checked}
              onChange={() => toggle(opt.value)} className="sr-only" />
            <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors pointer-events-none
                ${checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D0D0D0] group-hover:border-[#0A0A0A]'}`}>
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="pointer-events-none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm text-[#0A0A0A]">{opt.label}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ── Utilitários CPF ────────────────────────────────────────────────────────

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(.)\1+$/.test(d)) return false
  const calc = (len: number) => {
    let s = 0
    for (let i = 0; i < len; i++) s += parseInt(d[i]) * (len + 1 - i)
    const r = (s * 10) % 11
    return r === 10 || r === 11 ? 0 : r
  }
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10])
}

const STATUS_PODE_REFAZER = ['EM_ANDAMENTO', 'BANCO_TALENTOS']

// ── Tipos ──────────────────────────────────────────────────────────────────

type E1 = {
  nome: string; cpf: string; idade: string; email: string; whatsapp: string; instagram: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  unidades: string[]; escolaridade: string; turno_faculdade: string; veiculo: string; cnh: string[]
  disponibilidade_horario: string; disponibilidade_mudanca: string; pretensao_salarial: string
  conducoes_ida: string
  conducoes_volta: string
}

type E2 = {
  // Grupo A — cenários de tensão
  tensao_meta_fim_dia: string; reacao_tres_perdas: string
  cliente_vou_pensar: string; dois_clientes_simultaneos: string
  // Grupo B — escolha forçada (2 alternativas)
  elogio_preferido_1: string; elogio_preferido_2: string
  frase_combina_1: string; frase_combina_2: string
  // Grupo C — situações de rotina
  loja_sem_movimento: string; chega_peca_nova: string; inicio_turno: string
  // Grupo D — regras, hierarquia e pressão
  discorda_gerente: string; muitas_regras: string; meta_loja_individual_atras: string
  // Grupo E — histórico (objetivas, não mapeiam perfil)
  tempo_ultimo_emprego: string; tipo_saida: string
  // Grupo F — ambição e futuro
  peso_mudar_trabalho: string; sucesso_futuro: string
}

const emptyE1: E1 = {
  nome: '', cpf: '', idade: '', email: '', whatsapp: '', instagram: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  unidades: [], escolaridade: '', turno_faculdade: '', veiculo: '', cnh: [],
  disponibilidade_horario: '', disponibilidade_mudanca: '', pretensao_salarial: '',
  conducoes_ida: '',
  conducoes_volta: '',
}

const emptyE2: E2 = {
  tensao_meta_fim_dia: '', reacao_tres_perdas: '',
  cliente_vou_pensar: '', dois_clientes_simultaneos: '',
  elogio_preferido_1: '', elogio_preferido_2: '',
  frase_combina_1: '', frase_combina_2: '',
  loja_sem_movimento: '', chega_peca_nova: '', inicio_turno: '',
  discorda_gerente: '', muitas_regras: '', meta_loja_individual_atras: '',
  tempo_ultimo_emprego: '', tipo_saida: '',
  peso_mudar_trabalho: '', sucesso_futuro: '',
}

// ── Perguntas do quiz (VENDEDOR v3) ─────────────────────────────────────────
// Cada alternativa de pergunta "mapeada"/"forcada" carrega o perfil que representa.
// 'mapeada'  = 4 alternativas, peso 1 no mix
// 'forcada'  = 2 alternativas, peso 2 no mix (escolha forçada)
// 'objetiva' = histórico, NÃO entra no mix de perfil

type Perfil = 'N' | 'R' | 'E' | 'L'
type OpcaoMap = { texto: string; perfil: Perfil }
type PerguntaV3 = {
  campo: keyof E2
  texto: string
  grupo: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  tipo: 'mapeada' | 'forcada' | 'objetiva'
  opcoes: OpcaoMap[]      // mapeada / forcada
  objetivas?: string[]    // objetiva
}

const PERGUNTAS_V3: PerguntaV3[] = [
  // ── GRUPO A — cenários de tensão ──
  {
    campo: 'tensao_meta_fim_dia', grupo: 'A', tipo: 'mapeada',
    texto: 'São 20h, a loja fecha em uma hora, você ainda não bateu sua meta do dia e entra um casal indeciso. O que passa pela sua cabeça?',
    opcoes: [
      { texto: '"É agora." Vou com tudo pra esse atendimento, ainda dá tempo de virar o dia', perfil: 'N' },
      { texto: 'Atendo com calma, gente indecisa precisa de confiança, não de pressa', perfil: 'R' },
      { texto: 'Atendo direitinho e, se não fechar, registro o dia como foi', perfil: 'E' },
      { texto: 'Vejo se algum colega livre pode pegar junto e a gente fecha mais rápido', perfil: 'L' },
    ],
  },
  {
    campo: 'reacao_tres_perdas', grupo: 'A', tipo: 'mapeada',
    texto: 'Você perdeu três atendimentos seguidos hoje, nenhum fechou. Como isso te afeta?',
    opcoes: [
      { texto: 'Fico inquieto e parto pro próximo querendo reverter na hora', perfil: 'N' },
      { texto: 'Reflito se fui atencioso o bastante com cada um deles', perfil: 'R' },
      { texto: 'Reviso meu processo pra ver onde dá pra melhorar amanhã', perfil: 'E' },
      { texto: 'Pergunto a um colega como ele faria e troco experiência', perfil: 'L' },
    ],
  },
  {
    campo: 'cliente_vou_pensar', grupo: 'A', tipo: 'mapeada',
    texto: 'Um cliente está quase decidindo, mas diz "vou pensar e volto depois". Você...',
    opcoes: [
      { texto: 'Crio um motivo pra ele decidir hoje — uma condição, um detalhe que ele perde se esperar', perfil: 'N' },
      { texto: 'Respeito o tempo dele e deixo a porta aberta pra quando voltar', perfil: 'R' },
      { texto: 'Anoto o contato e o que ele queria, pra retomar certinho depois', perfil: 'E' },
      { texto: 'Pergunto o que falta pra decidir e tento remover esse último obstáculo', perfil: 'L' },
    ],
  },
  {
    campo: 'dois_clientes_simultaneos', grupo: 'A', tipo: 'mapeada',
    texto: 'Dois clientes chegam ao mesmo tempo e só tem você no salão. Como resolve?',
    opcoes: [
      { texto: 'Sigo a ordem de chegada e peço um instante ao segundo', perfil: 'E' },
      { texto: 'Engato os dois ao mesmo tempo, não quero perder nenhum', perfil: 'N' },
      { texto: 'Acolho os dois com um sorriso e explico que já atendo cada um', perfil: 'R' },
      { texto: 'Chamo reforço pelo rádio/WhatsApp pra ninguém ficar esperando', perfil: 'L' },
    ],
  },
  // ── GRUPO B — escolha forçada (2 alternativas, peso maior) ──
  {
    campo: 'elogio_preferido_1', grupo: 'B', tipo: 'forcada',
    texto: 'Entre estes dois elogios, qual você preferiria ouvir de um cliente?',
    opcoes: [
      { texto: '"Esse aí te convence de qualquer coisa, saí com mais do que vim buscar"', perfil: 'N' },
      { texto: '"Adoro ser atendido por ele, me sinto em casa"', perfil: 'R' },
    ],
  },
  {
    campo: 'elogio_preferido_2', grupo: 'B', tipo: 'forcada',
    texto: 'E entre estes dois?',
    opcoes: [
      { texto: '"Pode confiar nele, é certinho e nunca falha"', perfil: 'E' },
      { texto: '"Quando ele está, a equipe toda rende mais"', perfil: 'L' },
    ],
  },
  {
    campo: 'frase_combina_1', grupo: 'B', tipo: 'forcada',
    texto: 'Qual frase mais combina com você?',
    opcoes: [
      { texto: '"Não sossego enquanto não dou um jeito de fechar"', perfil: 'N' },
      { texto: '"Gosto de fazer bem feito, no capricho, do começo ao fim"', perfil: 'E' },
    ],
  },
  {
    campo: 'frase_combina_2', grupo: 'B', tipo: 'forcada',
    texto: 'E qual destas?',
    opcoes: [
      { texto: '"Me importo de verdade com quem está na minha frente"', perfil: 'R' },
      { texto: '"Penso no resultado do grupo, não só no meu"', perfil: 'L' },
    ],
  },
  // ── GRUPO C — situações de rotina ──
  {
    campo: 'loja_sem_movimento', grupo: 'C', tipo: 'mapeada',
    texto: 'A loja está sem movimento há uma hora. Você...',
    opcoes: [
      { texto: 'Deixo o ambiente impecável e tudo pronto pra quando chegar gente', perfil: 'E' },
      { texto: 'Chamo conhecidos e clientes antigos pra dar uma passada hoje', perfil: 'N' },
      { texto: 'Mando mensagem pra quem já comprou comigo, mantendo o laço', perfil: 'R' },
      { texto: 'Proponho ao pessoal uma ideia rápida pra movimentar o dia', perfil: 'L' },
    ],
  },
  {
    campo: 'chega_peca_nova', grupo: 'C', tipo: 'mapeada',
    texto: 'Chega uma peça nova na loja. Qual seu primeiro impulso?',
    opcoes: [
      { texto: 'Já penso em quem da minha lista de clientes ia querer aquilo', perfil: 'N' },
      { texto: 'Imagino o quanto certos clientes vão gostar quando virem', perfil: 'R' },
      { texto: 'Confiro a grade, o preço e deixo exposto do jeito certo', perfil: 'E' },
      { texto: 'Aviso o time e mostro como apresentar pro cliente', perfil: 'L' },
    ],
  },
  {
    campo: 'inicio_turno', grupo: 'C', tipo: 'mapeada',
    texto: 'Como você prefere começar seu turno?',
    opcoes: [
      { texto: 'Conferindo se está tudo em ordem antes de abrir', perfil: 'E' },
      { texto: 'Já de olho em quem entra, pronto pra ação', perfil: 'N' },
      { texto: 'Alinhando rapidinho com o pessoal como vai ser o dia', perfil: 'L' },
      { texto: 'Recebendo bem quem chega, criando um clima agradável', perfil: 'R' },
    ],
  },
  // ── GRUPO D — regras, hierarquia e pressão ──
  {
    campo: 'discorda_gerente', grupo: 'D', tipo: 'mapeada',
    texto: 'Seu gerente decide algo que você acha que não é o melhor caminho. Você...',
    opcoes: [
      { texto: 'Acato, ele enxerga coisas que eu não vejo da minha posição', perfil: 'E' },
      { texto: 'Acato na hora e depois procuro ele pra entender melhor o porquê', perfil: 'L' },
      { texto: 'Faço como pediu e, se eu tiver outro jeito, mostro funcionando na prática', perfil: 'N' },
      { texto: 'Vou junto, prefiro não criar atrito por causa disso', perfil: 'R' },
    ],
  },
  {
    campo: 'muitas_regras', grupo: 'D', tipo: 'mapeada',
    texto: 'A empresa tem muitas regras e procedimentos. Pra você, isso é...',
    opcoes: [
      { texto: 'Necessário — dá segurança saber como tudo deve ser feito', perfil: 'E' },
      { texto: 'Tranquilo, principalmente quando facilitam o meu dia a dia com o cliente', perfil: 'N' },
      { texto: 'Bom pra todos, e gosto de ajudar quem ainda está se acostumando', perfil: 'L' },
      { texto: 'Me acostumo fácil, o que conta é o convívio funcionar', perfil: 'R' },
    ],
  },
  {
    campo: 'meta_loja_individual_atras', grupo: 'D', tipo: 'mapeada',
    texto: 'Bateu a meta da loja, mas a sua individual ficou pra trás. Como se sente?',
    opcoes: [
      { texto: 'Realizado, o que importa é o resultado de todos', perfil: 'L' },
      { texto: 'Incomodado, queria ter contribuído com a minha parte cheia', perfil: 'N' },
      { texto: 'Tranquilo, fiz meu melhor com cada cliente', perfil: 'R' },
      { texto: 'Ok, desde que eu tenha feito tudo certo no meu trabalho', perfil: 'E' },
    ],
  },
  // ── GRUPO E — histórico (objetivas, não mapeiam perfil) ──
  {
    campo: 'tempo_ultimo_emprego', grupo: 'E', tipo: 'objetiva',
    texto: 'Quanto tempo você ficou no seu último emprego?',
    opcoes: [],
    objetivas: ['Mais de 2 anos', '1 a 2 anos', '6 meses a 1 ano', '3 a 6 meses', 'Menos de 3 meses', 'Primeiro emprego'],
  },
  {
    campo: 'tipo_saida', grupo: 'E', tipo: 'objetiva',
    texto: 'Como foi sua saída?',
    opcoes: [],
    objetivas: ['Cumpri aviso prévio', 'Saí de comum acordo', 'Ainda estou empregado', 'Primeiro emprego', 'Saí sem avisar'],
  },
  // ── GRUPO F — ambição e futuro ──
  {
    campo: 'peso_mudar_trabalho', grupo: 'F', tipo: 'mapeada',
    texto: 'O que mais pesa quando você pensa em mudar de trabalho?',
    opcoes: [
      { texto: 'Um lugar que reconheça e recompense quem entrega mais', perfil: 'N' },
      { texto: 'Espaço pra evoluir e um dia coordenar outras pessoas', perfil: 'L' },
      { texto: 'Um ambiente onde eu me sinta bem e bem tratado', perfil: 'R' },
      { texto: 'Estrutura sólida, previsibilidade e organização', perfil: 'E' },
    ],
  },
  {
    campo: 'sucesso_futuro', grupo: 'F', tipo: 'mapeada',
    texto: 'Daqui a alguns anos, o que seria sucesso pra você?',
    opcoes: [
      { texto: 'Estar à frente de uma equipe', perfil: 'L' },
      { texto: 'Ser o nome que todo mundo lembra como o maior da loja', perfil: 'N' },
      { texto: 'Ter clientes que voltam só por minha causa', perfil: 'R' },
      { texto: 'Ser aquela pessoa em quem todos confiam pra segurar a operação', perfil: 'E' },
    ],
  },
]

// Pares de validação cruzada — usados no cálculo de COERÊNCIA (Fase 3).
// Cada par/trio mede se o candidato mantém o mesmo eixo de perfil.
const PARES_COERENCIA: { campos: (keyof E2)[]; descricao: string }[] = [
  { campos: ['tensao_meta_fim_dia', 'meta_loja_individual_atras'], descricao: 'P1↔P14 — pressão sozinho vs meta individual' },
  { campos: ['cliente_vou_pensar', 'frase_combina_1'], descricao: 'P3↔P7 — fechar hoje vs não sossegar até fechar' },
  { campos: ['reacao_tres_perdas', 'loja_sem_movimento'], descricao: 'P2↔P9 — frustração vs tempo ocioso' },
  { campos: ['elogio_preferido_1', 'peso_mudar_trabalho', 'sucesso_futuro'], descricao: 'P5↔P17↔P18 — eixo reconhecimento/recompensa' },
  { campos: ['chega_peca_nova', 'inicio_turno'], descricao: 'P10↔P11 — proatividade real vs declarada' },
]

const PESO_GRUPO: Record<PerguntaV3['tipo'], number> = { mapeada: 1, forcada: 2, objetiva: 0 }

// Perfil que uma resposta (texto) representou, a partir do array canônico (não embaralhado).
function perfilDaResposta(campo: keyof E2, valor: string): Perfil | null {
  const p = PERGUNTAS_V3.find(q => q.campo === campo)
  if (!p || p.tipo === 'objetiva') return null
  return p.opcoes.find(o => o.texto === valor)?.perfil ?? null
}

// PRNG determinístico (mulberry32) — embaralhamento estável por candidato dado um seed.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffleComRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
// Embaralha a ordem das perguntas (mesclando grupos) e as alternativas de cada uma.
// Objetivas (histórico) mantêm a ordem natural — não faz sentido embaralhar opções ordinais.
function embaralharQuiz(perguntas: PerguntaV3[], seed: number): PerguntaV3[] {
  const rng = mulberry32(seed)
  const ordem = shuffleComRng(perguntas, rng)
  return ordem.map(p => ({
    ...p,
    opcoes: p.tipo === 'objetiva' ? p.opcoes : shuffleComRng(p.opcoes, rng),
  }))
}

const TOTAL = PERGUNTAS_V3.length

// ── Componente principal ───────────────────────────────────────────────────

export default function CandidaturaVendedorPage() {
  const router = useRouter()
  const supabase = createClient()

  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [e1, setE1] = useState<E1>(emptyE1)
  const [e2, setE2] = useState<E2>(emptyE2)
  const [perguntaIdx, setPerguntaIdx] = useState(0)

  // Embaralhamento por candidato: seed gerado uma vez por sessão do formulário.
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0xFFFFFFFF))
  const perguntasQuiz = useMemo(() => embaralharQuiz(PERGUNTAS_V3, shuffleSeed), [shuffleSeed])

  const [errorsE1, setErrorsE1] = useState<Record<string, string>>({})
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null)
  const [perguntaError, setPerguntaError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fase, setFase] = useState<'idle' | 'loading'>('idle')
  const [candidatoId, setCandidatoId] = useState('')
  const [existingCandidatoId, setExistingCandidatoId] = useState('')

  const fotoRef = useRef<HTMLInputElement>(null)
  const enderecoContainerRef = useRef<HTMLDivElement>(null)
  const [cepData, setCepData] = useState<{ logradouro: string; bairro: string; localidade: string; uf: string } | null>(null)

  async function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    setE1(prev => ({ ...prev, cep: digits }))
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setCepData({ logradouro: data.logradouro ?? '', bairro: data.bairro ?? '', localidade: data.localidade ?? '', uf: data.uf ?? '' })
          const base = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean).join(', ')
          setE1(prev => ({ ...prev, endereco: base }))
        }
      } catch {}
    } else {
      setCepData(null)
    }
  }

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
    })
    loader.load().then(async (google) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PlaceAutocompleteElement } = await google.maps.importLibrary('places') as any
      const container = enderecoContainerRef.current
      if (!container) return
      container.innerHTML = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const placeAutoComplete: any = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'br' },
      })
      placeAutoComplete.style.cssText = 'width: 100%; display: block;'
      container.appendChild(placeAutoComplete)
      placeAutoComplete.addEventListener('gmp-placeselect', async (e: any) => {
        const place = e.placePrediction.toPlace()
        await place.fetchFields({ fields: ['formattedAddress'] })
        const addr = place.formattedAddress || ''
        setE1(prev => ({ ...prev, endereco: addr }))
      })

      placeAutoComplete.addEventListener('input', (e: any) => {
        const val = e.target?.value || placeAutoComplete.value || ''
        setE1(prev => ({ ...prev, endereco: val }))
      })

      console.log('Places API carregada com sucesso')
    }).catch(err => console.error('Erro Places API:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling logística após submit
  useEffect(() => {
    if (fase !== 'loading' || !candidatoId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status-logistica?id=${candidatoId}`)
        const data = await res.json()
        if (data.analisado) {
          clearInterval(interval)
          if (data.aprovado) {
            router.push(`/obrigado?id=${candidatoId}`)
          } else {
            router.push(`/obrigado?id=${candidatoId}&tipo=logistica_reprovado`)
          }
        }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [fase, candidatoId, router])

  const handleFotoChange = useCallback((file: File) => {
    setFotoPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    setFotoFile(file)
  }, [])

  // ── Validação Etapa 1 ──────────────────────────────────────────────────

  function validarE1(): Record<string, string> {
    const err: Record<string, string> = {}
    if (!e1.nome.trim()) err.nome = 'Campo obrigatório'
    if (!e1.cpf.trim()) err.cpf = 'Campo obrigatório'
    else if (!validarCPF(e1.cpf)) err.cpf = 'CPF inválido'
    if (!e1.idade.trim()) err.idade = 'Campo obrigatório'
    else if (Number(e1.idade) < 18) err.idade = 'Idade mínima: 18 anos'
    if (!e1.whatsapp.trim()) err.whatsapp = 'Campo obrigatório'
    if (e1.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e1.email.trim())) err.email = 'E-mail inválido'
    if (!fotoFile) err.foto = 'Envie uma foto de rosto'
    if (!e1.endereco.trim()) err.endereco = 'Campo obrigatório'
    if (cepData && !e1.numero.trim()) err.numero = 'Informe o número'
    if (e1.unidades.length === 0) err.unidades = 'Selecione ao menos uma unidade'
    if (!e1.escolaridade) err.escolaridade = 'Campo obrigatório'
    if (e1.escolaridade === 'Faculdade em andamento' && !e1.turno_faculdade) err.turno_faculdade = 'Campo obrigatório'
    if (!e1.veiculo) err.veiculo = 'Campo obrigatório'
    if (e1.veiculo !== 'Não possuo' && e1.cnh.length === 0) err.cnh = 'Selecione ao menos uma opção'
    if (!e1.disponibilidade_horario) err.disponibilidade_horario = 'Campo obrigatório'
    if (!e1.disponibilidade_mudanca) err.disponibilidade_mudanca = 'Campo obrigatório'
    if (!e1.pretensao_salarial.trim()) err.pretensao_salarial = 'Campo obrigatório'
    if (!e1.conducoes_ida || parseInt(e1.conducoes_ida) < 1) err.conducoes_ida = 'Informe pelo menos 1 condução'
    if (!e1.conducoes_volta || parseInt(e1.conducoes_volta) < 1) err.conducoes_volta = 'Informe pelo menos 1 condução'
    return err
  }

  async function handleContinuar() {
    const errs = validarE1()
    if (Object.keys(errs).length > 0) {
      setErrorsE1(errs)
      const firstKey = Object.keys(errs)[0]
      document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErrorsE1({})

    try {
      const cpfRes = await fetch(`/api/verificar-cpf?cpf=${encodeURIComponent(e1.cpf.replace(/\D/g, ''))}&cargo=vendedor`)
      const cpfData = await cpfRes.json()
      if (cpfData.existe) {
        if (!STATUS_PODE_REFAZER.includes(cpfData.status)) {
          setErrorsE1({ cpf: 'Você já participou de um processo seletivo com este CPF e ele foi encerrado. Não é possível se candidatar novamente.' })
          document.getElementById('cpf')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        setExistingCandidatoId(cpfData.id)
      } else if (cpfData.expirado_id) {
        // CPF expirado — reutiliza o registro preservando o histórico
        setExistingCandidatoId(cpfData.expirado_id)
      }
    } catch {}

    if (e1.escolaridade === 'Ensino Médio Incompleto') {
      setEnviando(true)
      try {
        let foto_url: string | undefined
        if (fotoFile) {
          const ext = fotoFile.name.split('.').pop() ?? 'jpg'
          const path = `${crypto.randomUUID()}-foto.${ext}`
          const { error: fotoErr } = await supabase.storage.from('fotos').upload(path, fotoFile)
          if (!fotoErr) {
            const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
            foto_url = publicUrl
          }
        }
        const id = crypto.randomUUID()
        await supabase.from('candidatos').insert({
          id,
          cargo: 'vendedor',
          status: 'REPROVADO',
          motivo_reprovacao: 'Escolaridade abaixo do requisito mínimo',
          etapa_atual: 1,
          nome: e1.nome,
          cpf: e1.cpf.replace(/\D/g, ''),
          idade: e1.idade || undefined,
          email: e1.email || undefined,
          whatsapp: e1.whatsapp || undefined,
          instagram: e1.instagram || undefined,
          cep: e1.cep || undefined,
          endereco: (e1.endereco + (e1.numero ? ', ' + e1.numero : '') + (e1.complemento ? ' - ' + e1.complemento : '')) || undefined,
          unidades: e1.unidades,
          escolaridade: e1.escolaridade,
          veiculo: e1.veiculo || undefined,
          cnh: e1.cnh,
          disponibilidade_horario: e1.disponibilidade_horario || undefined,
          disponibilidade_mudanca: e1.disponibilidade_mudanca || undefined,
          pretensao_salarial: e1.pretensao_salarial || undefined,
          conducoes_ida: e1.conducoes_ida,
          conducoes_volta: e1.conducoes_volta,
          foto_url,
        })
        router.push(`/obrigado?id=${id}&tipo=logistica_reprovado`)
      } catch {
        setEnviando(false)
      }
      return
    }

    setMostrarAviso(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Navegação quiz ─────────────────────────────────────────────────────

  function resposta(campo: keyof E2): string { return e2[campo] as string }

  function proximaPergunta() {
    const p = perguntasQuiz[perguntaIdx]
    const val = resposta(p.campo)

    if (!val.trim()) { setPerguntaError('Responda antes de continuar.'); return }
    setPerguntaError('')

    if (perguntaIdx < TOTAL - 1) {
      setPerguntaIdx(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleSubmit()
    }
  }

  function perguntaAnterior() {
    setPerguntaError('')
    if (perguntaIdx > 0) {
      setPerguntaIdx(i => i - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function setResposta(campo: keyof E2, val: string) {
    setE2(prev => ({ ...prev, [campo]: val }))
    setPerguntaError('')
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    // Todas as perguntas exigem resposta (validadas no avanço). Garante que nenhuma ficou vazia.
    const faltando = PERGUNTAS_V3.find(q => !(e2[q.campo] as string).trim())
    if (faltando) {
      setPerguntaError('Responda todas as perguntas antes de enviar.')
      return
    }
    setEnviando(true)
    setSubmitError('')

    try {
      // Upload foto
      let foto_url: string | undefined
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop() ?? 'jpg'
        const path = `${crypto.randomUUID()}-foto.${ext}`
        const { error: fotoErr } = await supabase.storage.from('fotos').upload(path, fotoFile)
        if (!fotoErr) {
          const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
          foto_url = publicUrl
        }
      }

      // ── Monta respostas + perfil de cada uma + mix de perfis (peso: forçada=2, mapeada=1) ──
      const respostasQuiz: Record<string, { resposta: string; perfil: Perfil | null; grupo: string; peso: number }> = {}
      const mixContagem: Record<Perfil, number> = { N: 0, R: 0, E: 0, L: 0 }
      let totalPeso = 0
      for (const q of PERGUNTAS_V3) {
        const valor = (e2[q.campo] as string) || ''
        const perfil = perfilDaResposta(q.campo, valor)
        const peso = PESO_GRUPO[q.tipo]
        respostasQuiz[q.campo] = { resposta: valor, perfil, grupo: q.grupo, peso }
        if (perfil && peso > 0) { mixContagem[perfil] += peso; totalPeso += peso }
      }
      const mixPct: Record<Perfil, number> = {
        N: totalPeso ? Math.round((mixContagem.N / totalPeso) * 1000) / 10 : 0,
        R: totalPeso ? Math.round((mixContagem.R / totalPeso) * 1000) / 10 : 0,
        E: totalPeso ? Math.round((mixContagem.E / totalPeso) * 1000) / 10 : 0,
        L: totalPeso ? Math.round((mixContagem.L / totalPeso) * 1000) / 10 : 0,
      }
      const quizData = {
        versao: 'v3',
        seed: shuffleSeed,
        respostas: respostasQuiz,
        objetivas: { tempo_ultimo_emprego: e2.tempo_ultimo_emprego, tipo_saida: e2.tipo_saida },
        mix_contagem: mixContagem,
        mix_pct: mixPct,
        // score/coerência ficam para a FASE 3 (precisam dos pares de validação cruzada).
      }

      const camposComuns = {
        cargo:                    'vendedor',
        status:                   'EM_ANDAMENTO',
        etapa_atual:              1,
        nome:                     e1.nome,
        cpf:                      e1.cpf.replace(/\D/g, ''),
        idade:                    e1.idade || undefined,
        email:                    e1.email || undefined,
        whatsapp:                 e1.whatsapp || undefined,
        instagram:                e1.instagram || undefined,
        cep:                      e1.cep || undefined,
        endereco:                 (e1.endereco + (e1.numero ? ', ' + e1.numero : '') + (e1.complemento ? ' - ' + e1.complemento : '')) || undefined,
        unidades:                 e1.unidades,
        escolaridade:             e1.escolaridade || undefined,
        turno_faculdade:          e1.turno_faculdade || undefined,
        veiculo:                  e1.veiculo || undefined,
        cnh:                      e1.cnh,
        disponibilidade_horario:  e1.disponibilidade_horario || undefined,
        disponibilidade_mudanca:  e1.disponibilidade_mudanca || undefined,
        pretensao_salarial:       e1.pretensao_salarial || undefined,
        conducoes_ida:            e1.conducoes_ida,
        conducoes_volta:          e1.conducoes_volta,
        foto_url,
        // Quiz v3: todas as respostas + perfil + mix num único campo JSONB.
        quiz_vendedor_v3:         quizData,
        // Histórico em coluna própria (compat com filtros/relatórios existentes).
        tempo_ultimo_emprego:     e2.tempo_ultimo_emprego || undefined,
      }

      let id: string
      if (existingCandidatoId) {
        id = existingCandidatoId
        await fetch('/api/atualizar-etapa1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: id, ...camposComuns }),
        })
      } else {
        id = crypto.randomUUID()
        const { error: insErr } = await supabase.from('candidatos').insert({ id, ...camposComuns })
        if (insErr) throw new Error(`[${insErr.code}] ${insErr.message}`)
      }

      // FASE 3: o cálculo de score (55% Nato + 20% Equilíbrio + 25% Coerência) será feito
      // server-side em /api/salvar-score-vendedor, a partir de quiz_vendedor_v3.
      // Nesta fase (estrutura) gravamos as respostas + mix; o score é recalculado depois.
      fetch('/api/salvar-score-vendedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidato_id: id }),
      }).catch(() => {})

      fetch('/api/analisar-logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidato_id: id }),
      }).catch(() => {})

      setCandidatoId(id)
      setFase('loading')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : JSON.stringify(err))
      setEnviando(false)
    }
  }

  // ── Loading — aguardando análise logística ─────────────────────────────

  if (fase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin mx-auto mb-6" />
          <p className="text-sm text-[#6B6B6B]">Analisando seu perfil...</p>
        </div>
      </div>
    )
  }

  // ── AVISO — Antes de começar ───────────────────────────────────────────

  if (mostrarAviso) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-[6px] flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-[#0A0A0A] uppercase leading-none">SELETO</p>
              <p className="text-[10px] text-[#AAAAAA] leading-none mt-0.5">Recrutamento & Seleção</p>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="max-w-[400px] w-full text-center">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0A0A0A] mb-3">Antes de começar</h2>
            <p className="text-sm text-[#888] leading-relaxed mb-8">
              A seguir você responderá 18 perguntas sobre seu perfil profissional. Reserve entre 10 e 12 minutos para concluir sem interrupções. As respostas não podem ser salvas pela metade.
            </p>
            <button
              onClick={() => {
                setMostrarAviso(false)
                setEtapa(2)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="w-full py-3.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-[10px] hover:bg-[#333] transition-colors"
            >
              Estou pronto, começar
            </button>
          </div>
        </div>
        <footer className="py-6 text-center">
          <p className="text-[11px] text-[#CCCCCC]">Seleto · Est. 2020 · Rio de Janeiro</p>
        </footer>
      </div>
    )
  }

  // ── ETAPA 1 — Dados pessoais ───────────────────────────────────────────

  if (etapa === 1) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-[6px] flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-[#0A0A0A] uppercase leading-none">SELETO</p>
              <p className="text-[10px] text-[#AAAAAA] leading-none mt-0.5">Recrutamento & Seleção</p>
            </div>
          </div>
        </nav>

        <div className="flex-1 max-w-[480px] mx-auto w-full px-5 pb-16">
          <p className="text-[11px] text-[#BBB] mb-4">Candidatura › Vendedor › Dados pessoais</p>

          <div className="flex gap-1 mb-6">
            {[0, 1].map(i => (
              <div key={i} className={`h-[2px] flex-1 rounded-full ${i === 0 ? 'bg-[#0A0A0A]' : 'bg-[#EEEEEE]'}`} />
            ))}
          </div>

          <h1 className="text-xl font-semibold text-[#0A0A0A] mt-6 mb-6">Suas informações pessoais.</h1>

          <div className="flex flex-col gap-5">
            {/* Foto */}
            <Field label="Foto de rosto" required error={errorsE1.foto}>
              <p className="text-xs text-[#6B6B6B] mb-3">
                Envie uma foto de rosto recente. Isso nos ajuda a identificar você durante o processo seletivo.
              </p>
              <div className="flex items-center gap-4">
                {fotoPreviewUrl ? (
                  <img src={fotoPreviewUrl} alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border border-[#E5E5E5] shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#B0B0B0]">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <div>
                  <button type="button" onClick={() => fotoRef.current?.click()}
                    className="text-sm font-medium text-[#0A0A0A] border border-[#E5E5E5] rounded-lg px-4 py-2 hover:border-[#0A0A0A] transition-colors">
                    {fotoPreviewUrl ? 'Trocar foto' : 'Selecionar foto'}
                  </button>
                  <p className="text-xs text-[#B0B0B0] mt-1.5">JPEG, PNG ou WEBP — máx 5MB</p>
                </div>
              </div>
              <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) { alert('A foto deve ter no máximo 5MB.'); return }
                  handleFotoChange(file)
                }} />
            </Field>

            <SectionDivider label="Identificação" />

            <div id="nome">
              <Field label="Nome completo" required error={errorsE1.nome}>
                <Inp value={e1.nome} onChange={v => setE1(p => ({ ...p, nome: v }))} placeholder="Seu nome completo" />
              </Field>
            </div>
            <div id="cpf">
              <Field label="CPF" required error={errorsE1.cpf}>
                <Inp value={e1.cpf} onChange={v => setE1(p => ({ ...p, cpf: maskCPF(v) }))} placeholder="000.000.000-00" />
              </Field>
            </div>
            <div id="idade">
              <Field label="Idade" required error={errorsE1.idade}>
                <Inp value={e1.idade} onChange={v => setE1(p => ({ ...p, idade: v }))} placeholder="Ex: 22" />
              </Field>
            </div>

            <SectionDivider label="Contato" />

            <div id="whatsapp">
              <Field label="Telefone com WhatsApp" required error={errorsE1.whatsapp}>
                <Inp value={e1.whatsapp} onChange={v => setE1(p => ({ ...p, whatsapp: v }))} placeholder="(21) 99999-9999" />
              </Field>
            </div>
            <div id="email">
              <Field label="E-mail" error={errorsE1.email}>
                <Inp type="email" value={e1.email} onChange={v => setE1(p => ({ ...p, email: v }))} placeholder="seu@email.com" />
                <p className="text-xs text-[#6B6B6B] mt-1">Opcional</p>
              </Field>
            </div>
            <div id="instagram">
              <Field label="Instagram" error={errorsE1.instagram}>
                <Inp value={e1.instagram} onChange={v => setE1(p => ({ ...p, instagram: v }))} placeholder="@seuperfil ou link completo" />
                <p className="text-xs text-[#6B6B6B] mt-1">Opcional</p>
              </Field>
            </div>

            <SectionDivider label="Localização" />

            <Field label="CEP" required error={errorsE1.cep}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                className={inputCls(e1.cep)}
                value={e1.cep.replace(/(\d{5})(\d{1,3})/, '$1-$2')}
                onChange={e => handleCepChange(e.target.value)}
                placeholder="00000-000"
              />
            </Field>

            <div id="endereco">
              <Field label="Endereço" required error={errorsE1.endereco}>
                {cepData ? (
                  <p className="px-3.5 py-2.5 text-sm rounded-lg border border-[#EEE] bg-[#F3F3F3] text-[#0A0A0A]">
                    {e1.endereco}
                  </p>
                ) : (
                  <div ref={enderecoContainerRef} className="w-full min-h-[42px]" />
                )}
                {!cepData && (
                  <p className="text-xs text-[#6B6B6B] mt-1">
                    Digite seu bairro e cidade com precisão — ex: Recreio, Rio de Janeiro. Essa informação é fundamental para calcularmos seu deslocamento até as lojas.
                  </p>
                )}
              </Field>
            </div>
            {cepData && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Número" required error={errorsE1.numero}>
                  <Inp value={e1.numero} onChange={v => setE1(prev => ({ ...prev, numero: v }))} placeholder="Ex: 123" />
                </Field>
                <Field label="Complemento (opcional)">
                  <Inp value={e1.complemento} onChange={v => setE1(prev => ({ ...prev, complemento: v }))} placeholder="Ex: apto 2" />
                </Field>
              </div>
            )}
            {/* Conduções */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Conduções na ida" required error={errorsE1.conducoes_ida}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inputCls(e1.conducoes_ida)}
                  value={e1.conducoes_ida}
                  onChange={e => setE1(prev => ({ ...prev, conducoes_ida: e.target.value }))}
                  placeholder="Ex: 1"
                />
              </Field>
              <Field label="Conduções na volta" required error={errorsE1.conducoes_volta}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inputCls(e1.conducoes_volta)}
                  value={e1.conducoes_volta}
                  onChange={e => setE1(prev => ({ ...prev, conducoes_volta: e.target.value }))}
                  placeholder="Ex: 1"
                />
              </Field>
            </div>
            <p className="text-xs text-[#6B6B6B] -mt-3">Informe quantos ônibus, metrôs ou trens você precisa pegar em cada trajeto. Se for direto, coloque 1.</p>

            <div id="unidades">
              <Field label="Qual unidade seria mais viável para você trabalhar?" required error={errorsE1.unidades}>
                <p className="text-sm text-gray-500 italic -mt-0.5 mb-2">
                  Marque todas as unidades que considera viável para trabalhar. Analisaremos o deslocamento para cada uma.
                </p>
                <CG value={e1.unidades} onChange={v => setE1(p => ({ ...p, unidades: v }))} options={UNIDADES} />
              </Field>
            </div>

            <SectionDivider label="Formação & Veículo" />

            <div id="escolaridade">
              <Field label="Escolaridade" required error={errorsE1.escolaridade}>
                <select
                  value={e1.escolaridade}
                  onChange={e => setE1(p => ({ ...p, escolaridade: e.target.value }))}
                  className={`${inputCls(e1.escolaridade)} appearance-none`}
                >
                  <option value="">Selecione...</option>
                  <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                  <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                  <option value="Faculdade em andamento">Faculdade em andamento</option>
                  <option value="Faculdade completa">Faculdade completa</option>
                  <option value="Pós/MBA">Pós/MBA</option>
                </select>
              </Field>
            </div>
            {e1.escolaridade === 'Faculdade em andamento' && (
              <div id="turno_faculdade">
                <Field label="Qual o turno da sua faculdade?" required error={errorsE1.turno_faculdade}>
                  <RG value={e1.turno_faculdade} onChange={v => setE1(p => ({ ...p, turno_faculdade: v }))}
                    options={['Manhã', 'Tarde', 'Noite', 'EAD / Semipresencial']} />
                </Field>
              </div>
            )}
            <div id="veiculo">
              <Field label="Possui veículo próprio?" required error={errorsE1.veiculo}>
                <RG value={e1.veiculo} onChange={v => setE1(p => ({ ...p, veiculo: v, cnh: [] }))}
                  options={['Carro', 'Moto', 'Não possuo']} />
              </Field>
            </div>
            {e1.veiculo && e1.veiculo !== 'Não possuo' && (
              <div id="cnh">
                <Field label="CNH — qual categoria?" required error={errorsE1.cnh}>
                  <CG
                    value={e1.cnh}
                    onChange={val => {
                      const hadNao = e1.cnh.includes('Não possuo CNH')
                      const hasNao = val.includes('Não possuo CNH')
                      if (!hadNao && hasNao) setE1(p => ({ ...p, cnh: ['Não possuo CNH'] }))
                      else setE1(p => ({ ...p, cnh: val.filter(x => x !== 'Não possuo CNH') }))
                    }}
                    options={
                      e1.cnh.includes('Não possuo CNH')
                        ? [{ label: 'Não possuo CNH', value: 'Não possuo CNH' }]
                        : [
                            { label: 'Não possuo CNH', value: 'Não possuo CNH' },
                            { label: 'A', value: 'A' }, { label: 'B', value: 'B' },
                            { label: 'C', value: 'C' }, { label: 'D', value: 'D' },
                          ]
                    }
                  />
                </Field>
              </div>
            )}

            <SectionDivider label="Disponibilidade" />

            <div id="disponibilidade_horario">
              <Field label="Disponibilidade de horário?" required error={errorsE1.disponibilidade_horario}>
                <RG value={e1.disponibilidade_horario}
                  onChange={v => setE1(p => ({ ...p, disponibilidade_horario: v }))}
                  options={['Total', 'Manhã/tarde', 'Tarde/noite']} />
              </Field>
            </div>
            <div id="disponibilidade_mudanca">
              <Field label="Disponibilidade para mudança de unidade?" required error={errorsE1.disponibilidade_mudanca}>
                <RG value={e1.disponibilidade_mudanca}
                  onChange={v => setE1(p => ({ ...p, disponibilidade_mudanca: v }))}
                  options={['Sim', 'Não']} />
              </Field>
            </div>

            <SectionDivider label="Remuneração" />

            <div id="pretensao_salarial">
              <Field label="Remuneração total que você busca hoje" required error={errorsE1.pretensao_salarial}>
                <Inp value={e1.pretensao_salarial}
                  onChange={v => setE1(p => ({ ...p, pretensao_salarial: v }))}
                  placeholder="Ex: R$ 1.800 a R$ 2.200" />
              </Field>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleContinuar}
              className="bg-[#0A0A0A] text-white rounded-[10px] w-full py-3.5 text-sm font-medium hover:bg-[#333] transition-colors"
            >
              Continuar →
            </button>
          </div>
        </div>

        <footer className="py-6 text-center">
          <p className="text-[11px] text-[#CCCCCC]">Seleto · Est. 2020 · Rio de Janeiro</p>
        </footer>
      </div>
    )
  }

  // ── ETAPA 2 — Quiz ─────────────────────────────────────────────────────

  const pergunta = perguntasQuiz[perguntaIdx]
  const isUltima = perguntaIdx === TOTAL - 1
  const progresso = Math.round(((perguntaIdx) / TOTAL) * 100)
  const respostaAtual = resposta(pergunta.campo)
  // Lista de textos a renderizar (objetiva usa `objetivas`; demais usam `opcoes`, já embaralhadas)
  const opcoesRender: string[] = pergunta.tipo === 'objetiva'
    ? (pergunta.objetivas ?? [])
    : pergunta.opcoes.map(o => o.texto)

  return (
    <div className="min-h-screen bg-white">
      {/* Header fixo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider whitespace-nowrap">Etapa 2 de 2</span>
            <span className="text-[#E5E5E5]">—</span>
            <span className="text-xs text-[#0A0A0A] whitespace-nowrap">Prova Rápida</span>
          </div>
          <span className="text-xs text-[#6B6B6B] whitespace-nowrap">{perguntaIdx + 1} / {TOTAL}</span>
        </div>
        {/* Barra de progresso */}
        <div className="h-0.5 bg-[#F0F0F0]">
          <div className="h-full bg-[#0A0A0A] transition-all duration-300" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-5 pt-20 pb-24">
        {perguntaIdx === 0 && (
          <div className="mb-8 text-center">
            <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-2">Prova Rápida</p>
            <p className="text-sm text-[#6B6B6B]">Responda com sinceridade. Não existe resposta certa ou errada.</p>
          </div>
        )}

        <div className="mb-8">
          <p className="text-xs text-[#B0B0B0] mb-3">Pergunta {perguntaIdx + 1} de {TOTAL}</p>
          <h2 className="text-lg font-semibold text-[#0A0A0A] leading-snug">{pergunta.texto}</h2>
        </div>

        {/* Opções tipo card (mapeada / forçada / objetiva) */}
        <div className="flex flex-col gap-2.5">
          {opcoesRender.map(opt => {
            const sel = respostaAtual === opt
            return (
              <button
                key={opt}
                onClick={() => setResposta(pergunta.campo, opt)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all ${
                  sel
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white font-medium'
                    : 'border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#FAFAFA]'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {perguntaError && (
          <p className="mt-3 text-xs text-red-500">{perguntaError}</p>
        )}
        {submitError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-all">
            {submitError}
          </div>
        )}
      </div>

      {/* Footer fixo com botões de navegação */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] px-4 py-3">
        <div className="max-w-[640px] mx-auto flex items-center justify-between gap-3">
          <button
            onClick={perguntaAnterior}
            disabled={perguntaIdx === 0}
            className="px-4 py-2.5 text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors disabled:opacity-30"
          >
            ← Anterior
          </button>
          <button
            onClick={proximaPergunta}
            disabled={enviando}
            className="px-6 py-2.5 text-sm font-medium bg-[#0A0A0A] text-white rounded-[10px] hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : isUltima ? 'Enviar candidatura ✓' : 'Próxima →'}
          </button>
        </div>
      </div>
    </div>
  )
}
