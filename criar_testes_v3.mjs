import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zgnyrjaekydwlsvxtfxo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── TESTE FINAL NATO ─────────────────────────────────────────
// 13 respostas: 11N + 1R + 1E
// Todos os pares coerentes → 0 divergências → coer=100
// mix_pct: N=84.62, R=7.69, E=7.69, L=0
// Esperado: score≈87, perfil=N, classificação=A
const quizNato = {
  versao: 'v3',
  seed: 9001,
  respostas: {
    tensao_meta_fim_dia:        { perfil: 'N', grupo: 'p1', peso: 1 },
    meta_loja_individual_atras: { perfil: 'N', grupo: 'p1', peso: 1 },
    cliente_vou_pensar:         { perfil: 'N', grupo: 'p2', peso: 1 },
    frase_combina_1:            { perfil: 'N', grupo: 'p2', peso: 1 },
    reacao_tres_perdas:         { perfil: 'N', grupo: 'p3', peso: 1 },
    loja_sem_movimento:         { perfil: 'N', grupo: 'p3', peso: 1 },
    elogio_preferido_1:         { perfil: 'N', grupo: 'p4', peso: 1 },
    peso_mudar_trabalho:        { perfil: 'N', grupo: 'p4', peso: 1 },
    sucesso_futuro:             { perfil: 'N', grupo: 'p4', peso: 1 },
    chega_peca_nova:            { perfil: 'N', grupo: 'p5', peso: 1 },
    inicio_turno:               { perfil: 'N', grupo: 'p5', peso: 1 },
    velocidade_abordagem:       { perfil: 'R', grupo: 'extra', peso: 1 },
    estilo_negociacao:          { perfil: 'E', grupo: 'extra', peso: 1 },
  },
  objetivas: { tipo_saida: 'Fui demitido', tempo_ultimo_emprego: '1 ano' },
  mix_contagem: { N: 11, R: 1, E: 1, L: 0 },
  mix_pct: { N: 84.62, R: 7.69, E: 7.69, L: 0 },
}

// ── TESTE FINAL MONTADO ──────────────────────────────────────
// 12 respostas: 2N + 3R + 3E + 4L
// 3 pares divergentes → coer=55, cap at 55
// mix_pct: N=16.67, R=25, E=25, L=33.33
// Esperado: score≈38, perfil=L, classificação=D
const quizMontado = {
  versao: 'v3',
  seed: 9002,
  respostas: {
    // pair 1: N vs R → DIV 1
    tensao_meta_fim_dia:        { perfil: 'N', grupo: 'p1', peso: 1 },
    meta_loja_individual_atras: { perfil: 'R', grupo: 'p1', peso: 1 },
    // pair 2: E vs L → DIV 2
    cliente_vou_pensar:         { perfil: 'E', grupo: 'p2', peso: 1 },
    frase_combina_1:            { perfil: 'L', grupo: 'p2', peso: 1 },
    // pair 3: R vs N → DIV 3
    reacao_tres_perdas:         { perfil: 'R', grupo: 'p3', peso: 1 },
    loja_sem_movimento:         { perfil: 'N', grupo: 'p3', peso: 1 },
    // pair 4: all L → no div
    elogio_preferido_1:         { perfil: 'L', grupo: 'p4', peso: 1 },
    peso_mudar_trabalho:        { perfil: 'L', grupo: 'p4', peso: 1 },
    sucesso_futuro:             { perfil: 'L', grupo: 'p4', peso: 1 },
    // pair 5: all E → no div
    chega_peca_nova:            { perfil: 'E', grupo: 'p5', peso: 1 },
    inicio_turno:               { perfil: 'E', grupo: 'p5', peso: 1 },
    // extra
    estilo_negociacao:          { perfil: 'R', grupo: 'extra', peso: 1 },
  },
  objetivas: { tipo_saida: 'Me pediram para sair', tempo_ultimo_emprego: '6 meses' },
  mix_contagem: { N: 2, R: 3, E: 3, L: 4 },
  mix_pct: { N: 16.67, R: 25, E: 25, L: 33.33 },
}

const candidatos = [
  {
    nome: 'TESTE FINAL NATO',
    cpf: '000.000.000-04',
    cargo: 'vendedor',
    status: 'BANCO_TALENTOS',
    quiz_vendedor_v3: quizNato,
  },
  {
    nome: 'TESTE FINAL MONTADO',
    cpf: '000.000.000-05',
    cargo: 'vendedor',
    status: 'BANCO_TALENTOS',
    quiz_vendedor_v3: quizMontado,
  },
]

const { data: inserted, error } = await supabase
  .from('candidatos')
  .insert(candidatos)
  .select('id, nome')

if (error) { console.error('INSERT error:', error); process.exit(1) }
console.log('Inseridos:', inserted)

// Calcular scores via salvar-score-vendedor
for (const c of inserted) {
  const res = await fetch('http://localhost:3000/api/salvar-score-vendedor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidato_id: c.id }),
  })
  const json = await res.json()
  console.log(`Score para ${c.nome}:`, json)
}

// Buscar scores salvos
await new Promise(r => setTimeout(r, 1000))
const ids = inserted.map(c => c.id)
const { data: scores } = await supabase
  .from('candidatos')
  .select('nome, score_final, perfil, perfil_vendedor, score_vocacao, score_comprometimento_v, score_comunicacao, score_disciplina_v, alertas')
  .in('id', ids)

console.log('\n── Scores calculados ──────────────────────────────')
for (const s of scores) {
  console.log(`\n${s.nome}`)
  console.log(`  score_final:    ${s.score_final}`)
  console.log(`  perfil (grade): ${s.perfil}`)
  console.log(`  perfil_vendedor: ${s.perfil_vendedor}`)
  console.log(`  score_nato (vocacao):  ${s.score_vocacao}`)
  console.log(`  score_equilibrio (comp_v): ${s.score_comprometimento_v}`)
  console.log(`  score_coerencia (comunic): ${s.score_comunicacao}`)
  console.log(`  divergencias (disciplina): ${s.score_disciplina_v}`)
  console.log(`  alertas: ${JSON.stringify(s.alertas)}`)
}
