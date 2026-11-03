# CONTEXTO SELETO

Documento de referência completo para o projeto. Suficiente para iniciar qualquer sessão sem perguntas adicionais.

---

## 1. O QUE É O PROJETO

**Seleto** é uma plataforma de recrutamento e seleção para a rede Seleto (varejo). O sistema cobre três cargos e tem quatro componentes principais:

**Cargos e fluxos:**
- **Gerente de Loja** — Formulário Etapa 1 (dados pessoais + logística) → análise IA logística → Etapa 2 (prova comportamental, link por token) → análise IA de perfil → entrevista presencial
- **Vendedor** — Formulário único: Etapa 1 (dados pessoais + logística) + 17 perguntas objetivas + 2 abertas → score 5 dimensões + análise IA → resultado imediato
- **Operador de Caixa** — Formulário único: Etapa 1 (dados pessoais + logística) + campos específicos PDV → análise IA logística → resultado imediato. Vaga sazonal com toggle no admin.

**Componentes:**
1. **Formulários públicos** — `/candidatura` (seleção de cargo) + `/candidatura/gerente`, `/candidatura/vendedor`, `/candidatura/caixa`
2. **Formulário de avaliação** — `/avaliacao/[token]` — Etapa 2 do gerente (prova comportamental, 7 seções)
3. **Painel administrativo** — `/admin` — master e gestores de loja: lista, perfil, convocação, entrevista, dashboard
4. **Tela de confirmação** — `/obrigado` — mensagem verde (aprovado) ou cinza (reprovado logístico)

---

## 2. STACK TÉCNICA

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| React | 19.2.4 |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 |
| Banco/Auth/Storage | Supabase (PostgreSQL + Auth + Storage) |
| IA | Anthropic SDK — modelo `claude-haiku-4-5` |
| Deploy | Vercel (produção via CLI) |
| Runtime | Node.js serverless (Vercel) |

### Dependências principais
```
@supabase/ssr ^0.10.3           — cliente server-side para middleware
@supabase/supabase-js ^2.105.4  — cliente browser/admin
@anthropic-ai/sdk ^0.95.2       — integração com Claude Haiku
@googlemaps/js-api-loader 1.16.8 — (PINADO exato) PlaceAutocompleteElement nos formulários
@hello-pangea/dnd ^18.0.1       — drag-and-drop no Kanban do admin
next 16.2.6
```

**Nota sobre js-api-loader**: versão pinada em `1.16.8` (exata, sem ^). v2.0.2+ removeu a classe `Loader`. Nunca atualizar sem verificar breaking changes.

---

## 3. URLs E ACESSOS

### Produção
- **URL pública**: https://seleto-two.vercel.app
- **Seleção de cargo**: https://seleto-two.vercel.app/candidatura
- **Formulário gerente**: https://seleto-two.vercel.app/candidatura/gerente
- **Formulário vendedor**: https://seleto-two.vercel.app/candidatura/vendedor
- **Formulário caixa**: https://seleto-two.vercel.app/candidatura/caixa
- **Formulário avaliação**: https://seleto-two.vercel.app/avaliacao/[token]
- **Painel admin**: https://seleto-two.vercel.app/admin/candidatos
- **Dashboard**: https://seleto-two.vercel.app/admin/dashboard
- **Login admin**: https://seleto-two.vercel.app/admin/login

### Supabase
- **Project ref**: `zgnyrjaekydwlsvxtfxo`
- **URL**: `https://zgnyrjaekydwlsvxtfxo.supabase.co`
- **Imagens storage**: `zgnyrjaekydwlsvxtfxo.supabase.co/storage/v1/object/public/**`

