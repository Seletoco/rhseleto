#!/usr/bin/env bash
# Copia o banco do rhseleto de um projeto Supabase para outro (estrutura + dados + usuários de login).
# Uso (no seu computador, com pg_dump/psql 17 e a CLI do Supabase instalados):
#   SOURCE_DB_URL='postgresql://...antigo...' TARGET_DB_URL='postgresql://...novo...' bash scripts/migrar-banco.sh
# As strings de conexão ficam SÓ no seu terminal (Supabase > Connect > "Session pooler"); nunca no repositório.
# Depois rode `node migrar-storage.mjs` (fotos e currículos) e troque as variáveis na Vercel.
set -euo pipefail
: "${SOURCE_DB_URL:?Faltou SOURCE_DB_URL (banco antigo)}"
: "${TARGET_DB_URL:?Faltou TARGET_DB_URL (banco novo)}"

echo "1/4 Estrutura: aplicando as migrations no banco novo…"
npx supabase db push --db-url "$TARGET_DB_URL"

echo "2/4 Usuários de login (auth.users e auth.identities)…"
pg_dump "$SOURCE_DB_URL" --data-only --no-owner --disable-triggers -t auth.users -t auth.identities | psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1

echo "3/4 Dados do sistema (schema public)…"
pg_dump "$SOURCE_DB_URL" --data-only --no-owner --disable-triggers --schema=public | psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1

echo "4/4 Conferência (linhas por tabela, antigo x novo)…"
for t in candidatos configuracoes perfis_usuario; do
  a=$(psql "$SOURCE_DB_URL" -Atc "select count(*) from public.$t")
  b=$(psql "$TARGET_DB_URL" -Atc "select count(*) from public.$t")
  echo "  $t: antigo=$a novo=$b"
done
echo "Pronto. Falta: node migrar-storage.mjs e trocar as variáveis na Vercel."
