'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const LOJAS = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']

type Colaborador = { id: string; nome: string; cargo: string }

function formatarCPF(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export default function AvaliacaoColetivaPage() {
  const params = useParams()
  const router = useRouter()
  const tokenLink = typeof params.token === 'string' ? params.token : ''

  const [estado, setEstado] = useState<'identificacao' | 'ja_respondeu' | 'link_invalido' | 'nao_esperado'>('identificacao')
  const [respondidoEm, setRespondidoEm] = useState<string | null>(null)

  const [loja, setLoja] = useState('')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [colaboradorId, setColaboradorId] = useState('')
  const [cpf, setCpf] = useState('')
  const [carregandoColabs, setCarregandoColabs] = useState(false)
  const [validando, setValidando] = useState(false)
  const [erroCpf, setErroCpf] = useState('')
  const [tentativasRestantes, setTentativasRestantes] = useState<number | null>(null)
  const [bloqueadoAte, setBloqueadoAte] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenLink) setEstado('link_invalido')
  }, [tokenLink])

  useEffect(() => {
    if (!loja) { setColaboradores([]); setColaboradorId(''); return }
    setCarregandoColabs(true)
    fetch(`/api/colaboradores-por-loja?loja=${encodeURIComponent(loja)}`)
      .then((r) => r.json())
      .then((data) => {
        // No link coletivo só ATIVO pode responder — filtra TREINAMENTO do dropdown
        const ativos = Array.isArray(data) ? data.filter((c: Colaborador) => c.cargo !== undefined) : []
        setColaboradores(ativos)
        setColaboradorId('')
      })
      .finally(() => setCarregandoColabs(false))
  }, [loja])

  async function identificar() {
    if (!loja || !colaboradorId || cpf.replace(/\D/g, '').length < 11) return
    setValidando(true)
    setErroCpf('')
    setTentativasRestantes(null)

    const res = await fetch('/api/identificar-coletivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_link: tokenLink, colaborador_id: colaboradorId, cpf }),
    })
    const json = await res.json()

    if (res.ok) {
      if (json.ja_respondeu) {
        setRespondidoEm(json.respondido_em)
        setEstado('ja_respondeu')
      } else {
        // Redireciona para o formulário com o cargo na query
        router.push(`/avaliacao-mensal/${json.token_avaliacao}?cargo=${json.cargo}`)
      }
    } else if (json.error === 'bloqueado') {
      setBloqueadoAte(json.bloqueado_ate)
      setErroCpf('Muitas tentativas incorretas. Tente novamente mais tarde.')
    } else if (json.error === 'cpf_invalido') {
      setTentativasRestantes(json.tentativas_restantes ?? null)
      setErroCpf('CPF incorreto. Verifique e tente novamente.')
    } else if (json.error === 'nao_esperado') {
      setEstado('nao_esperado')
    } else if (json.error === 'invalid_token' || json.error === 'link_encerrado') {
      setEstado('link_invalido')
    } else {
      setErroCpf('Erro ao validar. Tente novamente.')
    }
    setValidando(false)
  }

  function tempoRestante(): string {
    if (!bloqueadoAte) return ''
    const diff = new Date(bloqueadoAte).getTime() - Date.now()
    if (diff <= 0) return ''
    return `${Math.ceil(diff / 60000)} min`
  }

  function formatarData(iso: string) {
    const [y, m, d] = iso.split('T')[0].split('-')
    return `${d}/${m}/${y}`
  }

  if (estado === 'link_invalido') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-lg font-semibold text-[#0A0A0A] mb-2">Link inválido</h1>
        <p className="text-sm text-[#6B6B6B]">Este link de avaliação não existe ou foi encerrado.</p>
      </div>
    )
  }

  if (estado === 'nao_esperado') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🚫</p>
        <h1 className="text-lg font-semibold text-[#0A0A0A] mb-2">Fora da lista</h1>
        <p className="text-sm text-[#6B6B6B] max-w-xs">
          Você não está na lista deste link coletivo. Links coletivos são para colaboradores
          efetivos no momento da geração. Se precisar responder, peça um link individual ao gestor.
        </p>
      </div>
    )
  }

  if (estado === 'ja_respondeu') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-5">✅</p>
        <h1 className="text-xl font-semibold text-[#0A0A0A] mb-2">Você já respondeu!</h1>
        <p className="text-sm text-[#6B6B6B] max-w-xs">
          Sua avaliação para este período já foi enviada
          {respondidoEm ? ` em ${formatarData(respondidoEm)}` : ''}.
          Obrigado pela participação!
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">SELETO</span>
          <span className="ml-3 text-sm text-[#6B6B6B]">· Avaliação Mensal</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8 pb-20">
        <h1 className="text-xl font-semibold text-[#0A0A0A] mb-1">Avaliação Mensal</h1>
        <p className="text-sm text-[#6B6B6B] mb-8">Identifique-se para acessar o formulário.</p>

        {/* Loja */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">
            Sua loja
          </label>
          <select
            value={loja}
            onChange={(e) => setLoja(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] bg-white focus:outline-none focus:border-[#0A0A0A] transition-colors"
          >
            <option value="">Selecione a loja…</option>
            {LOJAS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Nome */}
        {loja && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">
              Seu nome
            </label>
            {carregandoColabs ? (
              <p className="text-sm text-[#6B6B6B]">Carregando…</p>
            ) : (
              <select
                value={colaboradorId}
                onChange={(e) => { setColaboradorId(e.target.value); setErroCpf('') }}
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] bg-white focus:outline-none focus:border-[#0A0A0A] transition-colors"
              >
                <option value="">Selecione seu nome…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}
            {colaboradores.length === 0 && !carregandoColabs && (
              <p className="text-xs text-[#6B6B6B] mt-1">Nenhum colaborador ativo nesta loja.</p>
            )}
          </div>
        )}

        {/* CPF */}
        {colaboradorId && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">
              Seu CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                setCpf(formatarCPF(e.target.value))
                setErroCpf('')
                setTentativasRestantes(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && identificar()}
              className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors tracking-wider"
              maxLength={14}
            />
            {erroCpf && <p className="text-xs text-red-600 mt-2">{erroCpf}</p>}
            {tentativasRestantes !== null && tentativasRestantes > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {tentativasRestantes} tentativa{tentativasRestantes !== 1 ? 's' : ''} restante{tentativasRestantes !== 1 ? 's' : ''}.
              </p>
            )}
            {bloqueadoAte && tempoRestante() && (
              <p className="text-xs text-[#6B6B6B] mt-1">Tente novamente em {tempoRestante()}.</p>
            )}
          </div>
        )}

        {colaboradorId && (
          <button
            onClick={identificar}
            disabled={
              validando ||
              cpf.replace(/\D/g, '').length < 11 ||
              !!(bloqueadoAte && new Date(bloqueadoAte) > new Date())
            }
            className="w-full bg-[#0A0A0A] text-white text-sm font-semibold py-3.5 rounded-xl hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {validando ? 'Verificando…' : 'Continuar →'}
          </button>
        )}
      </div>
    </div>
  )
}