### Variáveis de ambiente (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL       — URL pública do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY  — chave anon (browser)
SUPABASE_SERVICE_ROLE_KEY      — chave service role (só server-side/API routes)
ANTHROPIC_API_KEY              — chave Claude Haiku
GOOGLE_MAPS_API_KEY            — Routes API v2 (server-side, analisar-logistica)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — mesma chave (browser, Places API nos formulários)
RESEND_API_KEY                 — re_placeholder (email de convocação pendente)
```

### Logins administrativos
| Email | Senha | Role | Unidade | UUID |
|-------|-------|------|---------|------|
| admin@seleto.com.br | <senha no gerenciador de senhas> | master | — | `26f68bf6-9f9b-489a-8a7b-dc8e9fff7aa7` |
| admin@seleto-tqr.com | <senha no gerenciador de senhas> | gestor | Taquara | `a297251f-fd9e-4aeb-ac52-93e07e5e822c` |
| admin@seleto-aero.com | <senha no gerenciador de senhas> | gestor | Aerotown | `b53ee9ba-6402-48d4-9e9e-d9745a6527b3` |
| admin@seleto-ame.com | <senha no gerenciador de senhas> | gestor | Americas | `e07d3dde-0898-4b95-bed9-5e6bbf24290b` |
| admin@seleto-nig.com | <senha no gerenciador de senhas> | gestor | Nova Iguaçu | `27f06c6a-cbeb-4113-8283-027d530dbdc3` |

---

## 4. ESTRUTURA DE PASTAS

```
seleto/
├── app/
│   ├── layout.tsx                              — layout raiz (Inter font, bg-white)
│   ├── globals.css                             — estilos globais: gmp-place-autocomplete, .pac-container
│   ├── page.tsx                                — redireciona para /candidatura
│   ├── candidatura/
│   │   ├── page.tsx                            — seleção de cargo: 3 cards (Gerente/Vendedor/Caixa)
│   │   │                                         Caixa aparece "Em breve" se vaga_caixa_ativa=false
│   │   ├── gerente/page.tsx                    — Etapa 1 gerente: dados pessoais + logística (Etapa 1 de 3)
│   │   ├── vendedor/page.tsx                   — Etapa 1+2 vendedor: dados + 17 perguntas + 2 abertas (submit único)
│   │   └── caixa/page.tsx                      — Etapa 1 caixa: dados pessoais + campos PDV
│   ├── avaliacao/
│   │   └── [token]/
│   │       └── page.tsx                        — Etapa 2 gerente: prova comportamental (Etapa 2 de 3)
│   ├── obrigado/
│   │   └── page.tsx                            — verde "Candidatura recebida" ou cinza "Obrigado pelo interesse"
│   ├── admin/
│   │   ├── login/page.tsx                      — login com email/senha
│   │   ├── candidatos/
│   │   │   ├── page.tsx                        — lista + kanban, filtros: cargo/unidade/perfil/status/etapa
│   │   │   └── [id]/page.tsx                   — perfil completo: score com barras, IA, entrevista, resultado
│   │   ├── dashboard/
│   │   │   └── page.tsx                        — funil, alertas, por unidade, por cargo, top candidatos
│   │   └── configuracoes/
│   │       └── page.tsx                        — gestores + toggle caixa + tarifas VT + tetos salariais
│   └── api/
│       ├── analisar-candidato/route.ts         — POST { candidato_id } → IA perfil Claude Haiku + status
│       ├── analisar-logistica/route.ts         — POST { candidato_id } → Routes API + IA logística + tarifas dinâmicas
│       ├── agendar-entrevista/route.ts         — POST campos → entrevista_* + ENTREVISTA_AGENDADA
│       ├── atualizar-etapa1/route.ts           — POST { candidato_id, ...campos } → UPDATE candidato existente
│       ├── buscar-candidato-por-token/route.ts — GET ?token=UUID → { encontrado, id, nome, ja_usado }
│       ├── configuracoes/route.ts              — GET ?chave= ou ?chaves= / POST { chave, valor }
│       ├── confirmar-presenca/route.ts         — POST { candidato_id, confirmou } → CONFIRMADA ou CANCELADA
│       ├── dashboard/route.ts                  — GET → funil, alertas, por_unidade, por_cargo, top_candidatos, vendedores_ativos
│       ├── finalizar-avaliacao/route.ts        — POST campos → score + status + after() → analisar-candidato
│       ├── iniciar-avaliacao/route.ts          — POST { token } → EM_PROVA + link_etapa2_usado = true
│       ├── permitir-nova-candidatura/route.ts  — POST → snapshot em historico_anterior + reset campos + TRIAGEM
│       ├── resultado-entrevista/route.ts       — POST { candidato_id, resultado, motivo } → status final
│       ├── salvar-feedback/route.ts            — POST { candidato_id, feedback } → feedback_candidato
│       ├── salvar-score-vendedor/route.ts      — POST { candidato_id, scores, perfil_vendedor } → UPDATE
│       ├── status-logistica/route.ts           — GET ?id= → polling { analisado, aprovado, link_etapa2 }
│       ├── upload-curriculo/route.ts           — POST multipart → storage bucket 'curriculos'
│       └── verificar-cpf/route.ts             — GET ?cpf=&cargo= → { existe, id, status }
├── components/
│   ├── admin/
│   │   ├── ModalConvocacao.tsx                 — modal convocação: Individual/Coletiva, preview WhatsApp, mailto Gmail
│   │   └── StatusChip.tsx                      — chip colorido de status (13 status)
│   └── ui/
│       └── button.tsx                          — botão shadcn (usado pontualmente)
├── lib/
│   ├── auth.ts                                 — getPerfilUsuario(supabase) → PerfilUsuario | null
│   ├── score.ts                                — calcularScore(dados) → score, perfil, alertas (gerente)
│   ├── score-vendedor.ts                       — calcularScoreVendedor(dados) → scores, perfil_vendedor, alertas
│   ├── status.ts                               — STATUS_CONFIG: 11 status com cores e etapas
│   ├── supabase.ts                             — createClient() → createBrowserClient(...)
│   ├── types.ts                                — DadosFormularioGerente, ResultadoScore, etc.
│   ├── utils.ts                                — cn() helper para classnames
│   └── verificar-salario.ts                    — verificarSalarioCompativel(pretensao, cargo) → { compativel, teto }
├── supabase/
│   └── migrations/                             — 001 a 027 (ver seção 16)
├── proxy.ts                                    — middleware: proteção /admin/* + headers x-user-role/x-user-unidade
├── next.config.ts                              — remotePatterns para Supabase Storage
└── CONTEXTO_SELETO.md                          — este arquivo
```

---

## 5. BANCO DE DADOS

### Tabela `candidatos`

Tabela principal. Todos os campos são nullable exceto `id` e `nome`.

#### Campos de sistema
| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | UUID | gen_random_uuid() | PK |
| `criado_em` | TIMESTAMPTZ | NOW() | Data de criação |
| `cargo` | TEXT | 'gerente' | 'gerente' / 'vendedor' / 'caixa' |
| `status` | TEXT | 'TRIAGEM' | Ver seção 6 — 11 valores possíveis |
| `etapa_atual` | INTEGER | 1 | Etapa do pipeline (1, 2 ou 3) |
| `motivo_reprovacao` | TEXT | NULL | Sempre preenchido junto com status REPROVADO |
| `historico_anterior` | JSONB | NULL | Snapshot da candidatura anterior (quando recandidata) |
| `reprovado_em` | TIMESTAMPTZ | NULL | Data da reprovação para controle de nova candidatura |

#### Etapa 1 — Dados pessoais e logística (todos os cargos)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `nome` | TEXT NOT NULL | Nome completo |
| `cpf` | TEXT | CPF (índice único parcial WHERE cpf IS NOT NULL) |
| `idade` | TEXT | Idade |
| `endereco` | TEXT | Endereço completo (logradouro + bairro + cidade + número + complemento). Preenchido via ViaCEP (campo somente leitura após CEP válido) + campos separados `numero`/`complemento` concatenados no submit; fallback Google Places quando CEP não reconhecido |
| `cep` | TEXT | CEP informado pelo candidato (migration 031) |
| `unidades` | TEXT[] | Unidades de interesse (Taquara / Aerotown / Americas / Nova Iguaçu) |
| `whatsapp` | TEXT | Telefone com WhatsApp |
| `email` | TEXT | Email (opcional) |
| `instagram` | TEXT | URL do perfil Instagram |
| `escolaridade` | TEXT | Nível de escolaridade |
| `turno_faculdade` | TEXT | Turno quando escolaridade = 'Faculdade em andamento' |
| `veiculo` | TEXT | 'Carro' / 'Moto' / 'Não possuo' |
| `cnh` | TEXT[] | Categorias de CNH ou ['Não possuo CNH'] |
| `disponibilidade_horario` | TEXT | 'Total' / 'Manhã-tarde' / 'Tarde-noite' |
| `disponibilidade_mudanca` | TEXT | 'Sim' / 'Não' |
| `pretensao_salarial` | TEXT | Remuneração esperada |
| `foto_url` | TEXT | URL pública da foto no bucket 'fotos' |
| `conducoes_ida` | TEXT | Número de conduções informadas pelo candidato (trajeto ida) — migration 028 |
| `conducoes_volta` | TEXT | Número de conduções informadas pelo candidato (trajeto volta) — migration 028 |

#### Logística (calculados por analisar-logistica)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `tempo_deslocamento` | TEXT | Resumo: "Taquara: 19min carro / 43min TP (2 conduções) / VT: R$ 440/mês" |
| `qtd_passagens` | TEXT | Máximo de conduções entre as unidades analisadas |
| `vt_mensal_estimado` | TEXT | VT calculado: conduções × tarifa_dinâmica × 2 × 22 |
| `logistica_por_unidade` | JSONB | Detalhamento estruturado por loja: { unidade, minutos_carro, minutos_transit, aprovada, motivo_reprovacao, vt } |
| `ia_logistica_aprovado` | BOOLEAN | Se a análise logística aprovou |
| `ia_logistica_observacao` | TEXT | Motivo da decisão + alerta salarial se pretensão > teto |
| `ia_logistica_analisado_em` | TIMESTAMPTZ | Timestamp (sinal de conclusão no polling) |

#### Etapa 2 — Gerente: histórico profissional
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `curriculo_url` | TEXT | URL do currículo no bucket 'curriculos' |
| `trabalhando_atualmente` | TEXT | 'Sim' / 'Não' |
| `empresa_atual` | TEXT | Nome da empresa atual |
| `cargo_atual` | TEXT | Cargo atual |
| `tempo_empresa_atual` | TEXT | Tempo na empresa atual |
| `motivo_busca` | TEXT | Motivo de busca de nova oportunidade |
| `ultima_empresa` | TEXT | Última empresa (se não trabalhando) |
| `ultimo_cargo` | TEXT | Último cargo |
| `tempo_ultima_empresa` | TEXT | Tempo na última empresa |
| `motivo_saida` | TEXT | Motivo de saída |
| `ultimas_experiencias` | TEXT | Resumo das últimas 3 experiências (mín. 80 chars) |
| `maior_percentual_meta` | TEXT | Maior % de meta atingido |
| `ramo_empresa_atual` | TEXT | Ramo de atuação da empresa atual (select com 10 opções + Outro) — migration 029 |
| `ramo_ultima_empresa` | TEXT | Ramo de atuação da última empresa (select com 10 opções + Outro) — migration 029 |

#### Etapa 2 — Gerente: respostas comportamentais (abertas)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `confortavel_cobranca_meta` | TEXT | Confortável com cobrança de meta |
| `preferencia_salarial` | TEXT | Fixo maior vs fixo + variável agressivo |
| `incomodo_lideranca` | TEXT | O que incomoda em uma liderança (aberta) |
| `gosta_vender` | TEXT | Por que gosta de vender (aberta) |
| `maior_meta` | TEXT | Maior meta batida ou superada |
| `maior_resultado` | TEXT | Maior resultado comercial concreto (mín. 80 chars) |
| `maior_resultado_valor` | TEXT | Valor monetário do maior resultado (máscara R$, ex: "R$ 120.000,00") — migration 029 |
| `ferramentas_comerciais` | TEXT[] | Ferramentas com que já trabalhou |
| `reacao_abaixo_meta` | TEXT | Reação quando abaixo da meta (aberta) |
| `prejudica_resultado` | TEXT | O que prejudica resultado (aberta) |
| `diferencial_vendas` | TEXT | Diferencial em vendas (aberta) |
| `ja_liderou` | TEXT | 'Sim' / 'Não' |
| `qtd_liderados` | TEXT | Quantidade liderada |
| `reacao_baixo_resultado` | TEXT | Como age com funcionário de baixo resultado (mín. 80 chars) |
| `acoes_lideranca` | TEXT[] | Ações já realizadas (exclusivo: "Nenhuma das anteriores") |
| `motivo_lideranca_sem_experiencia` | TEXT | Por que está pronto sem experiência |
| `diferenca_gerente_forte` | TEXT | Diferença entre gerente comum e forte (aberta) |
| `prejudica_equipe` | TEXT | O que mais prejudica uma equipe (aberta) |
| `para_de_crescer` | TEXT | O que faz profissional parar de crescer |
| `ambiente_trabalho` | TEXT | Ambiente de trabalho preferido |
| `caracteristica_principal` | TEXT | Característica principal (aberta) |
| `incomodo_equipe` | TEXT | O que incomoda nas pessoas da equipe (aberta) |
| `perde_motivacao` | TEXT | O que faz perder motivação |
| `significado_comprometimento` | TEXT | O que significa comprometimento |
| `peso_crescimento` | TEXT | Quanto crescimento profissional pesa |
| `evolucao_profissional` | TEXT | O que faz para evoluir |
| `objetivo_5_anos` | TEXT | Objetivo profissional em 5 anos |
| `intenso_vs_toxico` | TEXT | Diferença entre intenso/competitivo e tóxico (aberta) |
| `confortavel_cobranca_constante` | TEXT | Tolerância a cobrança constante |
| `visao_acompanhamento_meta` | TEXT | Visão sobre acompanhamento diário de meta (aberta) |
| `gerente_participa_vendas` | TEXT | Se gerente deve participar ativamente das vendas |
| `ferramentas_utilizadas` | TEXT[] | Ferramentas já utilizadas |
| `acao_movimento_fraco` | TEXT | Como age em períodos de movimento fraco (aberta) |
| `confortavel_operacao` | TEXT[] | Situações operacionais confortáveis |
| `permanencia_empresa` | TEXT | O que faz permanecer em uma empresa |
| `case_meta_5dias` | TEXT | Case: loja muito abaixo da meta, faltam 5 dias |
| `case_vendedor_problema` | TEXT | Case: vendedor top mas gera conflito |
| `case_equipe_acomodada` | TEXT | Case: equipe perdeu energia |
| `case_funcionario_atrasado` | TEXT | Case: funcionário frequentemente atrasado |
| `case_loja_desorganizada` | TEXT | Case: assumiu loja desorganizada |
| `prioridade_30dias` | TEXT | Prioridade nos primeiros 30 dias |
| `video_url` | TEXT | Link do vídeo de apresentação |

#### Etapa 2 — Gerente: opções múltipla escolha (migration 023)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `incomodo_lideranca_opcao` | TEXT | Opção pré-definida (contribui para perfil_gerente) |
| `gosta_vender_opcao` | TEXT | Opção pré-definida |
| `reacao_abaixo_meta_opcao` | TEXT | Opção pré-definida |
| `prejudica_resultado_opcao` | TEXT | Opção pré-definida |
| `diferencial_vendas_opcao` | TEXT | Opção pré-definida |
| `diferenca_gerente_forte_opcao` | TEXT | Opção pré-definida |
| `prejudica_equipe_opcao` | TEXT | Opção pré-definida |
| `caracteristica_principal_opcao` | TEXT | Opção pré-definida |
| `incomodo_equipe_opcao` | TEXT | Opção pré-definida |
| `perde_motivacao_opcao` | TEXT | Opção pré-definida |
| `significado_comprometimento_opcao` | TEXT | Opção pré-definida |
| `intenso_vs_toxico_opcao` | TEXT | Opção pré-definida |
| `visao_acompanhamento_meta_opcao` | TEXT | Opção pré-definida |
| `acao_movimento_fraco_opcao` | TEXT | Opção pré-definida |
| `perfil_gerente` | TEXT | Calculado por votos: 'Comercial' / 'Pessoas' / 'Operacional' / 'Estratégico' / 'Misto' (ex: "Misto — Comercial + Estratégico") |

#### Score e classificação — Gerente (calculados em finalizar-avaliacao)
| Coluna | Tipo | Default |
|--------|------|---------|
| `score_comercial` | NUMERIC(5,2) | 0 |
| `score_lideranca` | NUMERIC(5,2) | 0 |
| `score_comprometimento` | NUMERIC(5,2) | 0 |
| `score_cultura` | NUMERIC(5,2) | 0 |
| `score_ambicao` | NUMERIC(5,2) | 0 |
| `score_estabilidade` | NUMERIC(5,2) | 0 |
| `score_operacao` | NUMERIC(5,2) | 0 |
| `score_final` | NUMERIC(5,2) | 0 |
| `perfil` | CHAR(1) | NULL | — A / B / C / D |
| `alertas` | TEXT[] | '{}' | — códigos A01–A12 |

#### Prova vendedor (migration 020)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `tempo_ultimo_emprego` | TEXT | Quanto tempo ficou no último emprego |
| `motivo_permanencia` | TEXT | O que faz ficar numa empresa |
| `saiu_sem_avisar` | TEXT | Já saiu sem avisar? → alerta V01 |
| `reacao_orientacao` | TEXT | Como reage a orientação negativa |
| `preferencia_trabalho` | TEXT | Sozinho vs equipe |
| `aceita_regras` | TEXT | Aceita regras mesmo sem concordar |
| `motivacao_vendas` | TEXT | O que motiva a vender |
| `situacao_venda` | TEXT | Abordagem numa venda difícil |
| `reacao_sem_venda` | TEXT | Reação num dia sem venda |
| `experiencia_persuasao` | TEXT | Experiência persuadindo alguém |
| `lida_movimento_fraco` | TEXT | Como lida com dia de baixo movimento |
| `aceita_horario_shopping` | TEXT | Aceita horário de shopping (fins de semana, feriados) |
| `restricao_horario_detalhe` | TEXT | Detalhes se tem restrição → alerta V04 |
| `ativo_redes_sociais` | TEXT | É ativo em redes sociais |
| `comunicacao_pessoal` | TEXT | Como é a comunicação pessoal |
| `defeito_segundo_gerente` | TEXT | Qual defeito o gerente apontaria |
| `por_que_confiar` | TEXT | Por que devemos confiar neste candidato |
| `situacao_loja_baguncada` | TEXT | Como agiria numa loja desorganizada |
| `maior_percentual_meta` | TEXT | Maior % de meta atingido (migration 021) |

#### Score e classificação — Vendedor
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `score_vocacao` | NUMERIC(5,2) | Score vocação para vendas (peso 30%) |
| `score_comprometimento_v` | NUMERIC(5,2) | Score comprometimento vendedor (peso 25%) |
| `score_comunicacao` | NUMERIC(5,2) | Score comunicação e energia (peso 20%) |
| `score_disciplina_v` | NUMERIC(5,2) | Score disciplina (peso 15%) |
| `score_potencial` | NUMERIC(5,2) | Score potencial de crescimento (peso 10%) |
| `perfil_vendedor` | TEXT | 'Vendedor Nato' / 'Relacional' / 'Executor' / 'Organizador' / 'Liderança Emergente' |

#### Campos específicos — Caixa (migration 024)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `operou_caixa` | TEXT | Já operou caixa ou PDV? |
| `facilidade_calculos` | TEXT | Facilidade com cálculos |
| `experiencia_troco` | TEXT | Experiência com fechamento de caixa |
| `descricao_experiencia_caixa` | TEXT | Descrição (aparece se qualquer campo = 'Sim', mín. 50 chars) |

#### IA — Análise de perfil (Etapa 2 gerente)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `ia_tipo_perfil` | TEXT | Gerente Comercial / Operacional / De Pessoas / Perfil Misto / Perfil Incompatível |
| `ia_resumo` | TEXT | Resumo de 3-4 linhas do perfil |
| `ia_pontos_fortes` | JSONB | Array de strings |
| `ia_pontos_atencao` | JSONB | Array de strings |
| `ia_recomendacao` | TEXT | Chamar para entrevista / Banco de talentos / Não recomendado |
| `ia_justificativa` | TEXT | Justificativa da recomendação |
| `ia_analisado_em` | TIMESTAMPTZ | Timestamp da análise (null = ainda não rodou) |

#### Pipeline e links
| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `link_etapa2` | TEXT | NULL | UUID token de acesso único à prova (Etapa 2 gerente) |
| `link_etapa2_usado` | BOOLEAN | false | Se o token já foi consumido |
| `link_etapa2_criado_em` | TIMESTAMPTZ | NULL | Quando o token foi gerado |

#### Etapa 3 — Entrevista (migration 015)
| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `entrevista_data` | DATE | NULL | Data da entrevista |
| `entrevista_hora` | TEXT | NULL | Horário (ex: "14:00") |
| `entrevista_modalidade` | TEXT | NULL | "Presencial" ou "Online" |
| `entrevista_local` | TEXT | NULL | Endereço ou link |
| `entrevista_gestor` | TEXT | NULL | Nome do gestor responsável |
| `entrevista_email_unidade` | TEXT | NULL | Email da unidade |
| `entrevista_agendada_em` | TIMESTAMPTZ | NULL | Quando foi agendada |
| `entrevista_resultado` | TEXT | 'Aguardando' | Aguardando / Contratado / Não contratado / Repescagem |
| `entrevista_motivo_nao_contratacao` | TEXT | NULL | Motivo livre |
| `entrevista_tipo` | TEXT | NULL | "individual" ou "coletiva" |

#### Outros
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `observacoes` | TEXT | Anotações internas do admin |
| `feedback_candidato` | TEXT | Feedback visível no painel (card amarelo) |

### Tabela `configuracoes` (migration 024)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `chave` | TEXT PK | Identificador único |
| `valor` | TEXT | Valor em texto |
| `atualizado_em` | TIMESTAMPTZ | Última atualização |

**Chaves cadastradas (estado atual em produção):**
| Chave | Valor atual | Descrição |
|-------|-------------|-----------|
| `vaga_caixa_ativa` | `true` | Toggle vaga caixa na tela de seleção |
| `tarifa_rio_de_janeiro` | `5.00` | Tarifa VT para Taquara, Aerotown, Américas |
| `tarifa_nova_iguacu` | `6.70` | Tarifa VT para Nova Iguaçu |
| `tarifa_padrao` | `5.00` | Fallback para município não identificado |
| `salario_max_gerente` | `8000` | Teto de pretensão salarial gerente |
| `salario_max_vendedor` | `4000` | Teto de pretensão salarial vendedor |
| `salario_max_caixa` | `2500` | Teto de pretensão salarial caixa |

### Tabela `perfis_usuario`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | Referencia `auth.users(id)` |
| `role` | TEXT | 'master' ou 'gestor' |
| `unidade` | TEXT | NULL para master, nome da unidade para gestor |
| `nome` | TEXT | Nome de exibição |
| `email` | TEXT | Email |
| `senha_visivel` | TEXT | Senha em texto simples (exibição interna no painel master) |

### Buckets do Storage

| Bucket | Acesso | Uso |
|--------|--------|-----|
| `fotos` | Público | Fotos de rosto dos candidatos |
| `curriculos` | Público | PDFs/Word dos currículos (Etapa 2 gerente) |

### RLS — Políticas ativas

**Tabela `candidatos`:**
- `anon_insert`: role `anon` pode INSERT (formulários públicos)
- `authenticated_insert`: role `authenticated` pode INSERT (admin)
- `authenticated_select`: role `authenticated` pode SELECT
- `authenticated_update`: role `authenticated` pode UPDATE
- **Restrição crítica**: INSERT sem `.select()` — usar `crypto.randomUUID()` no cliente; `.insert().select('id')` dispara SELECT e bloqueia anon

**Tabela `perfis_usuario`:**
- `leitura_autenticado`: FOR SELECT (auth.role() = 'authenticated')
- `update_autenticado`: FOR UPDATE (auth.role() = 'authenticated')

---

## 6. PIPELINE DE STATUS

11 status ativos (REPROVADO_LOGISTICA e REPROVADO_PERFIL foram unificados em REPROVADO na migration 025).

### Etapa 1 — Triagem Logística
| Status | Label | Cor | Significado |
|--------|-------|-----|-------------|
| `TRIAGEM` | Em Triagem | Cinza claro | Formulário enviado, análise em andamento |
| `APROVADO_E1` | Aprovado — Etapa 1 | Verde claro | Viabilidade logística confirmada |

### Etapa 2 — Avaliação de Perfil
| Status | Label | Cor | Significado |
|--------|-------|-----|-------------|
| `EM_PROVA` | Em Avaliação | Laranja claro | Preenchendo formulário de Etapa 2 |
| `APROVADO_E2` | Aprovado — Etapa 2 | Azul claro | Perfil A ou B |
| `BANCO_TALENTOS` | Banco de Talentos | Cinza claro | Perfil C — guardado para futuro |

### Etapa 3 — Entrevista e Contratação
| Status | Label | Cor | Significado |
|--------|-------|-----|-------------|
| `ENTREVISTA_AGENDADA` | Entrevista Agendada | Laranja claro | Convocação enviada, aguardando confirmação |
| `ENTREVISTA_CONFIRMADA` | Entrevista Confirmada | Verde claro | Candidato confirmou presença |
| `ENTREVISTA_CANCELADA` | Entrevista Cancelada | Vermelho claro | Candidato cancelou |
| `CONTRATADO` | Contratado | Verde escuro | Efetivado |
| `REPROVADO` | Reprovado | Vermelho | Reprovado (qualquer etapa) |
| `REPESCAGEM` | Repescagem | Amarelo | Aprovado mas sem vaga |

### Campo `motivo_reprovacao`
Sempre preenchido junto com status REPROVADO. Valores comuns:
- `"Distância inviável para todas as unidades"` — logística
- `"Perfil incompatível com o cargo"` — IA de perfil
- `"Escolaridade abaixo do requisito mínimo"` — triagem automática
- Texto livre do gestor na entrevista

---

## 7. SISTEMA DE SCORE

### Gerente (7 dimensões — `lib/score.ts`)

| Dimensão | Campo | Peso | O que avalia |
|----------|-------|------|-------------|
| Comercial / Resultados | `score_comercial` | 25% | Números concretos, ferramentas, reação à meta |
| Liderança / Cobrança | `score_lideranca` | 18% | Experiência liderando, ações concretas |
| Comprometimento / Disciplina | `score_comprometimento` | 17% | Histórico profissional, cases, detalhamento |
| Cultura SELETO | `score_cultura` | 15% | Tolerância à cobrança constante |
| Ambição / Crescimento | `score_ambicao` | 12% | Objetivo de 5 anos, esforço de evolução |
| Estabilidade Profissional | `score_estabilidade` | 8% | Estar empregado, histórico de permanência |
| Organização / Operação | `score_operacao` | 5% | Ferramentas, ação em movimento fraco |

**Classificação:** A ≥ 85 / B ≥ 70 / C ≥ 55 / D < 55

**Nota importante:** o score é calculado por `lib/score.ts` de forma independente da IA. Campos em branco valem 0 pontos naquela dimensão. O score final reflete exclusivamente os dados preenchidos — candidatos com respostas incompletas terão score baixo mesmo com bom perfil real. A IA de perfil complementa a análise lendo também os campos `_opcao` como fallback.

**Alertas gerente (A01–A15):**
| Código | Nome | Penalidade |
|--------|------|-----------|
| A01 | Baixa Energia | −2 |
| A02 | Perfil Confortável | −3 |
| A03 | Pouca Cobrança | −3 |
| A04 | Instabilidade Profissional | −2 |
| A05 | Pouca Liderança | −2 |
| A06 | Resultado Fraco | −3 |
| A07 | Cansaço / Burnout | −2 |
| A08 | Baixa Ambição | −2 |
| A09 | Respostas Incoerentes | −3 |
| A10 | Deslocamento Ruim | −1 |
| A11 | Baixa Disponibilidade | −2 |
| A12 | Vitimismo | −3 |
| A13 | Pretensão Acima do Teto | −2 (dispara quando pretensao_salarial > salario_max_gerente) |
| A14 | Sem Experiência em Varejo | −2 (dispara quando nenhum ramo informado contém "Varejo") |
| A15 | Baixo Perfil Comercial | 0 (informativo — era A13 antes da migration 029) |

**`perfil_gerente`** — calculado por votos nas 14 respostas de múltipla escolha (colunas `*_opcao`):
Valores: `'Comercial'` / `'Pessoas'` / `'Operacional'` / `'Estratégico'` / `'Misto'`
Formato misto: `"Misto — Comercial + Estratégico"` (dois perfis empatados no topo)

### Vendedor (5 dimensões — `lib/score-vendedor.ts`)

| Dimensão | Campo | Peso | O que avalia |
|----------|-------|------|-------------|
| Vocação para vendas | `score_vocacao` | 30% | Motivação, reação a resultado, postura ativa |
| Comprometimento | `score_comprometimento_v` | 25% | Estabilidade, respeito a regras, confiabilidade |
| Comunicação e energia | `score_comunicacao` | 20% | Extroversão, presença, redes sociais |
| Disciplina | `score_disciplina_v` | 15% | Organização, aceitação de feedbacks |
| Potencial de crescimento | `score_potencial` | 10% | Liderança emergente, autoconhecimento |

**Classificação:** A ≥ 80 / B ≥ 65 / C ≥ 50 / D < 50

**Alertas vendedor (V01–V11):**
| Código | Nome | Penalidade |
|--------|------|-----------|
| V01 | Saiu sem avisar | −5 |
| V02 | Baixa vocação | −5 |
| V03 | Resistência a regras | −3 |
| V04 | Restrição de horário | −4 |
| V05 | Instabilidade e saída abrupta | −3 |
| V06 | Perfil pouco comunicativo | −2 |
| V07 | Faculdade em andamento | −2 |
| V08 | Baixa Vocação para Vendas | 0 (sem penalidade — limita classificação máxima a C quando score_vocacao < 30) |
| V09 | Deslocamento com Esforço | −1 (max(conducoes_ida, conducoes_volta) ≥ 2) |
| V10 | Disponibilidade Parcial | −2 (disponibilidade_horario ≠ 'Total' — shopping exige horário total) |
| V11 | Pretensão Acima do Teto | −2 (pretensao_salarial > salario_max_vendedor) |

**Bônus de excelência (score vendedor):**
- Dimensão com score ≥ 85 recebe multiplicador ×1.15, com cap em 100
- Aplicado a todas as 5 dimensões antes da ponderação: `aplicarBonus = (s) => Math.min(100, s >= 85 ? s * 1.15 : s)`
- Scores originais (sem bônus) são preservados para alertas e cálculo de perfil
- Campos adicionais no retorno: `score_vocacao_raw` (vocação sem bônus), `dimensoes_com_bonus` (array com nomes das dimensões que receberam bônus)

**Mínimo de vocação (score vendedor):**
- Se `score_vocacao` (original, sem bônus) < 30 e classificação calculada for A ou B → classificação limitada a C
- Alerta V08 adicionado automaticamente (penalidade 0)

**`perfil_vendedor`** — calculado por votos nas respostas:
`'Vendedor Nato'` / `'Relacional'` / `'Executor'` / `'Organizador'` / `'Liderança Emergente'`
Regra: Liderança Emergente sem `score_vocacao ≥ 50` → rebaixado para Executor

### Caixa
Sem score automático. Avaliado manualmente na entrevista presencial.

### Visualização no admin (`/admin/candidatos/[id]`)

```tsx
// Cada dimensão:
// nome (peso%)    pontuação    →    contribuição
// [===barra colorida gradiente===]

// Contribuição:
const contribuicao = (pontuacao * peso / 100).toFixed(2)

// Barra:
<div style={{ width: `${pontuacao}%`, background: 'linear-gradient(to right, #EF4444 0%, #EAB308 50%, #22C55E 100%)' }} />

// Linha final:
// Score Final    XX.X
```

---

## 8. ANÁLISE DE IA

### Etapa 1 — Análise Logística (`/api/analisar-logistica`)

- **Trigger**: fire-and-forget após insert do candidato (chamado diretamente do formulário)
- **Entrada**: `endereco`, `unidades`, `veiculo`, `cnh`, `pretensao_salarial`, `cargo`
- **Sufixo de geocodificação**: endereço enviado ao Routes API como `endereco + ', Brasil'` — sufixo fixo `', Rio de Janeiro, RJ, Brasil'` foi removido (causava geocodificação errada para Nova Iguaçu e outras cidades)
- **Google Maps Routes API v2** (`computeRoutes`): calcula tempo DRIVE e TRANSIT para cada unidade
  - Conduções reais via `routes.legs.steps` filtrando `travelMode === 'TRANSIT'`
  - Tipos de modal via `transitDetails.transitLine.vehicle.type`
- **VT dinâmico**: tarifa por município buscada de `configuracoes` (`tarifa_nova_iguacu` / `tarifa_rio_de_janeiro`)
  - Fórmula: `conduções × tarifa × 2 × 22`
- **Alerta salarial**: se `pretensao_salarial > salario_max_{cargo}`, adiciona aviso em `ia_logistica_observacao`
- **REGRA CRÍTICA DE MODAL**:
  - `veiculo = 'Carro'` ou `'Moto'` → usar tempo de CARRO para decidir
  - `veiculo = 'Não possuo'` → usar **apenas** TRANSIT; ignorar carro
- **Critério**: aprovado se pelo menos 1 unidade acessível em ≤ 90min (modal correto)
- **Cache**: não recalcula se `ia_logistica_analisado_em IS NOT NULL AND tempo_deslocamento IS NOT NULL`
- **Para forçar novo cálculo**: limpar AMBOS os campos no banco
- **Atualiza**: `ia_logistica_aprovado`, `ia_logistica_observacao`, `ia_logistica_analisado_em`, `link_etapa2` (se aprovado gerente), `status`, `tempo_deslocamento`, `qtd_passagens`, `vt_mensal_estimado`, `logistica_por_unidade`
- **Fallback**: se Google Maps falhar, usa Claude Haiku com estimativa por endereço. Se IA também falhar, aprova com observação
- **Polling**: frontend faz GET `/api/status-logistica?id={uuid}` a cada 2s até `analisado = true`

### Etapa 2 — Análise de Perfil (`/api/analisar-candidato`)

- **Trigger gerente**: chamado por `after()` em `finalizar-avaliacao/route.ts` após return da resposta
- **Trigger vendedor**: chamado por `after()` em `salvar-score-vendedor/route.ts` após salvar o score
- **Trigger caixa**: chamado por `after()` em `analisar-logistica/route.ts` quando `aprovado === true && cargo === 'caixa'`
- **CRÍTICO**: usar `after()` do `next/server` — Vercel cancela fetch pendente após `return`; sem `after()`, `ia_analisado_em` fica null (bug confirmado com candidato Ricardo)
- **Branch por cargo**: `analisar-candidato/route.ts` detecta `candidato.cargo` e aplica prompt específico
- **Modelo**: `claude-haiku-4-5`
- **maxDuration**: 30s

**Perfis possíveis — Gerente:**
`'Gerente Comercial'` / `'Gerente Operacional'` / `'Gerente de Pessoas'` / `'Perfil Misto'` / `'Perfil Incompatível'`

**Perfis possíveis — Vendedor:**
`'Vendedor Nato'` / `'Perfil Relacional'` / `'Perfil Executor'` / `'Perfil Organizador'` / `'Liderança Emergente'` / `'Perfil Incompatível'`

**Perfis possíveis — Caixa:**
`'Operador Experiente'` / `'Operador Iniciante'` / `'Perfil Incompatível'`

**Gatilhos de bloqueio — Caixa (server-side)** — forçam máximo "Banco de talentos":
  1. `facilidade_calculos` contém "Não" → operador sem aptidão para cálculos
  2. `disponibilidade_horario` = "Manhã-tarde" ou "Tarde-noite" → indisponibilidade de turno integral

**5 gatilhos de penalidade automática (gerente)** que bloqueiam "Chamar para entrevista":
  1. Liderança >10 pessoas declarada mas nunca tomou decisão disciplinar
  2. Objetivo vago ou passivo (sem números, sem ambição declarada)
  3. Culpa empresa/liderança em 2+ experiências
  4. Preferência por ambiente tranquilo/equilibrado
  5. Respostas monossilábicas nos cases (menos de 2 linhas)

**Instrução crítica do prompt gerente:**
- Campo `ramo_empresa` incluído no contexto da IA
- IA **nunca** deve deduzir segmento de atuação pelo nome da empresa — usar **apenas** o ramo informado explicitamente pelo candidato
- Função `valOpcao(aberto, opcao)`: se campo aberto estiver vazio mas `_opcao` correspondente estiver preenchido, usa a opção como resposta válida com prefixo `[opção selecionada: ...]` — IA instruda a não penalizar essa situação
- Instrução explícita no system prompt: `"Campos [opção selecionada: ...] são respostas válidas equivalentes ao texto livre. Não penalize ausência de texto quando a opção está preenchida."`

**Atualiza**: campos `ia_*` + segundo UPDATE de status:
  - `Não recomendado` → `REPROVADO` (com motivo_reprovacao = "Perfil incompatível com o cargo")
  - `Banco de talentos` → `BANCO_TALENTOS`
  - `Chamar para entrevista` → permanece `APROVADO_E2`

---

## 9. PAINEL ADMINISTRATIVO

### Controle de acesso
- **master**: todos os candidatos, todas as unidades, acesso ao dashboard e configurações
- **gestor**: apenas candidatos da sua unidade (`.contains('unidades', [unidade])`), sem dashboard

Middleware (`proxy.ts`): protege `/admin/*`, redireciona não-autenticados, injeta `x-user-role` e `x-user-unidade`.

### Lista de candidatos (`/admin/candidatos`)
- Tabela com colunas: foto, nome, cargo (chip colorido), unidades, score, perfil (A/B/C/D), tipo IA, status, alertas (⚠️ + count), data
- **Filtros**: cargo (Gerente/Vendedor/Caixa), unidade, perfil, tipo IA, status macro (7 grupos), etapa (1/2/3)
- Linha vermelha `#FEF2F2` + ⚠️ quando entrevista vencida (data < hoje E resultado = 'Aguardando')
- **Kanban**: drag-and-drop entre colunas de status; confirmação ao mover REPROVADO para direita; status padrão ao mover para esquerda
- **Filtro de cargo** na lista e no Kanban

### Detalhe do candidato (`/admin/candidatos/[id]`)
Layout 2 colunas:
- **Coluna principal (2/3)**: todos os blocos de resposta por seção + dados de contato (com link mailto: se tiver email)
- **Coluna lateral (1/3)**: score por dimensão (com barras), análise IA, alertas, status + dropdown salvar, convocar, observações

**Topo da página:**
- Card vermelho ⚠️: entrevista vencida
- Card amarelo: entrevista agendada (data/hora/modalidade/local/gestor) + botões confirmar/cancelar
- Card feedback do candidato (amarelo `#FFFBEB`, 💬) quando `feedback_candidato` não for null
- Badge salarial `⚠️ Acima do esperado` abaixo da pretensão quando > teto do cargo
- Chip de `perfil_gerente` (azul/verde/cinza/roxo/amarelo) no sidebar
- Chip de `perfil_vendedor` no sidebar quando `cargo = 'vendedor'`
- Motivo de reprovação exibido abaixo do chip de status quando `status = 'REPROVADO'`
- Card "Candidatura anterior" quando `historico_anterior` não for null

**Botão "Permitir nova candidatura":**
- Aparece quando status = REPROVADO ou BANCO_TALENTOS
- Ao clicar: salva snapshot em `historico_anterior`, reseta campos da candidatura, status → TRIAGEM

**Botão "Convocar para entrevista":**
- Normal: `APROVADO_E2`, `ENTREVISTA_CANCELADA`, `REPROVADO`, `REPESCAGEM`
- Bloqueado (cinza + tooltip): `ENTREVISTA_AGENDADA`, `ENTREVISTA_CONFIRMADA`
- Oculto: `CONTRATADO`

### Modal de Convocação (`components/admin/ModalConvocacao.tsx`)
- Toggle Individual / Coletiva
- Campos: data, hora, modalidade (Presencial/Online), local, nome do gestor, e-mail da unidade (pré-preenchido)
- Preview ao vivo da mensagem WhatsApp
- Botão "Abrir no WhatsApp" (deeplink `wa.me`)
- **Botão "Abrir no Gmail"** (mailto pré-preenchido com email do candidato e dados da entrevista)
- Botão "Salvar convocação"

**Mapeamento email por unidade (configurável):**
- Buscado de `configuracoes` (chaves `email_taquara`, `email_aerotown`, `email_americas`, `email_nova_iguacu`) via `/api/configuracoes`
- Valores hardcoded em `EMAIL_UNIDADE` mantidos como fallback caso a tabela não responda
- Pré-preenchimento por prioridade: 1) candidato tem 1 unidade → email dessa unidade; 2) gestor logado tem unidade no array → email da unidade do gestor; 3) primeira unidade do array; 4) fallback hardcoded

### Dashboard (`/admin/dashboard`) — só master
0. **KPI cards de destaque** (topo, paleta Checklist do Vendedor):
   - 🔵 **Total Aprovados** — `funil.contratados` (fundo `#E7F1FC`, borda `#1D7FC2`, texto `#0C4A75`)
   - 🟠 **Taxa de Conversão** — `contratados / triagem × 100%` (fundo `#FDECE0`, borda `#FF9430`, texto `#8A4A0E`)
   - 🟢 **Vendedores Ativos** — headcount real de `colaboradores WHERE cargo='vendedor' AND estado IN ('ATIVO','TREINAMENTO')` — campo `vendedores_ativos` adicionado à API (fundo `#E4F7EA`, borda `#2DC76E`, texto `#166B3B`)
1. **Funil**: Triagem / Prova / Entrevista / Resultado Final
2. **Alertas**: Aguardando Convocação (APROVADO_E2) + Entrevistas Vencidas
3. **Por unidade**: tabela × cargos
4. **Por cargo**: separação Gerente / Vendedor / Caixa
5. **Top candidatos**: top 5 APROVADO_E2 por score

### Configurações (`/admin/configuracoes`) — só master
1. **Gestores**: lista com senha visível + edição inline
2. **Vagas Ativas**: toggle Operador de Caixa (`vaga_caixa_ativa`)
3. **Tarifas de Passagem**: Rio de Janeiro, Nova Iguaçu, Padrão — edição inline, salva em `configuracoes`
4. **Teto de Pretensão Salarial**: Gerente, Vendedor, Caixa — edição inline, salva em `configuracoes`
5. **Emails por Unidade**: Taquara, Aerotown, Américas, Nova Iguaçu — edição inline com validação de formato, salva em `configuracoes`

---

## 10. COMPONENTES E LIBS REUTILIZÁVEIS

### `components/admin/StatusChip.tsx`
```tsx
<StatusChip status="APROVADO_E2" />
<StatusChip status="TRIAGEM" showEtapa />  // mostra "E1 Em Triagem"
```

### `components/admin/ModalConvocacao.tsx`
```tsx
<ModalConvocacao
  candidatoId={id}
  candidatoNome={nome}
  candidatoWhatsapp={whatsapp}
  candidatoEmail={email}              // para botão Gmail
  candidatoCargo={cargo}              // para subject do email
  candidatoUnidades={unidades}
  emailsUnidade={emailsUnidade}       // Record<string, string> buscado de configuracoes
  gestorUnidade={perfilUsuario?.unidade ?? null}  // unidade do gestor logado (prioridade 2)
  onClose={() => setModal(false)}
  onSuccess={(dados) => { /* atualiza estado local */ }}
