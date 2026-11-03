export const STATUS_CONFIG = {
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    cor_fundo: '#F3F4F6',
    cor_texto: '#6B7280',
    etapa: 1,
    descricao: 'Cadastro em andamento ou avaliação não concluída',
  },
  PROVA_FEITA: {
    label: 'Prova Feita',
    cor_fundo: '#DBEAFE',
    cor_texto: '#1D4ED8',
    etapa: 2,
    descricao: 'Avaliação concluída, aguardando convocação',
  },
  ENTREVISTA_AGENDADA: {
    label: 'Entrevista Agendada',
    cor_fundo: '#FFF7ED',
    cor_texto: '#C2410C',
    etapa: 3,
    descricao: 'Convocado para entrevista',
  },
  APROVADO: {
    label: 'Aprovado',
    cor_fundo: '#166534',
    cor_texto: '#FFFFFF',
    etapa: 3,
    descricao: 'Contratado',
  },
  BANCO_TALENTOS: {
    label: 'Banco de Talentos',
    cor_fundo: '#F3F4F6',
    cor_texto: '#6B7280',
    etapa: 2,
    descricao: 'Guardado para futuras oportunidades',
  },
  REPROVADO: {
    label: 'Reprovado',
    cor_fundo: '#DC2626',
    cor_texto: '#FFFFFF',
    etapa: 1,
    descricao: 'Não aprovado no processo seletivo',
  },
} as const

export type StatusCandidato = keyof typeof STATUS_CONFIG
