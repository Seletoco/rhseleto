# SELETO — Sistema de Recrutamento (rhseleto)

Plataforma de recrutamento e seleção da rede Seleto (4 lojas no RJ). Next.js (App Router) + TypeScript + Tailwind + Supabase + Vercel.
Leia `CONTEXTO_SELETO.md` (arquitetura, tabelas, rotas, regras) e `RESUMO_SESSAO.md` (estado da última sessão) antes de mexer.

## Regras do projeto
- **Nunca** coloque chave, token ou senha em arquivo versionado. Tudo vem de variáveis de ambiente (`.env.example` lista os nomes).
- Insert anônimo em `candidatos` sem `.select()`; gere o `id` com `crypto.randomUUID()` no cliente.
- Use `after()` (next/server) para tarefas em segundo plano no Vercel; `fetch` sem `await` é cancelado.
- CPF é verificado por **CPF + cargo** (código e banco: migration 034).
- Status `REPROVADO` sempre com `motivo_reprovacao` preenchido.
- `@googlemaps/js-api-loader` fica fixado em `1.16.8` (a v2 removeu a classe `Loader`).
- Migrations ficam em `supabase/migrations/` e são aplicadas pelo painel/CLI do Supabase. Só colunas novas ou índices; nada destrutivo sem aprovação.
- Deploy: pelo GitHub (Vercel conectado ao repositório). Mudanças vão por pull request, aprovadas pelo dono.

## Verificação antes de abrir PR
`npx tsc --noEmit` e `npm run lint` e `npm run build` (com variáveis de ambiente de teste).