/>
```

### `lib/auth.ts`
```ts
const perfil = await getPerfilUsuario(supabase)
// → { id, role, unidade, nome, email, senha_visivel } | null
```

### `lib/score.ts`
```ts
const resultado = calcularScore(dados)
// → { score_comercial, score_lideranca, ..., score_final, perfil, alertas, perfil_gerente }
```

### `lib/score-vendedor.ts`
```ts
import { calcularScoreVendedor, type DadosVendedor } from '@/lib/score-vendedor'
const resultado = calcularScoreVendedor(dados)
// → { score_vocacao, score_comprometimento_v, score_comunicacao, score_disciplina_v,
//     score_potencial, score_final, perfil_vendedor, alertas, classificacao,
//     score_vocacao_raw,      // vocação sem bônus — preservado para alertas e perfil
//     dimensoes_com_bonus }   // array de dimensões que receberam bônus de excelência
```

### `lib/verificar-salario.ts`
```ts
const { compativel, teto } = await verificarSalarioCompativel('R$ 3.500,00', 'vendedor')
// Busca salario_max_{cargo} via /api/configuracoes e compara com valor parseado
// Retorna { compativel: boolean, teto: number }
```

### `lib/status.ts`
```ts
STATUS_CONFIG['APROVADO_E2']
// → { label, cor_fundo, cor_texto, etapa: 2, descricao }
```

### Componentes inline em `app/admin/equipe/page.tsx`

| Componente | Descrição |
|---|---|
| `BarraEscala({ valor, max })` | Barra de progresso horizontal com label `"X/max"` — usada em engajamento, ambição, comportamento (dados qualitativos) |
| `BadgeRecomendacao({ valor })` | Pill colorida para recomendação do gestor: manter=verde, promover=azul, atencao=âmbar |
| `PillDesempenho({ valor })` | Pill semântica de performance: vermelho `<80%`, âmbar `80–99%`, verde `≥100%`. Usada em `% Cota` (direto) e `Desempenho` (convertido de escala 1–5 → %) |
| `renderEstrelas(nivel, cargo)` | Estrelas ★☆ + insígnia PNG ao lado (só vendedor). Imagens em `public/insignias/nivel-{1-5}.png` (80px, fundo transparente). Gerente/caixa: sem insígnia |

### `public/insignias/`

Imagens de insígnia por nível do vendedor (extraídas do PDF "Projeto Selecionados"):

| Arquivo | Tamanho | Dimensões |
|---|---|---|
| `nivel-1.png` | 17 KB | — |
| `nivel-2.png` | 19 KB | — |
| `nivel-3.png` | 28 KB | — |
| `nivel-4.png` | 38 KB | — |
| `nivel-5.png` | 14 KB | 80×67px (redimensionado via `sips` de 1050×877px / 300 KB) |

Exibidas com `className="h-5 w-auto"` (≈20px altura), ao lado direito das estrelas, condicionadas a `cargo === 'vendedor'`.

---

## 11. PADRÕES CRÍTICOS DE CÓDIGO

### Insert anônimo (RLS)
```ts
// CORRETO
const id = crypto.randomUUID()
const { error } = await supabase.from('candidatos').insert({ id, ...dados })

