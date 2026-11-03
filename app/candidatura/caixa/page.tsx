'use client'

import { useState, useRef, useId, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader } from '@googlemaps/js-api-loader'

const UNIDADES = [
  { label: 'Taquara — Rua Bacairis, 248',                    value: 'Taquara' },
  { label: 'Aerotown — Av. Ayrton Senna, 2541',             value: 'Aerotown' },
  { label: 'Américas Shopping — Av. das Américas, 15500',   value: 'Americas' },
  { label: 'Nova Iguaçu — Av. Abílio Augusto Távora, 1111', value: 'Nova Iguaçu' },
]

const inputBase =
  'w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#EEE] bg-[#FAFAFA] text-[#0A0A0A] placeholder-[#BBBBBB] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-colors'

function inputCls(value: string) {
  return `${inputBase} ${value ? 'border-[#0A0A0A] bg-white' : ''}`
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="block text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      className={inputCls(value)}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function TA({ value, onChange, placeholder, rows = 4, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number
}) {
  return (
    <div>
      <textarea
        className={`${inputCls(value)} resize-none`}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      {maxLength && (
        <p className="text-xs text-[#B0B0B0] text-right mt-1">{value.length}/{maxLength}</p>
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
  value: string[]
  onChange: (v: string[]) => void
  options: ({ label: string; value: string } | string)[]
}) {
  const uid = useId()
  const normalized = options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  return (
    <div className="flex flex-col gap-2">
      {normalized.map(opt => {
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-6">
      <div className="h-px flex-1 bg-[#F0F0F0]"/>
      <span className="text-[10px] font-medium text-[#CCCCCC] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[#F0F0F0]"/>
    </div>
  )
}

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
const PROGRESS_KEY = 'seleto_etapa1_caixa'


type F = {
  nome: string
  cpf: string
  idade: string
  whatsapp: string
  email: string
  instagram: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  unidades: string[]
  escolaridade: string
  turno_faculdade: string
  veiculo: string
  cnh: string[]
  disponibilidade_horario: string
  disponibilidade_mudanca: string
  pretensao_salarial: string
  operou_caixa: string
  facilidade_calculos: string
  experiencia_troco: string
  descricao_experiencia_caixa: string
  conducoes_ida: string
  conducoes_volta: string
}

const EMPTY: F = {
  nome: '', cpf: '', idade: '', whatsapp: '', email: '', instagram: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  unidades: [], escolaridade: '', turno_faculdade: '', veiculo: '', cnh: [],
  disponibilidade_horario: '', disponibilidade_mudanca: '', pretensao_salarial: '',
  operou_caixa: '', facilidade_calculos: '', experiencia_troco: '',
  descricao_experiencia_caixa: '',
  conducoes_ida: '',
  conducoes_volta: '',
}

function validar(f: F): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.nome.trim()) e.nome = 'Campo obrigatório'
  if (!f.cpf.trim()) e.cpf = 'Campo obrigatório'
  else if (!validarCPF(f.cpf)) e.cpf = 'CPF inválido'
  if (!f.idade.trim()) e.idade = 'Campo obrigatório'
  else if (parseInt(f.idade) < 18) e.idade = 'Idade mínima: 18 anos'
  if (!f.whatsapp.trim()) e.whatsapp = 'Campo obrigatório'
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'E-mail inválido'
  if (!f.endereco.trim()) e.endereco = 'Campo obrigatório'
  if (f.unidades.length === 0) e.unidades = 'Selecione ao menos uma unidade'
  if (!f.escolaridade) e.escolaridade = 'Campo obrigatório'
  if (f.escolaridade === 'Faculdade em andamento' && !f.turno_faculdade) e.turno_faculdade = 'Campo obrigatório'
  if (!f.veiculo) e.veiculo = 'Campo obrigatório'
  if (f.veiculo && f.veiculo !== 'Não possuo' && f.cnh.length === 0) e.cnh = 'Selecione ao menos uma opção'
  if (!f.disponibilidade_horario) e.disponibilidade_horario = 'Campo obrigatório'
  if (!f.disponibilidade_mudanca) e.disponibilidade_mudanca = 'Campo obrigatório'
  if (!f.pretensao_salarial.trim()) e.pretensao_salarial = 'Campo obrigatório'
  if (!f.operou_caixa) e.operou_caixa = 'Campo obrigatório'
  if (!f.facilidade_calculos) e.facilidade_calculos = 'Campo obrigatório'
  if (!f.experiencia_troco) e.experiencia_troco = 'Campo obrigatório'

  const temExperiencia = f.operou_caixa === 'Sim' || f.facilidade_calculos === 'Sim' || f.experiencia_troco === 'Sim'
  if (temExperiencia && f.descricao_experiencia_caixa.trim().length < 50) {
    e.descricao_experiencia_caixa = 'Descreva sua experiência (mínimo 50 caracteres)'
  }
  if (!f.conducoes_ida || parseInt(f.conducoes_ida) < 1) e.conducoes_ida = 'Informe pelo menos 1 condução'
  if (!f.conducoes_volta || parseInt(f.conducoes_volta) < 1) e.conducoes_volta = 'Informe pelo menos 1 condução'
  return e
}

type Fase = 'form' | 'loading'

export default function CandidaturaCaixaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [f, setF] = useState<F>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fase, setFase] = useState<Fase>('form')
  const [candidatoId, setCandidatoId] = useState('')
  const fotoRef = useRef<HTMLInputElement>(null)
  const enderecoContainerRef = useRef<HTMLDivElement>(null)
  const [cepData, setCepData] = useState<{ logradouro: string; bairro: string; localidade: string; uf: string } | null>(null)

  async function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    setF(prev => ({ ...prev, cep: digits }))
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setCepData({ logradouro: data.logradouro ?? '', bairro: data.bairro ?? '', localidade: data.localidade ?? '', uf: data.uf ?? '' })
          const base = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean).join(', ')
          setF(prev => ({ ...prev, endereco: base }))
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
        setStr('endereco')(place.formattedAddress || '')
      })
      placeAutoComplete.addEventListener('input', (e: any) => {
        const val = e.target?.value ?? ''
        setStr('endereco')(val)
      })
      console.log('Places API carregada com sucesso')
    }).catch(err => console.error('Erro Places API:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PROGRESS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') setF(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => { if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


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

  const setStr = (key: keyof F) => (val: string) =>
    setF(prev => {
      const next = { ...prev, [key]: val }
      try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  const setArr = (key: keyof F) => (val: string[]) =>
    setF(prev => {
      const next = { ...prev, [key]: val }
      try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch {}
      return next
    })

  async function handleSubmit() {
    const errs = validar(f)
    if (!f.endereco.trim()) errs.endereco = 'Campo obrigatório'
    if (cepData && !f.numero.trim()) errs.numero = 'Informe o número'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErrors({})
    setUploading(true)
    setSubmitError('')

    try {
      const cpfRes = await fetch(`/api/verificar-cpf?cpf=${encodeURIComponent(f.cpf.replace(/\D/g, ''))}&cargo=caixa`)
      const cpfData = await cpfRes.json()
      if (cpfData.existe) {
        if (!STATUS_PODE_REFAZER.includes(cpfData.status)) {
          setSubmitError('Você já participou de um processo seletivo com este CPF e ele foi encerrado. Não é possível se candidatar novamente.')
          return
        }
        const campos: Record<string, unknown> = {
          cargo: 'caixa', nome: f.nome, cpf: f.cpf.replace(/\D/g, ''),
          idade: f.idade || undefined, whatsapp: f.whatsapp || undefined,
          email: f.email || undefined, instagram: f.instagram || undefined,
          cep: f.cep || undefined,
          endereco: (f.endereco + (f.numero ? ', ' + f.numero : '') + (f.complemento ? ' - ' + f.complemento : '')) || undefined,
          unidades: f.unidades, escolaridade: f.escolaridade || undefined,
          veiculo: f.veiculo || undefined, cnh: f.cnh,
          disponibilidade_horario: f.disponibilidade_horario || undefined,
          disponibilidade_mudanca: f.disponibilidade_mudanca || undefined,
          pretensao_salarial: f.pretensao_salarial || undefined,
          operou_caixa: f.operou_caixa || undefined,
          facilidade_calculos: f.facilidade_calculos || undefined,
          experiencia_troco: f.experiencia_troco || undefined,
          descricao_experiencia_caixa: f.descricao_experiencia_caixa || undefined,
          conducoes_ida: f.conducoes_ida,
          conducoes_volta: f.conducoes_volta,
          status: 'EM_ANDAMENTO', etapa_atual: 1,
        }
        await fetch('/api/atualizar-etapa1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: cpfData.id, ...campos }),
        })
        try { sessionStorage.removeItem(PROGRESS_KEY) } catch {}
        setCandidatoId(cpfData.id)
        setFase('loading')
        fetch('/api/analisar-logistica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: cpfData.id }),
        }).catch(() => {})
        return
      } else if (cpfData.expirado_id) {
        // CPF expirado — reutiliza o registro preservando o histórico
        const campos: Record<string, unknown> = {
          cargo: 'caixa', nome: f.nome, cpf: f.cpf.replace(/\D/g, ''),
          idade: f.idade || undefined, whatsapp: f.whatsapp || undefined,
          email: f.email || undefined, instagram: f.instagram || undefined,
          cep: f.cep || undefined, endereco: (f.endereco + (f.numero ? ', ' + f.numero : '') + (f.complemento ? ' - ' + f.complemento : '')) || undefined,
          unidades: f.unidades, escolaridade: f.escolaridade || undefined,
          veiculo: f.veiculo || undefined, cnh: f.cnh,
          disponibilidade_horario: f.disponibilidade_horario || undefined,
          disponibilidade_mudanca: f.disponibilidade_mudanca || undefined,
          pretensao_salarial: f.pretensao_salarial || undefined,
          operou_caixa: f.operou_caixa || undefined,
          facilidade_calculos: f.facilidade_calculos || undefined,
          experiencia_troco: f.experiencia_troco || undefined,
          descricao_experiencia_caixa: f.descricao_experiencia_caixa || undefined,
          conducoes_ida: f.conducoes_ida, conducoes_volta: f.conducoes_volta,
          status: 'EM_ANDAMENTO', etapa_atual: 1,
        }
        await fetch('/api/atualizar-etapa1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: cpfData.expirado_id, ...campos }),
        })
        try { sessionStorage.removeItem(PROGRESS_KEY) } catch {}
        setCandidatoId(cpfData.expirado_id)
        setFase('loading')
        fetch('/api/analisar-logistica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: cpfData.expirado_id }),
        }).catch(() => {})
        return
      }

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

      if (f.escolaridade === 'Ensino Médio Incompleto') {
        const id = crypto.randomUUID()
        await supabase.from('candidatos').insert({
          id,
          cargo: 'caixa',
          status: 'REPROVADO',
          motivo_reprovacao: 'Escolaridade abaixo do requisito mínimo',
          etapa_atual: 1,
          nome: f.nome,
          cpf: f.cpf.replace(/\D/g, ''),
          idade: f.idade || undefined,
          whatsapp: f.whatsapp || undefined,
          email: f.email || undefined,
          instagram: f.instagram || undefined,
          cep: f.cep || undefined,
          endereco: (f.endereco + (f.numero ? ', ' + f.numero : '') + (f.complemento ? ' - ' + f.complemento : '')) || undefined,
          unidades: f.unidades,
          escolaridade: f.escolaridade || undefined,
          veiculo: f.veiculo || undefined,
          cnh: f.cnh,
          disponibilidade_horario: f.disponibilidade_horario || undefined,
          disponibilidade_mudanca: f.disponibilidade_mudanca || undefined,
          pretensao_salarial: f.pretensao_salarial || undefined,
          conducoes_ida: f.conducoes_ida,
          conducoes_volta: f.conducoes_volta,
          foto_url,
        })
        try { sessionStorage.removeItem(PROGRESS_KEY) } catch {}
        router.push(`/obrigado?id=${id}&tipo=logistica_reprovado`)
        return
      }

      const id = crypto.randomUUID()
      const { error: insErr } = await supabase.from('candidatos').insert({
        id,
        cargo: 'caixa',
        status: 'EM_ANDAMENTO',
        etapa_atual: 1,
        nome: f.nome,
        cpf: f.cpf.replace(/\D/g, ''),
        idade: f.idade || undefined,
        whatsapp: f.whatsapp || undefined,
        email: f.email || undefined,
        instagram: f.instagram || undefined,
        cep: f.cep || undefined,
        endereco: (f.endereco + (f.numero ? ', ' + f.numero : '') + (f.complemento ? ' - ' + f.complemento : '')) || undefined,
        unidades: f.unidades,
        escolaridade: f.escolaridade || undefined,
        turno_faculdade: f.turno_faculdade || undefined,
        veiculo: f.veiculo || undefined,
        cnh: f.cnh,
        disponibilidade_horario: f.disponibilidade_horario || undefined,
        disponibilidade_mudanca: f.disponibilidade_mudanca || undefined,
        pretensao_salarial: f.pretensao_salarial || undefined,
        operou_caixa: f.operou_caixa || undefined,
        facilidade_calculos: f.facilidade_calculos || undefined,
        experiencia_troco: f.experiencia_troco || undefined,
        descricao_experiencia_caixa: f.descricao_experiencia_caixa || undefined,
        conducoes_ida: f.conducoes_ida,
        conducoes_volta: f.conducoes_volta,
        foto_url,
      })

      if (insErr) throw new Error(`[${insErr.code}] ${insErr.message}`)

      try { sessionStorage.removeItem(PROGRESS_KEY) } catch {}
      setCandidatoId(id)
      setFase('loading')

      fetch('/api/analisar-logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidato_id: id }),
      }).catch(() => {})
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setUploading(false)
    }
  }

  const temExperiencia = f.operou_caixa === 'Sim' || f.facilidade_calculos === 'Sim' || f.experiencia_troco === 'Sim'

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
        <p className="text-[11px] text-[#BBB] mb-4">Candidatura › Operador de Caixa › Dados pessoais</p>

        <div className="flex gap-1 mb-6">
          {[0, 1].map(i => (
            <div key={i} className={`h-[2px] flex-1 rounded-full ${i === 0 ? 'bg-[#0A0A0A]' : 'bg-[#EEEEEE]'}`} />
          ))}
        </div>

        <h1 className="text-xl font-semibold text-[#0A0A0A] mt-6 mb-6">Suas informações pessoais.</h1>

        <div className="flex flex-col gap-5">
          {/* Foto */}
          <Field label="Sua foto" required>
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
            <Field label="Nome completo" required error={errors.nome}>
              <Inp value={f.nome} onChange={setStr('nome')} placeholder="Seu nome completo" />
            </Field>
          </div>

          <div id="cpf">
            <Field label="CPF" required error={errors.cpf}>
              <Inp value={f.cpf}
                onChange={val => setStr('cpf')(maskCPF(val))}
                placeholder="000.000.000-00" />
            </Field>
          </div>

          <div id="idade">
            <Field label="Idade" required error={errors.idade}>
              <Inp value={f.idade} onChange={setStr('idade')} placeholder="Ex: 24" />
            </Field>
          </div>

          <SectionDivider label="Contato" />

          <div id="whatsapp">
            <Field label="Telefone com WhatsApp" required error={errors.whatsapp}>
              <Inp value={f.whatsapp} onChange={setStr('whatsapp')} placeholder="(21) 99999-9999" />
            </Field>
          </div>

          <div id="email">
            <Field label="E-mail" error={errors.email}>
              <Inp type="email" value={f.email} onChange={setStr('email')} placeholder="seu@email.com" />
              <p className="text-xs text-[#6B6B6B] mt-1">Opcional</p>
            </Field>
          </div>

          <div id="instagram">
            <Field label="Instagram" error={errors.instagram}>
              <Inp type="url" value={f.instagram} onChange={setStr('instagram')} placeholder="https://instagram.com/seuperfil" />
              <p className="text-xs text-[#6B6B6B] mt-1">Cole o link completo do seu perfil (opcional)</p>
            </Field>
          </div>

          <SectionDivider label="Localização" />

          <Field label="CEP" required error={errors.cep}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              className={inputCls(f.cep)}
              value={f.cep.replace(/(\d{5})(\d{1,3})/, '$1-$2')}
              onChange={e => handleCepChange(e.target.value)}
              placeholder="00000-000"
            />
          </Field>

          <div id="endereco">
            <Field label="Endereço" required error={errors.endereco}>
              {cepData ? (
                <p className="px-3.5 py-2.5 text-sm rounded-lg border border-[#EEE] bg-[#F3F3F3] text-[#0A0A0A]">
                  {f.endereco}
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
              <Field label="Número" required error={errors.numero}>
                <Inp value={f.numero} onChange={v => setF(prev => ({ ...prev, numero: v }))} placeholder="Ex: 123" />
              </Field>
              <Field label="Complemento (opcional)">
                <Inp value={f.complemento} onChange={v => setF(prev => ({ ...prev, complemento: v }))} placeholder="Ex: apto 2" />
              </Field>
            </div>
          )}
          {/* Conduções */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Conduções na ida" required error={errors.conducoes_ida}>
              <input
                type="number"
                min="1"
                step="1"
                className={inputCls(f.conducoes_ida)}
                value={f.conducoes_ida}
                onChange={e => setF(prev => ({ ...prev, conducoes_ida: e.target.value }))}
                placeholder="Ex: 1"
              />
            </Field>
            <Field label="Conduções na volta" required error={errors.conducoes_volta}>
              <input
                type="number"
                min="1"
                step="1"
                className={inputCls(f.conducoes_volta)}
                value={f.conducoes_volta}
                onChange={e => setF(prev => ({ ...prev, conducoes_volta: e.target.value }))}
                placeholder="Ex: 1"
              />
            </Field>
          </div>
          <p className="text-xs text-[#6B6B6B] -mt-3">Informe quantos ônibus, metrôs ou trens você precisa pegar em cada trajeto. Se for direto, coloque 1.</p>

          <div id="unidades">
            <Field label="Qual unidade seria mais viável para você trabalhar?" required error={errors.unidades}>
              <p className="text-sm text-[#6B6B6B] italic -mt-0.5 mb-2">
                Marque todas as unidades que considera viável. Analisaremos o deslocamento para cada uma.
              </p>
              <CG value={f.unidades} onChange={setArr('unidades')} options={UNIDADES} />
            </Field>
          </div>

          <SectionDivider label="Formação & Veículo" />

          <div id="escolaridade">
            <Field label="Escolaridade" required error={errors.escolaridade}>
              <div className="flex flex-col gap-2">
                {['Ensino Médio Incompleto', 'Ensino Médio Completo', 'Faculdade em andamento', 'Faculdade completa', 'Pós/MBA'].map(opt => {
                  const uid = `esc-${opt}`
                  const checked = f.escolaridade === opt
                  return (
                    <div key={opt} className="flex items-center gap-3">
                      <input type="radio" id={uid} name="escolaridade" value={opt} checked={checked}
                        onChange={() => setStr('escolaridade')(opt)} className="sr-only" />
                      <label htmlFor={uid} className="flex items-center gap-3 cursor-pointer group">
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
            </Field>
          </div>

          {f.escolaridade === 'Faculdade em andamento' && (
            <div id="turno_faculdade">
              <Field label="Qual o turno da sua faculdade?" required error={errors.turno_faculdade}>
                <RG value={f.turno_faculdade} onChange={setStr('turno_faculdade')}
                  options={['Manhã', 'Tarde', 'Noite', 'EAD / Semipresencial']} />
              </Field>
            </div>
          )}

          <div id="veiculo">
            <Field label="Possui veículo próprio?" required error={errors.veiculo}>
              <RG value={f.veiculo} onChange={setStr('veiculo')} options={['Carro', 'Moto', 'Não possuo']} />
            </Field>
          </div>

          {f.veiculo && f.veiculo !== 'Não possuo' && (
            <div id="cnh">
              <Field label="Possui CNH? Se sim, qual categoria?" required error={errors.cnh}>
                <CG
                  value={f.cnh}
                  onChange={val => {
                    const hadNao = f.cnh.includes('Não possuo CNH')
                    const hasNao = val.includes('Não possuo CNH')
                    if (!hadNao && hasNao) {
                      setArr('cnh')(['Não possuo CNH'])
                    } else {
                      setArr('cnh')(val.filter(x => x !== 'Não possuo CNH'))
                    }
                  }}
                  options={
                    f.cnh.includes('Não possuo CNH')
                      ? [{ label: 'Não possuo CNH', value: 'Não possuo CNH' }]
                      : [
                          { label: 'Não possuo CNH', value: 'Não possuo CNH' },
                          { label: 'A', value: 'A' },
                          { label: 'B', value: 'B' },
                          { label: 'C', value: 'C' },
                          { label: 'D', value: 'D' },
                        ]
                  }
                />
              </Field>
            </div>
          )}

          <SectionDivider label="Disponibilidade" />

          <div id="disponibilidade_horario">
            <Field label="Disponibilidade de horário?" required error={errors.disponibilidade_horario}>
              <RG value={f.disponibilidade_horario} onChange={setStr('disponibilidade_horario')}
                options={['Total', 'Manhã-tarde', 'Tarde-noite']} />
            </Field>
          </div>

          <div id="disponibilidade_mudanca">
            <Field label="Possui disponibilidade para mudança de unidade se necessário?" required error={errors.disponibilidade_mudanca}>
              <RG value={f.disponibilidade_mudanca} onChange={setStr('disponibilidade_mudanca')}
                options={['Sim', 'Não']} />
            </Field>
          </div>

          <SectionDivider label="Remuneração" />

          <div id="pretensao_salarial">
            <Field label="Qual sua pretensão salarial?" required error={errors.pretensao_salarial}>
              <Inp value={f.pretensao_salarial} onChange={setStr('pretensao_salarial')} placeholder="Ex: R$ 1.800,00" />
            </Field>
          </div>

          <SectionDivider label="Experiência com Caixa" />

          {/* Campos específicos de Caixa */}
          <div id="operou_caixa">
            <Field label="Você já operou caixa ou sistema de PDV?" required error={errors.operou_caixa}>
              <RG value={f.operou_caixa} onChange={setStr('operou_caixa')} options={['Sim', 'Não']} />
            </Field>
          </div>

          <div id="facilidade_calculos">
            <Field label="Você tem facilidade com cálculos e dinheiro?" required error={errors.facilidade_calculos}>
              <RG value={f.facilidade_calculos} onChange={setStr('facilidade_calculos')} options={['Sim', 'Às vezes', 'Não']} />
            </Field>
          </div>

          <div id="experiencia_troco">
            <Field label="Já teve experiência com controle de troco ou fechamento de caixa?" required error={errors.experiencia_troco}>
              <RG value={f.experiencia_troco} onChange={setStr('experiencia_troco')} options={['Sim', 'Não']} />
            </Field>
          </div>

          {temExperiencia && (
            <div id="descricao_experiencia_caixa">
              <Field label="Conte sobre sua experiência" required error={errors.descricao_experiencia_caixa}>
                <p className="text-xs text-[#6B6B6B] italic mb-2">
                  Descreva qual sistema usava, como era a rotina e quanto tempo ficou na função.
                </p>
                <TA
                  value={f.descricao_experiencia_caixa}
                  onChange={setStr('descricao_experiencia_caixa')}
                  placeholder="Ex: trabalhei 1 ano como operadora de caixa no Supermercado X, usava o sistema..."
                  rows={4}
                  maxLength={500}
                />
              </Field>
            </div>
          )}
        </div>

        {submitError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-all">
            {submitError}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="bg-[#0A0A0A] text-white rounded-[10px] w-full py-3.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : 'Continuar →'}
          </button>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-[11px] text-[#CCCCCC]">Seleto · Est. 2020 · Rio de Janeiro</p>
      </footer>
    </div>
  )
}
