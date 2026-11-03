import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Variáveis de ambiente não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@seleto.com.br'
  const password = process.env.ADMIN_PASSWORD
  if (!password) { console.error('Defina ADMIN_PASSWORD (ex.: ADMIN_PASSWORD=... npx tsx scripts/criar-admin.ts)'); process.exit(1) }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`Usuário ${email} já existe.`)
    } else {
      console.error('Erro:', error.message)
      process.exit(1)
    }
    return
  }

  console.log(`✓ Admin criado: ${data.user.email} (id: ${data.user.id})`)
}

main()
