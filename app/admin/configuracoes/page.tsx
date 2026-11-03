'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getPerfilUsuario, type PerfilUsuario } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type PerfilRow = {
  id: string
  role: string
  unidade: string | null
  nome: string | null
  email: string | null
  senha_visivel: string | null
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [perfis, setPerfis] = useState<PerfilRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ id: string; texto: string } | null>(null)
  const [caixaAtiva, setCaixaAtiva] = useState(false)
  const [salvandoVaga, setSalvandoVaga] = useState(false)
  const [msgVaga, setMsgVaga] = useState<string | null>(null)
  const [cfgValues, setCfgValues] = useState<Record<string, string>>({})
  const [cfgEditando, setCfgEditando] = useState<Record<string, string>>({})
  const [cfgSalvando, setCfgSalvando] = useState<string | null>(null)
  const [cfgMsg, setCfgMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    async function carregar() {
      const p = await getPerfilUsuario(supabase)
      setPerfil(p)

      if (p?.role !== 'master') {
        router.replace('/admin/candidatos')
        return
      }

      const { data } = await supabase
        .from('perfis_usuario')
        .select('*')
        .order('role', { ascending: false })

      if (data) setPerfis(data)

      const cfgRes = await fetch('/api/configuracoes?chave=vaga_caixa_ativa')
      const cfg = await cfgRes.json()
      setCaixaAtiva(cfg.valor === 'true')

      const cfgChaves = [
        'tarifa_rio_de_janeiro', 'tarifa_nova_iguacu', 'tarifa_padrao',
        'salario_max_gerente', 'salario_max_vendedor', 'salario_max_caixa',
        'email_taquara', 'email_aerotown', 'email_americas', 'email_nova_iguacu',
      ]
      const cfgMultiRes = await fetch(`/api/configuracoes?chaves=${cfgChaves.join(',')}`)
      const cfgMulti = await cfgMultiRes.json()
      if (Array.isArray(cfgMulti)) {
        const vals: Record<string, string> = {}
        for (const row of cfgMulti) vals[row.chave] = row.valor
        setCfgValues(vals)
      }

      setCarregando(false)
    }
    carregar()
  }, [])

  async function toggleVagaCaixa() {
    const novoValor = !caixaAtiva
    setSalvandoVaga(true)
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'vaga_caixa_ativa', valor: novoValor ? 'true' : 'false' }),
    })
    setSalvandoVaga(false)
    if (res.ok) {
      setCaixaAtiva(novoValor)
      setMsgVaga(novoValor ? 'Vaga ativada' : 'Vaga desativada')
      setTimeout(() => setMsgVaga(null), 2000)
    }
  }

  async function salvarSenha(id: string) {
    const novaSenha = editando[id]
    if (!novaSenha?.trim()) return
    setSalvando(id)

    // Atualizar senha_visivel na tabela perfis_usuario
    const { error } = await supabase
      .from('perfis_usuario')
      .update({ senha_visivel: novaSenha.trim() })
      .eq('id', id)

    setSalvando(null)
    if (!error) {
      setPerfis((prev) =>
        prev.map((p) => (p.id === id ? { ...p, senha_visivel: novaSenha.trim() } : p))
      )
      setEditando((prev) => { const next = { ...prev }; delete next[id]; return next })
      setMensagem({ id, texto: 'Salvo!' })
      setTimeout(() => setMensagem(null), 2000)
    } else {
      setMensagem({ id, texto: 'Erro ao salvar.' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  async function salvarCfg(chave: string) {
    const valor = cfgEditando[chave]
    if (valor === undefined || valor.trim() === '') return
    setCfgSalvando(chave)
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave, valor: valor.trim() }),
    })
    setCfgSalvando(null)
    if (res.ok) {
      setCfgValues(prev => ({ ...prev, [chave]: valor.trim() }))
      setCfgEditando(prev => { const n = { ...prev }; delete n[chave]; return n })
      setCfgMsg(prev => ({ ...prev, [chave]: 'Salvo!' }))
      setTimeout(() => setCfgMsg(prev => { const n = { ...prev }; delete n[chave]; return n }), 2000)
    } else {
      setCfgMsg(prev => ({ ...prev, [chave]: 'Erro ao salvar.' }))
      setTimeout(() => setCfgMsg(prev => { const n = { ...prev }; delete n[chave]; return n }), 3000)
    }
  }

  async function salvarEmail(chave: string) {
    const valor = cfgEditando[chave]?.trim() ?? ''
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
    if (!emailValido) {
      setCfgMsg(prev => ({ ...prev, [chave]: 'Email inválido.' }))
      setTimeout(() => setCfgMsg(prev => { const n = { ...prev }; delete n[chave]; return n }), 3000)
      return
    }
    await salvarCfg(chave)
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

  const gestores = perfis.filter((p) => p.role === 'gestor')

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0A0A0A] tracking-[0.15em] uppercase">
            SELETO
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/candidatos"
              className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Candidatos
            </Link>
            <button
              onClick={sair}
              className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-16">
        <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight mb-8">
          Configurações
        </h1>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">
            Vagas Ativas
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-4">Controle quais vagas estão abertas para candidatura.</p>
          <div className="border border-[#E5E5E5] rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">Operador de Caixa</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Vaga sazonal — ative apenas quando houver necessidade de contratação</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {msgVaga && (
                  <span className={`text-xs ${caixaAtiva ? 'text-green-600' : 'text-[#6B6B6B]'}`}>{msgVaga}</span>
                )}
                <button
                  type="button"
                  onClick={toggleVagaCaixa}
                  disabled={salvandoVaga}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    caixaAtiva ? 'bg-[#0A0A0A]' : 'bg-[#D0D0D0]'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    caixaAtiva ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifas de Passagem */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">
            Tarifas de Passagem
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-4">Valor unitário da passagem por município, usado no cálculo de VT mensal.</p>
          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            {[
              { chave: 'tarifa_rio_de_janeiro', label: 'Rio de Janeiro', desc: 'Taquara, Aerotown, Américas' },
              { chave: 'tarifa_nova_iguacu', label: 'Nova Iguaçu', desc: 'Loja Nova Iguaçu' },
              { chave: 'tarifa_padrao', label: 'Tarifa padrão', desc: 'Fallback quando município não identificado' },
            ].map(({ chave, label, desc }, i, arr) => {
              const emEdicao = cfgEditando[chave] !== undefined
              const msg = cfgMsg[chave]
              return (
                <div key={chave} className={`flex items-center justify-between gap-4 px-5 py-4 bg-white ${i < arr.length - 1 ? 'border-b border-[#E5E5E5]' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {emEdicao ? (
                      <>
                        <input
                          type="text"
                          value={cfgEditando[chave]}
                          onChange={e => setCfgEditando(prev => ({ ...prev, [chave]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && salvarCfg(chave)}
                          className="border border-[#E5E5E5] rounded px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] w-24"
                          autoFocus
                          placeholder="Ex: 5.00"
                        />
                        <button
                          onClick={() => salvarCfg(chave)}
                          disabled={cfgSalvando === chave}
                          className="text-xs font-medium text-white bg-[#0A0A0A] px-3 py-1.5 rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {cfgSalvando === chave ? '…' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setCfgEditando(prev => { const n = { ...prev }; delete n[chave]; return n })}
                          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono text-[#0A0A0A]">R$ {cfgValues[chave] ?? '—'}</span>
                        <button
                          onClick={() => setCfgEditando(prev => ({ ...prev, [chave]: cfgValues[chave] ?? '' }))}
                          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors underline underline-offset-2"
                        >
                          Editar
                        </button>
                      </>
                    )}
                    {msg && (
                      <span className={`text-xs ${msg === 'Salvo!' ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Teto de Pretensão Salarial */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">
            Teto de Pretensão Salarial
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-4">Valor máximo aceitável de pretensão por cargo. Candidatos acima do teto recebem alerta.</p>
          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            {[
              { chave: 'salario_max_gerente', label: 'Gerente de Loja' },
              { chave: 'salario_max_vendedor', label: 'Vendedor(a)' },
              { chave: 'salario_max_caixa', label: 'Operador(a) de Caixa' },
            ].map(({ chave, label }, i, arr) => {
              const emEdicao = cfgEditando[chave] !== undefined
              const msg = cfgMsg[chave]
              return (
                <div key={chave} className={`flex items-center justify-between gap-4 px-5 py-4 bg-white ${i < arr.length - 1 ? 'border-b border-[#E5E5E5]' : ''}`}>
                  <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {emEdicao ? (
                      <>
                        <input
                          type="text"
                          value={cfgEditando[chave]}
                          onChange={e => setCfgEditando(prev => ({ ...prev, [chave]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && salvarCfg(chave)}
                          className="border border-[#E5E5E5] rounded px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] w-28"
                          autoFocus
                          placeholder="Ex: 4000"
                        />
                        <button
                          onClick={() => salvarCfg(chave)}
                          disabled={cfgSalvando === chave}
                          className="text-xs font-medium text-white bg-[#0A0A0A] px-3 py-1.5 rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {cfgSalvando === chave ? '…' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setCfgEditando(prev => { const n = { ...prev }; delete n[chave]; return n })}
                          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono text-[#0A0A0A]">R$ {cfgValues[chave] ?? '—'}</span>
                        <button
                          onClick={() => setCfgEditando(prev => ({ ...prev, [chave]: cfgValues[chave] ?? '' }))}
                          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors underline underline-offset-2"
                        >
                          Editar
                        </button>
                      </>
                    )}
                    {msg && (
                      <span className={`text-xs ${msg === 'Salvo!' ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Emails por Unidade */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">
            Emails por Unidade
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-4">Emails usados no envio de convocações por unidade.</p>
          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            {[
              { chave: 'email_taquara',    label: 'Taquara' },
              { chave: 'email_aerotown',   label: 'Aerotown' },
              { chave: 'email_americas',   label: 'Américas' },
              { chave: 'email_nova_iguacu',label: 'Nova Iguaçu' },
            ].map(({ chave, label }, i, arr) => {
              const emEdicao = cfgEditando[chave] !== undefined
              const msg = cfgMsg[chave]
              const isError = msg && msg !== 'Salvo!'
              return (
                <div key={chave} className={`flex items-center justify-between gap-4 px-5 py-4 bg-white ${i < arr.length - 1 ? 'border-b border-[#E5E5E5]' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
                    {!emEdicao && (
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{cfgValues[chave] ?? '—'}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {emEdicao ? (
                      <>
                        <input
                          type="email"
                          value={cfgEditando[chave]}
                          onChange={e => setCfgEditando(prev => ({ ...prev, [chave]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && salvarEmail(chave)}
                          className={`border rounded px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none w-56 ${
                            isError ? 'border-red-400 focus:border-red-500' : 'border-[#E5E5E5] focus:border-[#0A0A0A]'
                          }`}
                          autoFocus
                          placeholder="email@exemplo.com"
                        />
                        <button
                          onClick={() => salvarEmail(chave)}
                          disabled={cfgSalvando === chave}
                          className="text-xs font-medium text-white bg-[#0A0A0A] px-3 py-1.5 rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {cfgSalvando === chave ? '…' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => {
                            setCfgEditando(prev => { const n = { ...prev }; delete n[chave]; return n })
                            setCfgMsg(prev => { const n = { ...prev }; delete n[chave]; return n })
                          }}
                          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setCfgEditando(prev => ({ ...prev, [chave]: cfgValues[chave] ?? '' }))}
                        className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors underline underline-offset-2"
                      >
                        Editar
                      </button>
                    )}
                    {msg && (
                      <span className={`text-xs ${isError ? 'text-red-500' : 'text-green-600'}`}>{msg}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider mb-4">
            Gestores de Loja
          </h2>

          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                  {['Nome', 'Email', 'Unidade', 'Senha'].map((col) => (
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
                {gestores.map((g) => {
                  const emEdicao = editando[g.id] !== undefined
                  const msg = mensagem?.id === g.id ? mensagem.texto : null

                  return (
                    <tr
                      key={g.id}
                      className="border-b border-[#E5E5E5] last:border-0 bg-white"
                    >
                      <td className="px-5 py-4 font-medium text-[#0A0A0A] whitespace-nowrap">
                        {g.nome ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-[#6B6B6B] whitespace-nowrap">
                        {g.email ?? '—'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {g.unidade ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-[#E5E5E5] text-[#6B6B6B]">
                            {g.unidade}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {emEdicao ? (
                            <>
                              <input
                                type="text"
                                value={editando[g.id]}
                                onChange={(e) =>
                                  setEditando((prev) => ({ ...prev, [g.id]: e.target.value }))
                                }
                                onKeyDown={(e) => e.key === 'Enter' && salvarSenha(g.id)}
                                className="border border-[#E5E5E5] rounded px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] w-40"
                                autoFocus
                                placeholder="Nova senha"
                              />
                              <button
                                onClick={() => salvarSenha(g.id)}
                                disabled={salvando === g.id}
                                className="text-xs font-medium text-white bg-[#0A0A0A] px-3 py-1.5 rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                              >
                                {salvando === g.id ? '…' : 'Salvar'}
                              </button>
                              <button
                                onClick={() =>
                                  setEditando((prev) => { const n = { ...prev }; delete n[g.id]; return n })
                                }
                                className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[#6B6B6B] font-mono text-xs">
                                {g.senha_visivel ? g.senha_visivel : '—'}
                              </span>
                              <button
                                onClick={() =>
                                  setEditando((prev) => ({ ...prev, [g.id]: g.senha_visivel ?? '' }))
                                }
                                className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors underline underline-offset-2"
                              >
                                Editar
                              </button>
                            </>
                          )}
                          {msg && (
                            <span className={`text-xs ${msg === 'Salvo!' ? 'text-green-600' : 'text-red-500'}`}>
                              {msg}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