// ERRADO — .select() após insert dispara SELECT que bloqueia anon
const { data, error } = await supabase.from('candidatos').insert(dados).select('id').single()
```

### `after()` para fire-and-forget no Vercel
```ts
// CORRETO — garante execução após return (Vercel cancela fetches pendentes)
import { after } from 'next/server'
after(async () => {
  try {
    await fetch(`${origin}/api/analisar-candidato`, { method: 'POST', ... })
  } catch (e) { console.error('Erro:', e) }
})
return NextResponse.json({ success: true })

// ERRADO — Vercel cancela o fetch antes de completar
fetch('/api/analisar-candidato', { ... }).catch(() => {})
```

### CPF por cargo
```ts
// CORRETO — verifica por CPF + cargo (não bloqueia candidato de outro cargo)
GET /api/verificar-cpf?cpf=00000000000&cargo=vendedor

// ERRADO — verificação global bloqueia candidato que quer mudar de cargo
GET /api/verificar-cpf?cpf=00000000000
```

### Google Places Autocomplete
```ts
// Requer Places API (New) habilitada E adicionada à chave no Google Cloud Console
// Usar PlaceAutocompleteElement — Autocomplete antiga deprecada em mar/2025
const { PlaceAutocompleteElement } = await google.maps.importLibrary('places')
// Evento: 'gmp-placeselect' (não 'place_changed')
// Input NÃO CONTROLADO: sem value/onChange, usar defaultValue + onBlur para sync
```

### SessionStorage por cargo
```ts
'seleto_etapa1_progress'   // app/candidatura/gerente — Etapa 1
'seleto_etapa1_caixa'      // app/candidatura/caixa
// vendedor: sem sessionStorage (formulário de sessão única)
'seleto_candidato_id'      // app/avaliacao/[token] — id do candidato durante Etapa 2
```

### Clientes Supabase
```ts
// Browser (client components): instanciar DENTRO do componente
const supabase = createClient()  // de @/lib/supabase

