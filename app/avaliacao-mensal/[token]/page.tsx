'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  BLOCO_ENGAJAMENTO,
  BLOCO_AMBICAO_OBJETIVO,
  BLOCO_AMBICAO_ESCALAS,
  BLOCO_AMBICAO_VISAO,
  BLOCO_REMUNERACAO,
  BLOCO_PERFIL,
  BLOCO_ABERTO,
} from '@/lib/perguntas-avaliacao'

const LOJAS = ['Taquara', 'Aerotown', 'Americas', 'Nova Iguaçu']

type Colaborador = { id: string; nome: string; cargo: string }

function formatarCPF(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function ScaleButtons({
  value, onChange, min = 0, max = 10, label,
}: {
  value: number | null; onChange: (v: number) => void; min?: number; max?: number; label?: string
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  return (
    <div>
      {label && <p className="text-xs text-[#6B6B6B] mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
              value === v
                ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                : 'bg-white text-[#6B6B6B] border-[#E5E5E5] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AvaliacaoMensalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = typeof params.token === 'string' ? params.token : ''

  // Cargo: derivado do dropdown (fluxo individual) ou da query string (fluxo coletivo)
  // Determinado após identificação — usado para condicionar Bloco 4
  const cargoParam = searchParams.get('cargo') ?? ''

  // Passo 0 — Identificação
  const [passo, setPasso] = useState<0 | 1 | 'sucesso' | 'erro_link'>(0)
  const [loja, setLoja] = useState('')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [colaboradorId, setColaboradorId] = useState('')
  const [cpf, setCpf] = useState('')
  const [carregandoColabs, setCarregandoColabs] = useState(false)
  const [validando, setValidando] = useState(false)
  const [erroCpf, setErroCpf] = useState('')
  const [bloqueadoAte, setBloqueadoAte] = useState<string | null>(null)
  const [tentativasRestantes, setTentativasRestantes] = useState<number | null>(null)

  // Passo 1 — Formulário
  // Bloco 1
  const [engPertencimento, setEngPertencimento] = useState<number | null>(null)
  const [engLongevidade, setEngLongevidade] = useState<number | null>(null)
  const [engEnps, setEngEnps] = useState<number | null>(null)
  // Bloco 2
  const [ambObjetivo, setAmbObjetivo] = useState('')
  const [ambResponsabilidades, setAmbResponsabilidades] = useState<number | null>(null)
  const [ambVisao2anos, setAmbVisao2anos] = useState('')
  // Bloco 3
  const [remJusta, setRemJusta] = useState<number | null>(null)
  const [remReconhecimento, setRemReconhecimento] = useState<number | null>(null)
  // Bloco 4
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  // Bloco 5
  const [textoMelhoria, setTextoMelhoria] = useState('')
  const [textoGestor, setTextoGestor] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  // Verifica bloqueio ativo no carregamento
  useEffect(() => {
    if (!token) { setPasso('erro_link'); return }
  }, [token])

  // Carrega colaboradores quando a loja é selecionada
  useEffect(() => {
    if (!loja) { setColaboradores([]); setColaboradorId(''); return }
    setCarregandoColabs(true)
    fetch(`/api/colaboradores-por-loja?loja=${encodeURIComponent(loja)}`)
      .then((r) => r.json())
      .then((data) => {
        setColaboradores(Array.isArray(data) ? data : [])
        setColaboradorId('')
      })
      .finally(() => setCarregandoColabs(false))
  }, [loja])

  async function validarCpf() {
    if (!loja || !colaboradorId || cpf.replace(/\D/g, '').length < 11) return
    setValidando(true)
    setErroCpf('')
    setTentativasRestantes(null)

    const res = await fetch('/api/validar-cpf-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, colaborador_id: colaboradorId, cpf }),
    })
    const json = await res.json()

    if (res.ok) {
      setPasso(1)
    } else if (json.error === 'bloqueado') {
      setBloqueadoAte(json.bloqueado_ate)
      setErroCpf('Muitas tentativas incorretas. Tente novamente mais tarde.')
    } else if (json.error === 'already_answered') {
      setErroCpf('Esta avaliação já foi respondida.')
    } else if (json.error === 'cpf_invalido') {
      setTentativasRestantes(json.tentativas_restantes ?? null)
      setErroCpf('CPF incorreto. Verifique e tente novamente.')
    } else if (json.error === 'invalid_token') {
      setPasso('erro_link')
    } else {
      setErroCpf('Erro ao validar. Tente novamente.')
    }
    setValidando(false)
  }

  async function enviarFormulario(e: React.FormEvent) {
    e.preventDefault()
    // Bloco 4 obrigatório apenas para vendedor
    const cargoEfetivo = colaboradores.find((c) => c.id === colaboradorId)?.cargo || cargoParam || 'vendedor'
    if (cargoEfetivo === 'vendedor') {
      const perguntasEsperadas = BLOCO_PERFIL.map((p) => p.id)
      const faltando = perguntasEsperadas.filter((p) => !respostas[p])
      if (faltando.length > 0) {
        setErroEnvio(`Responda todas as questões do Bloco 4 (faltam: ${faltando.join(', ')}).`)
        document.getElementById('bloco4')?.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    setEnviando(true)
    setErroEnvio('')

    const res = await fetch('/api/salvar-autoavaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        colaborador_id: colaboradorId,
        loja,
        cpf,
        eng_pertencimento: engPertencimento,
        eng_longevidade: engLongevidade,
        eng_enps: engEnps,
        amb_objetivo: ambObjetivo || null,
        amb_responsabilidades: ambResponsabilidades,
        amb_visao_2anos: ambVisao2anos || null,
        rem_justa: remJusta,
        rem_reconhecimento: remReconhecimento,
        respostas_bloco4: respostas,
        texto_melhoria: textoMelhoria || null,
        texto_gestor: textoGestor || null,
      }),
    })

    if (res.ok) {
      setPasso('sucesso')
    } else {
      const json = await res.json()
      if (json.error === 'already_answered') {
        setErroEnvio('Esta avaliação já foi respondida.')
      } else {
        setErroEnvio('Erro ao enviar. Verifique sua conexão e tente novamente.')
      }
    }
    setEnviando(false)
  }

  // Tempo restante de bloqueio
  function tempoRestante(): string {
    if (!bloqueadoAte) return ''
    const diff = new Date(bloqueadoAte).getTime() - Date.now()
    if (diff <= 0) return ''
    const min = Math.ceil(diff / 60000)
    return `${min} min`
  }

  if (passo === 'erro_link') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-lg font-semibold text-[#0A0A0A] mb-2">Link inválido</h1>
        <p className="text-sm text-[#6B6B6B]">Este link de avaliação não existe ou expirou.</p>
      </div>
    )
  }

  if (passo === 'sucesso') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-5">✅</p>
        <h1 className="text-xl font-semibold text-[#0A0A0A] mb-2">Avaliação enviada!</h1>
        <p className="text-sm text-[#6B6B6B] max-w-xs">
          Obrigado pela sua resposta. Suas respostas foram registradas com sucesso.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">SELETO</span>
          <span className="ml-3 text-sm text-[#6B6B6B]">· Avaliação Mensal</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8 pb-20">

        {/* Passo 0 — Identificação */}
        {passo === 0 && (
          <div>
            <h1 className="text-xl font-semibold text-[#0A0A0A] mb-1">Avaliação Mensal</h1>
            <p className="text-sm text-[#6B6B6B] mb-8">
              Identifique-se para acessar o formulário.
            </p>

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
                    onChange={(e) => setColaboradorId(e.target.value)}
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
                  className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors tracking-wider"
                  maxLength={14}
                />
                {erroCpf && (
                  <p className="text-xs text-red-600 mt-2">{erroCpf}</p>
                )}
                {tentativasRestantes !== null && tentativasRestantes > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {tentativasRestantes} tentativa{tentativasRestantes !== 1 ? 's' : ''} restante{tentativasRestantes !== 1 ? 's' : ''}.
                  </p>
                )}
                {bloqueadoAte && tempoRestante() && (
                  <p className="text-xs text-[#6B6B6B] mt-1">
                    Tente novamente em {tempoRestante()}.
                  </p>
                )}
              </div>
            )}

            {colaboradorId && (
              <button
                onClick={validarCpf}
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
        )}

        {/* Passo 1 — Formulário completo */}
        {passo === 1 && (() => {
          // Cargo: via dropdown (fluxo individual) ou query param (fluxo coletivo)
          const cargoEfetivo = colaboradores.find((c) => c.id === colaboradorId)?.cargo || cargoParam || 'vendedor'
          const isVendedor = cargoEfetivo === 'vendedor'
          return (
          <form onSubmit={enviarFormulario}>
            <h1 className="text-xl font-semibold text-[#0A0A0A] mb-1">Avaliação Mensal</h1>
            <p className="text-sm text-[#6B6B6B] mb-8">
              Responda com sinceridade. Suas respostas são confidenciais.
            </p>

            {/* ── Bloco 1 — Engajamento ── */}
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0A0A0A] text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Engajamento</h2>
              </div>

              <div className="space-y-6">
                <ScaleButtons
                  value={engPertencimento}
                  onChange={setEngPertencimento}
                  min={1}
                  max={5}
                  label={BLOCO_ENGAJAMENTO[0].descricao}
                />
                <ScaleButtons
                  value={engLongevidade}
                  onChange={setEngLongevidade}
                  min={1}
                  max={5}
                  label={BLOCO_ENGAJAMENTO[1].descricao}
                />
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">
                    O quanto você indicaria a SELETO como lugar pra trabalhar?
                  </p>
                  <p className="text-[11px] text-[#B0B0B0] mb-2">
                    0 = jamais recomendaria · 10 = recomendaria com certeza
                  </p>
                  <ScaleButtons
                    value={engEnps}
                    onChange={setEngEnps}
                    min={0}
                    max={10}
                  />
                </div>
              </div>
            </section>

            {/* ── Bloco 2 — Ambição ── */}
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0A0A0A] text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Ambição</h2>
              </div>

              {(() => {
                const cargo = colaboradores.find((c) => c.id === colaboradorId)?.cargo ?? 'vendedor'
                const opcoes =
                  BLOCO_AMBICAO_OBJETIVO.opcoesPorCargo[cargo] ??
                  BLOCO_AMBICAO_OBJETIVO.opcoesPorCargo['vendedor']
                return (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-3">
                    Qual é seu principal objetivo aqui nos próximos 3 meses?
                  </label>
                  <div className="space-y-2">
                    {opcoes.map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => setAmbObjetivo(op.valor)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          ambObjetivo === op.valor
                            ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                            : 'bg-white text-[#0A0A0A] border-[#E5E5E5] hover:border-[#0A0A0A]'
                        }`}
                      >
                        {op.texto}
                      </button>
                    ))}
                  </div>
                </div>

                <ScaleButtons
                  value={ambResponsabilidades}
                  onChange={setAmbResponsabilidades}
                  min={1}
                  max={5}
                  label={BLOCO_AMBICAO_ESCALAS[0].descricao}
                />

                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-2">
                    {BLOCO_AMBICAO_VISAO.label}
                  </label>
                  <textarea
                    rows={3}
                    value={ambVisao2anos}
                    onChange={(e) => setAmbVisao2anos(e.target.value)}
                    placeholder={BLOCO_AMBICAO_VISAO.placeholder}
                    className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
                  />
                </div>
              </div>
                )
              })()}
            </section>

            {/* ── Bloco 3 — Remuneração ── */}
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0A0A0A] text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Remuneração</h2>
              </div>

              <div className="space-y-6">
                <ScaleButtons
                  value={remJusta}
                  onChange={setRemJusta}
                  min={1}
                  max={5}
                  label={BLOCO_REMUNERACAO[0].descricao}
                />
                <ScaleButtons
                  value={remReconhecimento}
                  onChange={setRemReconhecimento}
                  min={1}
                  max={5}
                  label={BLOCO_REMUNERACAO[1].descricao}
                />
              </div>
            </section>

            {/* ── Bloco 4 — Perfil Situacional (somente vendedor) ── */}
            {isVendedor && (
            <section className="mb-10" id="bloco4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0A0A0A] text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Situações do dia a dia</h2>
              </div>
              <p className="text-xs text-[#6B6B6B] mb-6 pl-8">
                Para cada situação, escolha a opção que mais representa como você age. Todas as questões são obrigatórias.
              </p>

              <div className="space-y-8">
                {BLOCO_PERFIL.map((q, idx) => (
                  <div key={q.id}>
                    <p className="text-sm font-medium text-[#0A0A0A] mb-3">
                      <span className="text-[#6B6B6B] mr-1">{idx + 1}.</span>
                      {q.pergunta}
                    </p>
                    <div className="space-y-2">
                      {q.opcoes.map((op) => (
                        <button
                          key={op.letra}
                          type="button"
                          onClick={() => setRespostas((prev) => ({ ...prev, [q.id]: op.letra }))}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                            respostas[q.id] === op.letra
                              ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                              : 'bg-white text-[#0A0A0A] border-[#E5E5E5] hover:border-[#0A0A0A]'
                          }`}
                        >
                          {op.texto}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* ── Bloco 5 — Aberto ── */}
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0A0A0A] text-white text-xs font-bold rounded-full flex items-center justify-center">5</span>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Espaço livre</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-2">
                    {BLOCO_ABERTO[0].label}
                  </label>
                  <textarea
                    rows={3}
                    value={textoMelhoria}
                    onChange={(e) => setTextoMelhoria(e.target.value)}
                    placeholder={BLOCO_ABERTO[0].placeholder}
                    className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    {BLOCO_ABERTO[1].label}
                  </label>
                  <p className="text-[10px] text-[#B0B0B0] mb-2">
                    Só o gestor responsável e a administração têm acesso a esta resposta.
                  </p>
                  <textarea
                    rows={3}
                    value={textoGestor}
                    onChange={(e) => setTextoGestor(e.target.value)}
                    placeholder={BLOCO_ABERTO[1].placeholder}
                    className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
                  />
                </div>
              </div>
            </section>

            {erroEnvio && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-600">{erroEnvio}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-[#0A0A0A] text-white text-sm font-semibold py-4 rounded-xl hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {enviando ? 'Enviando…' : 'Enviar avaliação'}
            </button>

            <p className="text-[11px] text-[#B0B0B0] text-center mt-4">
              Suas respostas são tratadas com confidencialidade.
            </p>
          </form>
          )
        })()}
      </div>
    </div>
  )
}
