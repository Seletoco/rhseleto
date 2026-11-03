'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos')
      setCarregando(false)
      return
    }

    router.push('/admin/candidatos')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <p className="text-[11px] font-semibold text-[#6B6B6B] tracking-[0.18em] uppercase mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">SELETO</h1>
          <p className="mt-1.5 text-sm text-[#6B6B6B]">Acesso restrito.</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@seleto.com.br"
              className="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#0A0A0A] transition-colors bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#0A0A0A] transition-colors bg-white"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-500">{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-3.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