// Server/API routes: service_role para operações administrativas
const supabase = createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
```

### Datas tipo DATE do Postgres
```ts
// ERRADO — new Date('2026-05-20') interpreta UTC midnight → vira 19/05 em UTC-3
new Date(candidato.entrevista_data).toLocaleDateString('pt-BR')

// CORRETO — split direto na string
const [y, m, d] = data.split('-')
return `${d}/${m}/${y}`
```

### Páginas admin
```ts
export const dynamic = 'force-dynamic'  // obrigatório em todas as páginas admin
```

### Status REPROVADO sempre com motivo
```ts
// CORRETO
await supabase.from('candidatos').update({
  status: 'REPROVADO',
  motivo_reprovacao: 'Distância inviável para todas as unidades'
})

// ERRADO — dificulta diagnóstico no admin
await supabase.from('candidatos').update({ status: 'REPROVADO' })
```

### Conduções e logística (padrão pós-migration 028)
```ts
// Candidato informa conducoes_ida e conducoes_volta nos formulários (todos os 3 cargos)
// Google Maps usado APENAS para calcular tempo de deslocamento — não conta conduções

// Reprovação automática (antes de chamar Maps):
const totalConducoes = (parseInt(conducoes_ida) || 0) + (parseInt(conducoes_volta) || 0)
if (totalConducoes >= 3) → REPROVADO ("Deslocamento inviável — excede o limite de conduções")

