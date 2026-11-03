import { SupabaseClient } from '@supabase/supabase-js'

export type PerfilUsuario = {
  id: string
  role: 'master' | 'gestor'
  unidade: string | null
  nome: string | null
  email: string | null
  senha_visivel: string | null
}

export async function getPerfilUsuario(supabase: SupabaseClient): Promise<PerfilUsuario | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('perfis_usuario')
    .select('*')
    .eq('id', user.id)
    .single()

  return data ?? null
}
