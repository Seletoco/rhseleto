# RESUMO PARA NOVA CONVERSA — SELETO

## CONTEXTO
Continuar o desenvolvimento do sistema SELETO após sessão anterior.
Colar o arquivo CONTEXTO_SELETO.md completo junto com este resumo.

## O QUE FOI CONCLUÍDO NESSA SESSÃO

✅ Tela de seleção de cargo (/candidatura) com 3 cards dinâmicos
✅ Formulário Vendedor completo (Etapa 1 + 17 perguntas + score 5 dimensões + 5 perfis)
✅ Formulário Caixa (Etapa 1 + campos específicos + toggle sazonal)
✅ CPF como identificador único por cargo
✅ SessionStorage em todos os formulários
✅ Aviso "Antes de começar" na prova do gerente (20 minutos)
✅ Google Places Autocomplete (PlaceAutocompleteElement) nos 3 formulários
✅ Score por dimensão com barra colorida gradiente + contribuição calculada
✅ Status unificado REPROVADO com campo motivo_reprovacao
✅ after() corrigindo fire-and-forget da IA de perfil no Vercel
✅ VT por município dinâmico com tarifas configuráveis no admin
✅ Alerta de pretensão salarial acima do teto configurável
✅ Feedback do candidato visível no painel admin
✅ Botão "Permitir nova candidatura" com snapshot em historico_anterior
✅ Modal de convocação com botão "Abrir no Gmail" (mailto pré-preenchido)
✅ Filtros de cargo na lista, Kanban e dashboard
✅ Seção "Por Cargo" no dashboard master
✅ Kanban: confirmação ao mover reprovado + status padrão ao mover esquerda
✅ Configurações master: tarifas + tetos salariais + toggle caixa
✅ Formulário gerente reformulado: cards múltipla escolha + perfil_gerente
✅ Cases reduzidos para 5 + instrução anti-genérico nas dissertativas
✅ Mensagens /obrigado padronizadas por status
✅ Endereço e feedback visíveis no painel admin
✅ turno_faculdade condicional (faculdade em andamento)
✅ Ensino Médio Incompleto: reprovação silenciosa
✅ Campo email em todos os formulários
✅ logistica_por_unidade em JSON estruturado por loja
✅ Pergunta situacao_loja_baguncada no formulário vendedor

## O QUE PRECISA SER FEITO NA PRÓXIMA SESSÃO

### PRIORIDADE 1 — Testes e validações (executar em ordem)

1. Verificar after() com candidato real novo
   - Submeter formulário gerente completo
   - Verificar se ia_analisado_em foi preenchido automaticamente no banco após ~30s

2. Testar formulário Vendedor completo
   - CPF duplicado por cargo não bloqueia candidato de outro cargo
   - 17 perguntas aparecem na ordem correta
   - P12 abre campo de restrição ao marcar "Tenho restrições de horário"
   - Score e perfil_vendedor calculados corretamente
   - IA de perfil roda e preenche campos ia_* no banco
   - Redirect para /obrigado com card de feedback

3. Testar formulário Caixa completo
   - Campo descricao_experiencia_caixa aparece se qualquer campo = "Sim"
   - Polling de logística funciona
   - Aprovado → /obrigado padrão
   - Reprovado → /obrigado?tipo=logistica_reprovado
   - Ensino Médio Incompleto → reprovação silenciosa

4. Testar toggle de vaga Caixa
   - Admin master → /admin/configuracoes → toggle Operador de Caixa → ligar
   - Acessar /candidatura → card Caixa aparece ativo
   - Desligar → card volta para "Em breve"

5. Testar pretensão salarial acima do teto
   - Submeter candidato gerente com pretensão R$ 15.000
   - Verificar badge "⚠️ Acima do esperado" no admin

6. Testar tarifas configuráveis
   - Alterar tarifa Nova Iguaçu para R$ 7,00 no admin
   - Submeter candidato de Nova Iguaçu
   - Verificar se VT usa nova tarifa

7. Atualizar aviso de tempo na prova do gerente
   - Cronometrar teste real
   - Alterar texto em app/avaliacao/[token]/page.tsx

## REGRAS TÉCNICAS IMPORTANTES
(ver CONTEXTO_SELETO.md completo para detalhes)

- Stack: Next.js 15 + TypeScript + Tailwind + Supabase + Vercel
- Insert anônimo sem .select() — usar crypto.randomUUID() client-side
- after() para fire-and-forget no Vercel (não fetch sem await)
- CPF verificar por CPF + cargo (não só CPF)
- Places API (New) obrigatória para PlaceAutocompleteElement
- Status REPROVADO sempre com motivo_reprovacao preenchido
- Deploy: npx vercel --prod
- Migration: SUPABASE_ACCESS_TOKEN=<TOKEN_SUPABASE_REMOVIDO> npx supabase db push

## URLS DO PROJETO
- Produção: https://seleto-two.vercel.app
- Formulário: https://seleto-two.vercel.app/candidatura
- Admin: https://seleto-two.vercel.app/admin/candidatos
- Projeto Mac: /Users/adrielhenrique/Desktop/seleto
- Supabase: https://zgnyrjaekydwlsvxtfxo.supabase.co

Cole este resumo + o CONTEXTO_SELETO.md atualizado no início da nova conversa.