// VT mensal:
const vt = Math.max(parseInt(conducoes_ida), parseInt(conducoes_volta)) * tarifa * 2 * 22

// Status pós-logística aprovada:
// - gerente  → APROVADO_E1  (segue para Etapa 2, link_etapa2 gerado)
// - vendedor → APROVADO_E2  (sem Etapa 2)
// - caixa    → APROVADO_E2  (sem Etapa 2)
// link_etapa2 gerado APENAS para cargo gerente

// Proteção de status avançado (analisar-logistica não regride):
// Se status ∈ [EM_PROVA, APROVADO_E2, BANCO_TALENTOS, ENTREVISTA_*, CONTRATADO, REPESCAGEM]
// → analisar-logistica não sobrescreve o status atual
```

### Deploy
```bash
cd /Users/adrielhenrique/Desktop/seleto
/tmp/vercel-deploy/node_modules/.bin/vercel --prod
```

### Migrations
```bash
cd /Users/adrielhenrique/Desktop/seleto
SUPABASE_ACCESS_TOKEN=<TOKEN_SUPABASE_REMOVIDO> npx supabase db push --linked
```

---

## 12. O QUE JÁ FUNCIONA

- [x] Tela de seleção de cargo (`/candidatura`) com 3 cards — Caixa oculto se `vaga_caixa_ativa=false`
- [x] Formulário gerente Etapa 1: 15+ campos, upload foto, sessionStorage, PlaceAutocompleteElement
- [x] Formulário gerente Etapa 2: 7 seções, 50+ campos, upload currículo, aviso "25 minutos"
- [x] Formulário vendedor: Etapa 1 + 17 perguntas objetivas + 2 abertas, submit único
- [x] Formulário caixa: Etapa 1 + campos PDV, `descricao_experiencia_caixa` condicional
- [x] CPF como identificador único por cargo com validação de dígitos verificadores
- [x] Deduplicação por CPF+cargo: atualiza candidato existente em andamento, bloqueia encerrado
- [x] `turno_faculdade` condicional (só quando escolaridade = 'Faculdade em andamento')
- [x] Ensino Médio Incompleto → reprovação silenciosa direto para `/obrigado`
- [x] PlaceAutocompleteElement (nova API) nos 3 formulários — input não-controlado
- [x] CSS global `gmp-place-autocomplete` com borda, tema claro, altura consistente
- [x] IA de logística real com Routes API v2 (carro + transporte público)
- [x] VT dinâmico por município com tarifas configuráveis na tabela `configuracoes`
- [x] Alerta salarial em `ia_logistica_observacao` quando pretensão > teto configurado
- [x] Polling de status logístico (GET `/api/status-logistica` a cada 2s)
- [x] `logistica_por_unidade` JSONB estruturado por loja
- [x] Token `link_etapa2` gerado para candidatos gerente aprovados na Etapa 1
- [x] Tela `/obrigado` com mensagens diferenciadas (verde aprovado / cinza reprovado)
- [x] `after()` em `finalizar-avaliacao` corrigindo fire-and-forget no Vercel
- [x] Score gerente: 7 dimensões + 12 alertas + perfil_gerente por votos
- [x] Score vendedor: 5 dimensões + 7 alertas + perfil_vendedor por votos
- [x] IA de perfil gerente com 5 penalidades automáticas
- [x] Status automático pós-IA: Não recomendado → REPROVADO, Banco → BANCO_TALENTOS
- [x] Score por dimensão com barras gradiente + contribuição calculada no admin
- [x] Lista de candidatos com filtro de cargo, unidade, perfil, status, etapa
- [x] Kanban com drag-and-drop + confirmação para mover reprovado
- [x] Detalhe candidato: badge salarial ⚠️ quando pretensão > teto
- [x] Detalhe candidato: card feedback amarelo quando `feedback_candidato` não é null
- [x] Detalhe candidato: chip `perfil_gerente` e `perfil_vendedor` no sidebar
- [x] Detalhe candidato: motivo de reprovação exibido abaixo do chip de status
- [x] Botão "Permitir nova candidatura" com snapshot em `historico_anterior`
- [x] Card "Candidatura anterior" no perfil quando `historico_anterior` não é null
- [x] Modal de convocação com botão "Abrir no Gmail" (mailto pré-preenchido)
- [x] Confirmação de presença (SIM/NÃO) → CONFIRMADA ou CANCELADA
- [x] Resultado da entrevista (Contratado / Não contratado / Repescagem) com motivo
- [x] Dashboard master: funil, alertas, por unidade, por cargo, top candidatos
- [x] Seção "Por Cargo" no dashboard master
- [x] Configurações master: toggle caixa + tarifas VT + tetos salariais (edição inline)
- [x] `/api/verificar-cpf` por CPF+cargo
- [x] `/api/atualizar-etapa1` para reaproveitamento de candidato existente
- [x] `/api/configuracoes` GET (chave única e multi-chave) + POST
- [x] `/api/salvar-score-vendedor` para score do vendedor (refatorado: cálculo server-side com todos os campos do banco)
- [x] `/api/salvar-feedback` para feedback_candidato
- [x] `/api/permitir-nova-candidatura` com snapshot e reset
- [x] StatusChip reutilizável com 11 status
- [x] Middleware de proteção admin com headers de role/unidade
- [x] IA de perfil para vendedor (branch por cargo em `analisar-candidato`, `after()` em `salvar-score-vendedor`)
- [x] IA de perfil para caixa com prompt dedicado (Operador Experiente / Iniciante / Incompatível) e gatilhos server-side
- [x] Trigger `after()` em `analisar-logistica` para disparar IA de caixa após aprovação logística
- [x] Emails configuráveis por unidade via tabela `configuracoes` (chaves `email_*`) com edição inline no painel master
- [x] Modal de convocação com pré-preenchimento dinâmico de email por unidade (busca DB, fallback hardcoded, prioridade por contexto do gestor)
- [x] Perfil gerente (`perfil_gerente`) exibido como chip colorido na lista e no Kanban de candidatos
- [x] Dropdown de perfil dinâmico por cargo na lista (gerente / vendedor / caixa sem filtro de perfil)
- [x] Bônus de excelência no score vendedor (dimensão ≥ 85 → ×1.15, cap 100)
- [x] Conduções informadas pelo candidato nos 3 formulários (`conducoes_ida`, `conducoes_volta`)
- [x] Google Maps usado apenas para tempo — conduções determinadas pelo candidato
- [x] Reprovação automática por conducoes_ida + conducoes_volta ≥ 3
- [x] Chips coloridos de unidades viáveis/inviáveis no detalhe do candidato no admin
- [x] Perfil vendedor exibido na lista e no Kanban (nome do perfil em vez de A/B/C/D)
- [x] Campos `ramo_empresa_atual`, `ramo_ultima_empresa` e `maior_resultado_valor` no formulário gerente (Etapa 2)
- [x] Redesign visual dos formulários públicos com identidade Seleto (logo, cores, tipografia)
- [x] Validação obrigatória por seção no formulário Etapa 2 do gerente — campos complementares mín. 15 chars, campos standalone mín. 30 chars, maior_meta mín. 3 chars
- [x] Componente `TAComplementar` — textarea padronizado abaixo de cada CardOpcao com hint "Desenvolva com suas próprias palavras"
- [x] Contador de caracteres em tempo real em todos os campos com mínimo
- [x] Borda vermelha + mensagem de erro inline por campo ao tentar avançar sem preencher
- [x] Scroll automático até o primeiro campo inválido da seção via `getElementById('campo-{nome}')`
- [x] Prompt IA gerente corrigido: `valOpcao()` usa campo `_opcao` como fallback quando campo aberto está vazio
- [x] Campos `para_de_crescer`, `ambiente_trabalho`, `confortavel_cobranca_meta`, `permanencia_empresa`, `prioridade_30dias`, `maior_meta` adicionados ao formulário Etapa 2 com validação

---

## 13. O QUE AINDA NÃO ESTÁ PRONTO (pendências e testes)

1. **Verificar `after()` com candidato real novo**
   - Submeter formulário gerente completo
   - Aguardar ~30s e verificar se `ia_analisado_em` foi preenchido no banco
   - Se null: conferir logs Vercel → Functions → `finalizar-avaliacao`

2. **Testar formulário Vendedor completo**
   - CPF duplicado por cargo não bloqueia candidato de outro cargo
   - 17 perguntas aparecem na ordem correta
   - Campo `restricao_horario_detalhe` aparece ao marcar "Tenho restrições de horário"
   - Score e `perfil_vendedor` calculados e salvos após submit
   - IA de perfil roda e preenche `ia_*` no banco
   - Redirect para `/obrigado` correto

3. **Testar formulário Caixa completo**
   - `descricao_experiencia_caixa` aparece se qualquer campo = "Sim"
   - Polling de logística funciona
   - Ensino Médio Incompleto → reprovação silenciosa

4. **Testar toggle de vaga Caixa**
   - Master → `/admin/configuracoes` → toggle Operador de Caixa
   - `/candidatura` → card Caixa aparece/some conforme toggle

5. **Testar pretensão salarial acima do teto**
   - Submeter candidato gerente com pretensão R$ 15.000
   - Verificar badge `⚠️ Acima do esperado` no admin
   - Verificar alerta em `ia_logistica_observacao`

6. **Testar tarifas configuráveis**
   - Alterar tarifa Nova Iguaçu para R$ 7,00 no admin
   - Submeter candidato com unidade Nova Iguaçu
   - Verificar se `vt_mensal_estimado` usa R$ 7,00

7. **Confirmar tempo real da prova do gerente**
   - Texto já atualizado para "25 minutos" no formulário (`app/avaliacao/[token]/page.tsx`)
   - Confirmar com cronometragem real de um candidato completo

8. **Ricardo augusto Pinto — campos abertos sem preenchimento**
   - ID: `48c08e12-dd54-4fa7-b1bc-b8bf304489d3`
   - 6 campos standalone ainda sem resposta: `para_de_crescer`, `ambiente_trabalho`, `confortavel_cobranca_meta`, `permanencia_empresa`, `prioridade_30dias`, `maior_meta`
   - IA já corrigida e releitura gerou "Chamar para entrevista" com base nas opções `_opcao`
   - Preenchimento manual desses campos melhoraria o score numérico (atualmente 63,10)

---

## 14. AVALIAÇÃO MENSAL (Módulo Equipe)

Sistema completo de autoavaliação periódica dos colaboradores ativos.

### Fluxo

1. Admin (master) cria um **Link Coletivo** em `/admin/equipe` → aba "Avaliações" → botão "Novo Link"
2. A rota `/api/gerar-link-coletivo` faz um **snapshot** dos colaboradores `ATIVO` ou `TREINAMENTO` no momento da criação, gravando na tabela `links_avaliacao_esperados` (colaborador_id + link_coletivo_id)
3. Cada colaborador recebe o link `/avaliacao-coletiva/[token]` → rota identifica o colaborador via CPF (validado por `/api/validar-cpf-avaliacao`) → redireciona para `/avaliacao-mensal/[token]`
4. Formulário por cargo:
   - **Vendedor** — 5 blocos: Engajamento, Ambição/Objetivo, Ambição/Escalas, Remuneração, Perfil Situacional N/R/E/L (8 pares de alternativas, gera radar e perfil dominante)
   - **Gerente / Caixa** — 4 blocos: Engajamento, Ambição/Objetivo, Ambição/Escalas, Remuneração (sem Bloco 4 / radar)
5. Submit → `/api/salvar-autoavaliacao` → insere em `autoavaliacoes` com `respondido_em = now()`

### Critério unificado de "quem respondeu"

O critério de presença/ausência é baseado em **`periodo = rotulo_do_link`** (string livre, ex: "Julho 2026"), **não** em `link_coletivo_id`. Isso garante que colaboradores que responderam via link individual no mesmo período também sejam contados.

Deduplicação: se um colaborador respondeu via dois links no mesmo período, é contado **uma vez** (Set por `colaborador_id`).

Três superfícies usam este critério:
- **Badge "✓ Respondeu"** na tabela Por Colaborador → `/api/respondidos-periodo?periodo=X`
- **Contador** na lista de links coletivos → `/api/links-coletivos` (campo `total_respondidos`)
- **Painel de pendentes** do link → `/api/pendentes-link?link_id=X`

### lib/perguntas-avaliacao.ts

Fonte única de verdade para todos os enunciados e opções do formulário. Importada tanto por `/avaliacao-mensal/[token]/page.tsx` quanto pelo modal de histórico em `/admin/equipe/page.tsx`. Contém:
- `BLOCO_ENGAJAMENTO`, `BLOCO_AMBICAO_OBJETIVO`, `BLOCO_AMBICAO_ESCALAS`, `BLOCO_AMBICAO_VISAO`, `BLOCO_REMUNERACAO`
- `BLOCO_PERFIL` — 8 pares p1–p8, cada opção com `perfil: 'N'|'R'|'E'|'L'`
- `BLOCO_ABERTO` — `texto_melhoria` e `texto_gestor`
- Helper `labelObjetivo(valor, cargo)` — traduz valor bruto para label legível por cargo

### Modal de histórico de avaliações (admin/equipe)

Exibe todos os blocos com pergunta + resposta. Seções:
- Engajamento (barras de escala)
- Ambição (badge de objetivo + escalas + visão)
- Remuneração
- **Perfil Situacional** — visível somente se `cargo === 'vendedor'`: radar N/R/E/L + lista p1–p8 com letra escolhida destacada
- **Avaliação do Gestor** (`texto_gestor`) — visível somente para usuários com `role === 'master'`
- Aberto (`texto_melhoria`)

### Tabelas relevantes

| Tabela | Colunas principais |
|--------|-------------------|
| `links_avaliacao` | `id`, `token`, `rotulo` (período), `criado_em`, `encerrado` |
| `links_avaliacao_esperados` | `colaborador_id`, `link_coletivo_id` (snapshot de quem devia responder) |
| `autoavaliacoes` | `colaborador_id`, `periodo` (= rotulo), `respondido_em`, `respostas_*`, `mix_pct`, `perfil_dominante`, `respostas_perfil JSONB` |

### Visibilidade gestor vs master

Gestor vê apenas colaboradores da sua `unidade` (loja). Master vê todas as lojas. Filtro aplicado em `/api/pendentes-link`, `/api/respondidos-periodo` e no painel de avaliações.

---

## 15. FLUXO DE CONTRATAÇÃO — NOTAS DE CLAREZA

Após entrevista, as 3 opções de resultado e seus status internos:

| Texto exibido (UI) | Valor enviado à API | Status gravado |
|---|---|---|
| **Aprovado — chamar para treinamento** | `'Contratado'` | `APROVADO` |
| Não contratado | `'Não contratado'` | `REPROVADO` |
| Repescagem | `'Repescagem'` | `BANCO_TALENTOS'` |

