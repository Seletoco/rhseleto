import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida o JWT no servidor — não confiar só em getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/admin/login'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/candidatos'
    return NextResponse.redirect(url)
  }

  // Adicionar role e unidade como headers para as páginas admin
  if (user && isAdminRoute && !isLoginPage) {
    const { data: perfil } = await supabase
      .from('perfis_usuario')
      .select('role, unidade')
      .eq('id', user.id)
      .single()

    if (perfil) {
      supabaseResponse.headers.set('x-user-role', perfil.role)
      if (perfil.unidade) supabaseResponse.headers.set('x-user-unidade', perfil.unidade)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
