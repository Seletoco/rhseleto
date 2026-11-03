import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File | null

    if (!arquivo) return NextResponse.json({ error: 'arquivo required' }, { status: 400 })
    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      return NextResponse.json({ error: 'tipo_invalido' }, { status: 400 })
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'arquivo_grande' }, { status: 400 })
    }

    const ext = arquivo.name.split('.').pop()?.toLowerCase() || 'pdf'
    const nomeArquivo = `${crypto.randomUUID()}.${ext}`
    const buffer = await arquivo.arrayBuffer()

    const supabase = supabaseAdmin()
    const { error } = await supabase.storage
      .from('curriculos')
      .upload(nomeArquivo, buffer, { contentType: arquivo.type, upsert: false })

    if (error) {
      console.error('upload error:', error)
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('curriculos').getPublicUrl(nomeArquivo)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('upload-curriculo error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