O texto "Aprovado — chamar para treinamento" foi escolhido para deixar claro que a decisão é de **convidar para o treinamento**, não uma contratação CLT definitiva naquele momento.

**Mover para Equipe** (passo manual separado, apenas master):
- Campo "Data de início do treinamento" = `data_entrada` gravada em `colaboradores`
- Texto de ajuda: *"Use a data real em que o colaborador começou (ou vai começar) o treinamento na loja."*
- `data_entrada` **não alimenta nenhuma regra automática** — usada apenas para exibição na coluna "Entrada" e cálculo de tempo de casa no momento do desligamento

**Efetivar** (apenas master): move `estado: TREINAMENTO → ATIVO`, grava `data_efetivacao = hoje`. Sem carência mínima de dias.

---

## 16. PRÓXIMAS ETAPAS (backlog)

Pendências estruturais de recrutamento:
1. **Email de convocação** — `RESEND_API_KEY=re_placeholder` no `.env.local` — integração com Resend pendente
2. **Dropdown Places API** — sugestões não aparecem; verificar restrições de HTTP referrers para `seleto-two.vercel.app` no Google Cloud Console
3. **IA de perfil para vendedor** — `analisar-candidato` foi construído para gerente; não há prompt específico para avaliar perfil de vendedor
4. **IA de perfil para caixa** — sem lógica cargo-específica
5. **Detalhe admin — campos vendedor** — formulário `[id]/page.tsx` exibe campos do gerente; vendedor e caixa não têm blocos visuais dedicados

---

## 17. CRON JOBS

### `GET /api/expirar-candidatos` — diário às 05:00 UTC

Definido em `vercel.json`: `"schedule": "0 5 * * *"`. Protegido por `Authorization: Bearer CRON_SECRET`.

**Critério de expiração (prazos diferenciados por status):**
```
WHERE expirado_em IS NULL
  AND status != 'APROVADO'
  AND (
    (status  = 'BANCO_TALENTOS' AND criado_em < agora - 180 dias)
    OR
    (status != 'BANCO_TALENTOS' AND criado_em < agora - 90 dias)
  )
```

**Por que prazos diferentes**: candidatos com `BANCO_TALENTOS` já podem se candidatar novamente a qualquer momento sem nenhum bloqueio — o formulário público reconhece `STATUS_PODE_REFAZER = ['EM_ANDAMENTO', 'BANCO_TALENTOS']` e reutiliza o registro existente. O prazo de 180 dias dá mais janela antes de sumirem da tela do admin. Não existe mecanismo de "reabertura automática" — era um não-problema.

**O que o cron grava por candidato expirado:**
```
expirado_em          = now()
historico_tentativas = [...anterior, snapshot_do_estado_atual]
tentativa_numero    += 1
```

**Efeito do `expirado_em`**: candidato some completamente da listagem de `/admin/candidatos` (query filtra `.is('expirado_em', null)`). O CPF fica liberado para nova candidatura — ao digitar o CPF no formulário público, a rota `/api/verificar-cpf` devolve `{ existe: false, expirado_id }` e o formulário reutiliza o registro expirado preservando o histórico.

---

## 18. PROBLEMAS CONHECIDOS E HISTÓRICO DE BUGS

### Decisões de produto descartadas

| Feature | Data | Motivo |
|---------|------|--------|
| **Notificações automáticas (email/WhatsApp)** | 2026-07-12 | Descartado por decisão do usuário — não é prioridade no momento. Se retomado no futuro: WhatsApp exige provedor oficial (Twilio ou Meta Cloud API) com aprovação de templates, não é "liga e usa". |

### Resolvidos

