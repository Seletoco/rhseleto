// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PerguntaEscala = {
  coluna: string
  label: string
  descricao: string
  escala: '1-5' | '0-10'
}

export type PerguntaTexto = {
  coluna: string
  label: string
  placeholder?: string
}

export type OpcaoEnum = {
  valor: string
  texto: string
}

export type PerguntaEnum = {
  coluna: string
  label: string
  opcoesPorCargo: Record<string, OpcaoEnum[]>
}

export type OpcaoPerfil = {
  letra: string
  texto: string
  perfil: 'N' | 'R' | 'E' | 'L'
}

export type PerguntaPerfil = {
  id: string
  pergunta: string
  opcoes: OpcaoPerfil[]
}

// ─── Bloco 1 — Engajamento ────────────────────────────────────────────────────

export const BLOCO_ENGAJAMENTO: PerguntaEscala[] = [
  {
    coluna: 'eng_pertencimento',
    label: 'Pertencimento',
    descricao: 'Quanto você se sente parte desta loja? (1 = pouco, 5 = muito)',
    escala: '1-5',
  },
  {
    coluna: 'eng_longevidade',
    label: 'Longevidade',
    descricao: 'O quanto você se imagina aqui daqui a 1 ano? (1 = improvável, 5 = com certeza)',
    escala: '1-5',
  },
  {
    coluna: 'eng_enps',
    label: 'eNPS',
    descricao: 'O quanto você indicaria a SELETO como lugar pra trabalhar? (0 = jamais · 10 = com certeza)',
    escala: '0-10',
  },
]

// ─── Bloco 2 — Ambição ────────────────────────────────────────────────────────

export const BLOCO_AMBICAO_OBJETIVO: PerguntaEnum = {
  coluna: 'amb_objetivo',
  label: 'Objetivo nos próximos 3 meses',
  opcoesPorCargo: {
    vendedor: [
      { valor: 'lideranca',   texto: 'Crescer para liderança (virar gerente/sócio)' },
      { valor: 'salario',     texto: 'Ganhar um bom salário / crescer financeiramente' },
      { valor: 'experiencia', texto: 'Ganhar experiência e me desenvolver' },
      { valor: 'indefinido',  texto: 'Ainda não sei / estou descobrindo' },
    ],
    gerente: [
      { valor: 'crescer_supervisao', texto: 'Crescer para Supervisão / sociedade na empresa' },
      { valor: 'expandir_lojas',     texto: 'Expandir e liderar mais lojas' },
      { valor: 'salario',            texto: 'Ganhar um bom salário / crescer financeiramente' },
      { valor: 'realizado',          texto: 'Estou realizado no cargo atual' },
    ],
    caixa: [
      { valor: 'crescer_administrativo', texto: 'Crescer para área administrativa da empresa' },
      { valor: 'ir_para_vendas',         texto: 'Oportunidade de ir para vendas' },
      { valor: 'lideranca',              texto: 'Crescer para liderança / gerência' },
      { valor: 'salario',                texto: 'Ganhar um bom salário / estabilidade' },
      { valor: 'indefinido',             texto: 'Ainda não sei / estou descobrindo' },
    ],
  },
}

export const BLOCO_AMBICAO_ESCALAS: PerguntaEscala[] = [
  {
    coluna: 'amb_responsabilidades',
    label: 'Responsabilidades',
    descricao: 'Sente que tem responsabilidades na medida certa? (1 = pouco, 5 = muito)',
    escala: '1-5',
  },
]

export const BLOCO_AMBICAO_VISAO: PerguntaTexto = {
  coluna: 'amb_visao_2anos',
  label: 'Como você se vê daqui a 2 anos?',
  placeholder: 'Escreva aqui…',
}

// ─── Bloco 3 — Remuneração ────────────────────────────────────────────────────

export const BLOCO_REMUNERACAO: PerguntaEscala[] = [
  {
    coluna: 'rem_justa',
    label: 'Remuneração justa',
    descricao: 'Sente que sua remuneração é justa? (1 = não, 5 = sim)',
    escala: '1-5',
  },
  {
    coluna: 'rem_reconhecimento',
    label: 'Reconhecimento',
    descricao: 'Sente que seu esforço é reconhecido? (1 = não, 5 = sim)',
    escala: '1-5',
  },
]

// ─── Bloco 4 — Perfil Situacional ────────────────────────────────────────────

