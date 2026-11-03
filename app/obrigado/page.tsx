'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function FeedbackCard({ candidatoId }: { candidatoId: string | null }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'concluido'>('idle')

  if (estado === 'concluido') {
    return (
      <p className="text-sm text-[#6B6B6B] mt-8">Obrigado pelo feedback!</p>
    )
  }

  async function enviar() {
    if (!candidatoId || !texto.trim()) return
    setEstado('enviando')
    try {
      await fetch('/api/salvar-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidato_id: candidatoId, feedback: texto.trim() }),
      })
    } catch {}
    setEstado('concluido')
  }

  return (
    <div className="mt-6 bg-[#F8F8F8] rounded-xl p-5 text-left">
      <label className="block text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1.5">
        Nos ajude a melhorar
      </label>
      <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
        Teve alguma dificuldade para responder algum campo? Sua opinião é opcional mas muito valiosa.
      </p>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value.slice(0, 500))}
        placeholder="Ex: a pergunta sobre X foi confusa porque..."
        rows={3}
        className="w-full border border-[#EEE] rounded-lg px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-colors resize-none bg-white"
      />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-xs text-[#CCCCCC]">{texto.length}/500</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={enviar}
          disabled={!texto.trim() || estado === 'enviando'}
          className="px-4 py-2.5 text-sm font-medium bg-[#0A0A0A] text-white rounded-[10px] hover:bg-[#333] transition-colors disabled:opacity-40"
        >
          {estado === 'enviando' ? 'Enviando...' : 'Enviar feedback'}
        </button>
        <button
          onClick={() => setEstado('concluido')}
          className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
        >
          Pular
        </button>
      </div>
    </div>
  )
}

function ObrigadoConteudo() {
  const params = useSearchParams()
  const tipo = params.get('tipo')
  const candidatoId = params.get('id')

  if (tipo === 'logistica_reprovado') {
    return (
      <div className="max-w-[440px] w-full">
        <div className="w-14 h-14 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="#0A0A0A" strokeWidth="1.5"/>
            <path d="M12 8v4m0 4h.01" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[#0A0A0A] text-center mb-2">
          Obrigado pelo seu interesse na SELETO!
        </h1>
        <p className="text-sm text-[#888] text-center mb-8">
          Recebemos seus dados. Nossa equipe entrará em contato em breve.
        </p>
        <FeedbackCard candidatoId={candidatoId} />
      </div>
    )
  }

  return (
    <div className="max-w-[440px] w-full">
      <div className="w-14 h-14 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
          <path d="M1 8L7.5 14.5L21 1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-[#0A0A0A] text-center mb-2">
        Candidatura recebida!
      </h1>
      <p className="text-sm text-[#888] text-center mb-8">
        Nossa equipe analisará seu perfil e entrará em contato em breve.
      </p>
      <FeedbackCard candidatoId={candidatoId} />
    </div>
  )
}

export default function ObrigadoPage() {
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
        <Suspense>
          <ObrigadoConteudo />
        </Suspense>
      </div>
      <footer className="py-6 text-center">
        <p className="text-[11px] text-[#CCCCCC]">Seleto · Est. 2020 · Rio de Janeiro</p>
      </footer>
    </div>
  )
}