| Problema | Causa | Solução |
|---------|-------|---------|
| RLS [42501] no insert | `.insert().select('id')` disparava SELECT que bloqueava anon | Gerar UUID no cliente, usar `.insert({id, ...})` sem `.select()` |
| `createClient()` no módulo quebrava SSR | Avaliado durante pre-render estático | Mover para dentro do componente + `export const dynamic = 'force-dynamic'` |
| Análise IA não aparecia no detalhe | Campos `ia_*` não adicionados ao tipo e ao JSX | Adicionados ao type `Candidato` e bloco "Análise IA" |
| `getPerfilUsuario` retornando null | Policy recursiva em `perfis_usuario` | Migrations 011 e 012 removeram policies recursivas |
| Migration de status falhava [23514] | UPDATE vinha depois do ADD CONSTRAINT | Reordenar: UPDATE antes, ADD CONSTRAINT depois |
| Token lookup na Etapa 2 causava RLS violation | Cliente anon para SELECT em `candidatos` | `/api/buscar-candidato-por-token` com service role |
| Data da entrevista um dia antes | `new Date('YYYY-MM-DD')` interpreta UTC midnight → UTC-3 = dia anterior | `formatarDataLocal()` com split direto |
| IA de perfil não rodava (candidato Ricardo) | Vercel cancela fetch pendente após `return` | `after()` do `next/server` em `finalizar-avaliacao` |
| Input de endereço travando na digitação | Conflito React controlled input com Places API | Input não-controlado: `defaultValue` + `onBlur` |
| Google Places 403 ApiTargetBlockedMapError | Places API (New) não adicionada à chave | Adicionar Places API (New) em Credenciais → chave |
| CPF bloqueava candidato de cargo diferente | Verificação era global por CPF | Verificar por CPF + cargo em `/api/verificar-cpf` |
| `@googlemaps/js-api-loader` v2 instalava sem classe `Loader` | Caret `^2.0.2` resolvia para v2 que removeu a classe | Pin exato `1.16.8` no `package.json` |
| VT calculado com tarifa fixa R$4,30 | Valor hardcoded no código | Tarifa dinâmica por município da tabela `configuracoes` |
| `google` namespace não encontrado no TypeScript | `@types/google.maps` não instalado | `acRef` tipado como `any` com eslint-disable |
| Sufixo `', Rio de Janeiro, RJ, Brasil'` hardcoded em `analisar-logistica` | Geocodificação errada para candidatos de Nova Iguaçu e outras cidades | Substituído por `', Brasil'` — endereço completo já vem do ViaCEP |
| Endereço duplicava cidade ao digitar número manualmente | Campo único editável permitia texto livre após ViaCEP | Após CEP válido, `endereco` torna-se somente leitura; `numero` e `complemento` são campos separados concatenados no submit |
| `bloco4` obrigatório para todos os cargos em `salvar-autoavaliacao` | Validação não checava `cargo` | Bloco 4 (perfil N/R/E/L) exigido e calculado apenas para `vendedor`; `respostas_perfil`, `mix_pct` e `perfil_dominante` são null para gerente/caixa |
| Radar Bloco 4 exibia "—" em vez de letra escolhida no modal admin | `aval.respostas_perfil?.[p.id]` retorna objeto, não string | `const letraEscolhida = respostaItem?.resposta ?? null` |

### Comportamentos a conhecer

- **Cache de logística**: resetar exige limpar AMBOS `ia_logistica_analisado_em = NULL` E `tempo_deslocamento = NULL`; após reset, status é sobrescrito para APROVADO_E1 ou REPROVADO — corrigir manualmente se necessário
- **DATE no Postgres**: vem como string `"YYYY-MM-DD"` — nunca passar pelo construtor `new Date()`
- **senha_visivel**: armazenada em texto puro em `perfis_usuario` — campo meramente operacional
- **sessionStorage vendedor**: não há restore de progresso — formulário deve ser preenchido em sessão única
- **enderecoValido = false ao restaurar sessionStorage**: comportamento esperado — candidato precisa re-selecionar o endereço mesmo se sessionStorage restaurar o texto

---

## 19. MIGRATIONS APLICADAS

| Arquivo | O que faz |
|---------|-----------|
| 001_inicial.sql | Schema inicial básico |
| 002_gerente.sql | Schema completo da tabela `candidatos` com 70+ colunas |
| 003_storage_policy.sql | Políticas de storage para bucket `curriculos` |
| 004_update_policy.sql | Policy de UPDATE para authenticated |
| 005_foto.sql | Coluna `foto_url` + bucket `fotos` + policies |
| 006_ia_campos.sql | 7 colunas `ia_*` para análise de perfil |
| 007_fix_rls.sql | Tentativa inicial de correção RLS (substituída por 008) |
| 008_fix_rls_anon.sql | **RLS definitivo**: GRANT INSERT TO anon, policy `anon_insert` |
| 010_perfis.sql | Tabela `perfis_usuario`, RLS, INSERT dos 5 usuários |
| 011_fix_perfis_rls.sql | Adiciona policies simples `leitura_autenticado` / `update_autenticado` |
| 012_fix_perfis_rls_recursion.sql | **Correção crítica**: remove policies recursivas, mantém as de 011 |
| 013_status_pipeline.sql | Constraint de status v1 (substituída por 014) |
| 014_etapas.sql | Remove constraint antiga, 7 colunas de pipeline, migra dados, 13 status |
| 015_entrevista.sql | 10 colunas `entrevista_*` |
| 016_email_candidato.sql | Coluna `email` inicial (refeita em 019) |
| 017_fix_rls_authenticated_insert.sql | GRANT INSERT para `authenticated` |
| 018_vt_estimado.sql | Coluna `vt_mensal_estimado TEXT` |
| 019_email_feedback.sql | Colunas `email TEXT` e `feedback_candidato TEXT` |
| 020_vendedor.sql | 17+ campos de prova vendedor + scores + `perfil_vendedor` |
| 021_logistica_melhorias.sql | `logistica_por_unidade JSONB` + `maior_percentual_meta TEXT` |
| 022_cpf.sql | `cpf TEXT` + índice único parcial `candidatos_cpf_unique` (WHERE cpf IS NOT NULL) |
| 023_gerente_perfil.sql | `perfil_gerente` + 14 colunas `*_opcao` para múltipla escolha |
| 024_caixa.sql | 4 campos caixa + criação da tabela `configuracoes` |
| 025_reprovado_unificado.sql | `motivo_reprovacao` + `turno_faculdade` + `situacao_loja_baguncada` + unificação REPROVADO + nova constraint 11 status |
| 026_nova_candidatura.sql | `historico_anterior JSONB` + `reprovado_em TIMESTAMPTZ` |
| 027_configuracoes_avancadas.sql | Seed das 7 chaves na tabela `configuracoes` (tarifas + tetos + toggle caixa) |
| 028_conducoes_informadas.sql | `conducoes_ida TEXT` + `conducoes_volta TEXT` na tabela `candidatos` |
| 029_ramo_empresa_resultado_valor.sql | `ramo_empresa_atual TEXT` + `ramo_ultima_empresa TEXT` + `maior_resultado_valor TEXT` na tabela `candidatos` |
| 030_emails_unidades.sql | Seed das 4 chaves de email por unidade na tabela `configuracoes` (`email_taquara`, `email_aerotown`, `email_americas`, `email_nova_iguacu`) — `ON CONFLICT DO NOTHING` |

---

## 20. CONFIGURAÇÕES DO SISTEMA

Tabela `configuracoes` (`chave TEXT PK`, `valor TEXT`, `atualizado_em TIMESTAMPTZ`).

| Chave | Valor padrão | Descrição | Onde usado |
|-------|-------------|-----------|-----------|
| `vaga_caixa_ativa` | `'false'` | Toggle card caixa em `/candidatura` | Formulário de seleção de cargo |
| `tarifa_rio_de_janeiro` | `'5.00'` | Tarifa ônibus RJ (Taquara, Aerotown, Américas) | `analisar-logistica` |
| `tarifa_nova_iguacu` | `'6.70'` | Tarifa ônibus Nova Iguaçu | `analisar-logistica` |
| `tarifa_padrao` | `'5.00'` | Tarifa fallback para outros municípios | `analisar-logistica` |
| `salario_max_gerente` | `'8000'` | Teto de pretensão salarial gerente | `analisar-logistica`, admin badge, `verificar-salario.ts` |
| `salario_max_vendedor` | `'4000'` | Teto de pretensão salarial vendedor | idem |
| `salario_max_caixa` | `'2500'` | Teto de pretensão salarial caixa | idem |
| `email_taquara` | `'admin@seleto-tqr.com'` | Email da unidade Taquara | `ModalConvocacao`, configuracoes admin |
| `email_aerotown` | `'admin@seleto-aero.com'` | Email da unidade Aerotown | idem |
| `email_americas` | `'admin@seleto-ame.com'` | Email da unidade Américas | idem |
| `email_nova_iguacu` | `'admin@seleto-nig.com'` | Email da unidade Nova Iguaçu | idem |

**API:**
```
GET  /api/configuracoes?chave=vaga_caixa_ativa
     → { chave, valor }

GET  /api/configuracoes?chaves=tarifa_rio_de_janeiro,tarifa_nova_iguacu
     → [{ chave, valor }, ...]

POST /api/configuracoes  { chave: 'tarifa_nova_iguacu', valor: '7.00' }
     → { ok: true }
```

---

## 21. GOOGLE MAPS E PLACES API

### APIs necessárias (todas habilitadas E adicionadas à chave no Cloud Console)
| API | Uso | Onde |
|-----|-----|------|
| Routes API | `computeRoutes` v2 — cálculo de rotas carro/TP | `analisar-logistica/route.ts` (server-side) |
| Places API (New) | `PlaceAutocompleteElement` — autocomplete de endereço | Formulários no browser |
| Places API (antiga) | Habilitada, não usada ativamente | — |

### Projeto Google Cloud
- **Projeto**: My First Project (conta adrielhenrique)
- **Créditos**: US$ 300 gratuitos por 90 dias + US$ 200/mês permanente após

### Atenções críticas
- `PlaceAutocompleteElement` usa **Places API (New)** — não confundir com Places API (antiga)
- Frontend usa `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (mesmo valor de `GOOGLE_MAPS_API_KEY`)
- A chave deve ter `seleto-two.vercel.app` na lista de HTTP referrers permitidos (ou sem restrição)
- Dropdown de sugestões não aparece se Places API (New) não estiver adicionada à chave
- Versão `@googlemaps/js-api-loader` **pinada em 1.16.8** — v2+ removeu classe `Loader`
