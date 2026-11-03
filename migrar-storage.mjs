// =========================================================
// MIGRAÇÃO SELETO — Storage (fotos + curriculos)
// Supabase PRO -> Supabase FREE
// =========================================================

import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = process.env.SOURCE_URL
const SOURCE_SERVICE_KEY = process.env.SOURCE_SERVICE_KEY

const TARGET_URL = process.env.TARGET_URL
const TARGET_SERVICE_KEY = process.env.TARGET_SERVICE_KEY

for (const v of ['SOURCE_URL', 'SOURCE_SERVICE_KEY', 'TARGET_URL', 'TARGET_SERVICE_KEY']) {
  if (!process.env[v]) { console.error(`Faltou a variável de ambiente ${v}.`); process.exit(1) }
}

const source = createClient(SOURCE_URL, SOURCE_SERVICE_KEY)
const target = createClient(TARGET_URL, TARGET_SERVICE_KEY)

const BUCKETS = [
  { name: 'fotos', public: true },
  { name: 'curriculos', public: true },
]

async function listarTodosArquivos(client, bucket, prefix = '') {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw error
  let arquivos = []
  for (const item of data) {
    if (item.id === null) {
      const subPrefix = prefix ? `${prefix}/${item.name}` : item.name
      arquivos = arquivos.concat(await listarTodosArquivos(client, bucket, subPrefix))
    } else {
      arquivos.push(prefix ? `${prefix}/${item.name}` : item.name)
    }
  }
  return arquivos
}

async function migrarBucket({ name: bucket, public: isPublic }) {
  console.log(`\n==> Migrando bucket: ${bucket}`)

  const { error: createError } = await target.storage.createBucket(bucket, { public: isPublic })
  if (createError && !String(createError.message).includes('already exists')) {
    console.error('Erro ao criar bucket no destino:', createError.message)
  }

  const arquivos = await listarTodosArquivos(source, bucket)
  console.log(`Encontrados ${arquivos.length} arquivos em '${bucket}'.`)

  let ok = 0
  let falhas = 0
  for (const caminho of arquivos) {
    try {
      const { data: blob, error: downloadError } = await source.storage.from(bucket).download(caminho)
      if (downloadError) throw downloadError

      const arrayBuffer = await blob.arrayBuffer()
      const { error: uploadError } = await target.storage
        .from(bucket)
        .upload(caminho, Buffer.from(arrayBuffer), { upsert: true, contentType: blob.type })
      if (uploadError) throw uploadError

      ok++
      process.stdout.write(`\rOK: ${ok}/${arquivos.length}`)
    } catch (e) {
      falhas++
      console.error(`\nFalhou: ${caminho} —`, e.message || e)
    }
  }
  console.log(`\nBucket '${bucket}' concluído: ${ok} ok, ${falhas} falhas.`)
}

for (const bucket of BUCKETS) {
  await migrarBucket(bucket)
}

console.log('\n✅ Migração de Storage concluída.')