export const BLOCO_PERFIL: PerguntaPerfil[] = [
  {
    id: 'p1',
    pergunta: 'Chega uma peça nova na loja. O que você faz primeiro?',
    opcoes: [
      { letra: 'A', texto: 'Penso em quais clientes meus iam querer e já chamo', perfil: 'R' },
      { letra: 'B', texto: 'Reparo bem nela pra saber indicar pra quem combina', perfil: 'N' },
      { letra: 'C', texto: 'Vejo onde encaixa na loja e organizo a exposição', perfil: 'L' },
      { letra: 'D', texto: 'Organizo as peças pra fazer grade e dar entrada em nota', perfil: 'E' },
    ],
  },
  {
    id: 'p2',
    pergunta: 'A loja está vazia há uma hora. Sua reação:',
    opcoes: [
      { letra: 'A', texto: 'Uso o tempo pra fortalecer relação com quem aparecer', perfil: 'R' },
      { letra: 'B', texto: 'Puxo a equipe pra fazer algo produtivo junto', perfil: 'L' },
      { letra: 'C', texto: 'Chamo clientes antigos no WhatsApp pra trazer movimento', perfil: 'N' },
      { letra: 'D', texto: 'Organizo, reponho, deixo tudo pronto pro movimento', perfil: 'E' },
    ],
  },
  {
    id: 'p3',
    pergunta: 'Um cliente diz "vou pensar e volto depois":',
    opcoes: [
      { letra: 'A', texto: 'Anoto o contato e faço um follow-up organizado', perfil: 'E' },
      { letra: 'B', texto: 'Insisto com uma condição especial pra fechar agora', perfil: 'N' },
      { letra: 'C', texto: 'Apresento uma peça a mais que combine, pra agregar valor à decisão', perfil: 'L' },
      { letra: 'D', texto: 'Deixo ele à vontade, crio vínculo pra ele voltar', perfil: 'R' },
    ],
  },
  {
    id: 'p4',
    pergunta: 'O que mais te dá satisfação no trabalho?',
    opcoes: [
      { letra: 'A', texto: 'Ajudar um colega a vender melhor', perfil: 'L' },
      { letra: 'B', texto: 'Uma loja bem organizada e processos redondos', perfil: 'E' },
      { letra: 'C', texto: 'Cliente que volta e vira meu freguês', perfil: 'R' },
      { letra: 'D', texto: 'Bater meta e ver meu número crescer', perfil: 'N' },
    ],
  },
  {
    id: 'p5',
    pergunta: 'Um colega novo está com dificuldade. Você:',
    opcoes: [
      { letra: 'A', texto: 'Mostro na prática como eu abordo e fecho uma venda', perfil: 'N' },
      { letra: 'B', texto: 'Mostro como faço do meu jeito organizado', perfil: 'E' },
      { letra: 'C', texto: 'Paro pra treinar e acompanhar ele', perfil: 'L' },
      { letra: 'D', texto: 'Dou uma força pontual quando ele pede', perfil: 'R' },
    ],
  },
  {
    id: 'p6',
    pergunta: 'Como você encara as metas da loja?',
    opcoes: [
      { letra: 'A', texto: 'Sigo o ritmo certinho pra cumprir sem falhar', perfil: 'E' },
      { letra: 'B', texto: 'Bato a minha, mas gosto quando todos batem juntos', perfil: 'R' },
      { letra: 'C', texto: 'Penso na meta da loja toda, não só na minha', perfil: 'L' },
      { letra: 'D', texto: 'Foco total na minha meta e busco sempre superá-la', perfil: 'N' },
    ],
  },
  {
    id: 'p7',
    pergunta: 'Frase que mais combina com você:',
    opcoes: [
      { letra: 'A', texto: 'Meu cliente confia em mim, isso vale mais que uma venda', perfil: 'R' },
      { letra: 'B', texto: 'Quando eu vou bem, puxo a equipe junto', perfil: 'L' },
      { letra: 'C', texto: 'Gosto de fazer bem feito, do começo ao fim', perfil: 'E' },
      { letra: 'D', texto: 'Vendo pra qualquer um, é só questão de abordagem', perfil: 'N' },
    ],
  },
  {
    id: 'p8',
    pergunta: 'Daqui a um tempo, você se vê:',
    opcoes: [
      { letra: 'A', texto: 'Liderando uma equipe / virando gerente', perfil: 'L' },
      { letra: 'B', texto: 'Sendo o maior vendedor da rede', perfil: 'N' },
      { letra: 'C', texto: 'Com uma cartela fiel de clientes que só compram comigo', perfil: 'R' },
      { letra: 'D', texto: 'Dominando toda a operação da loja', perfil: 'E' },
    ],
  },
]

// ─── Bloco 5 — Aberto ─────────────────────────────────────────────────────────

export const BLOCO_ABERTO: PerguntaTexto[] = [
  {
    coluna: 'texto_melhoria',
    label: 'O que pode melhorar na loja ou no time? (opcional)',
    placeholder: 'Escreva aqui…',
  },
  {
    coluna: 'texto_gestor',
    label: 'Mensagem para o gestor (opcional · confidencial)',
    placeholder: 'Escreva aqui…',
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Retorna o texto legível de um valor de amb_objetivo para um dado cargo.
 * Se não encontrar, retorna o próprio valor.
 */
export function labelObjetivo(valor: string | null | undefined, cargo: string): string {
  if (!valor) return '—'
  const opcoes =
    BLOCO_AMBICAO_OBJETIVO.opcoesPorCargo[cargo] ??
    BLOCO_AMBICAO_OBJETIVO.opcoesPorCargo['vendedor']
  const found = opcoes.find((o) => o.valor === valor)
  return found ? found.texto : valor
}
