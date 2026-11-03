'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CARGOS_BASE = [
  {
    slug: 'gerente',
    titulo: 'Gerente de Loja',
    descricao: 'Liderança de equipe, gestão de metas e operação completa da loja.',
    icone: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20H7a2 2 0 01-2-2v-1a5 5 0 015-5h4a5 5 0 015 5v1a2 2 0 01-2 2zM12 11a4 4 0 100-8 4 4 0 000 8z"/>
      </svg>
    ),
    semprativo: true,
  },
  {
    slug: 'vendedor',
    titulo: 'Vendedor',
    descricao: 'Atendimento ao cliente, negociação e fechamento de vendas.',
    icone: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
      </svg>
    ),
    semprativo: true,
  },
  {
    slug: 'caixa',
    titulo: 'Operador de Caixa',
    descricao: 'Operação de caixa, controle de pagamentos e atendimento.',
    icone: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h.01M11 15h2M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"/>
      </svg>
    ),
    semprativo: false,
  },
]

export default function CandidaturaPage() {
  const router = useRouter()
  const [caixaAtiva, setCaixaAtiva] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/configuracoes?chave=vaga_caixa_ativa')
      .then(r => r.json())
      .then(d => { setCaixaAtiva(d.valor === 'true') })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const cargos = CARGOS_BASE.map(c => ({
    ...c,
    ativo: c.semprativo || (c.slug === 'caixa' && !carregando && caixaAtiva),
  }))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="px-5 py-4 flex items-center justify-between">
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

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[480px]">
          <h1 className="text-[22px] font-semibold text-[#0A0A0A]">
            Qual vaga você está buscando?
          </h1>
          <p className="text-sm text-[#888] mt-1 mb-8">
            Escolha o cargo que melhor descreve sua candidatura.
          </p>

          <div className="flex flex-col gap-3">
            {cargos.map((cargo) => (
              <button
                key={cargo.slug}
                onClick={() => cargo.ativo && router.push(`/candidatura/${cargo.slug}`)}
                disabled={!cargo.ativo}
                className={`w-full text-left border rounded-xl p-5 flex items-center gap-4 transition-colors ${
                  cargo.ativo
                    ? 'border-[#F0F0F0] cursor-pointer hover:border-[#0A0A0A]'
                    : 'border-[#F0F0F0] opacity-60 cursor-default hover:border-[#F0F0F0]'
                }`}
              >
                <div className="w-10 h-10 bg-[#F7F7F7] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[#0A0A0A]">
                  {cargo.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#0A0A0A]">
                      {cargo.titulo}
                    </span>
                    {cargo.ativo ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        Aberto
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#999]">
                        Em breve
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888] mt-0.5">{cargo.descricao}</p>
                </div>
                {cargo.ativo && (
                  <span className="text-[#CCCCCC] ml-auto text-lg flex-shrink-0">›</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-[11px] text-[#CCCCCC]">Seleto · Est. 2018 · Rio de Janeiro</p>
      </footer>
    </div>
  )
}
