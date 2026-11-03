'use client'

import { useState, useMemo } from 'react'

const EMAIL_UNIDADE: Record<string, string> = {
  Taquara: 'admin@seleto-tqr.com',
  Aerotown: 'admin@seleto-aero.com',
  Americas: 'admin@seleto-ame.com',
  'Nova Iguaçu': 'admin@seleto-nig.com',
}

const CARGO_LABEL: Record<string, string> = {
  gerente: 'Gerente de Loja',
  vendedor: 'Vendedor(a)',
  caixa: 'Operador(a) de Caixa',
}

function diaAnterior(dataISO: string): string {
  if (!dataISO) return ''
  const d = new Date(dataISO + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  const [y, m, d] = dataISO.split('-')
  return `${d}/${m}/${y}`
}

function limparTelefone(tel: string): string {
  return tel.replace(/\D/g, '')
}

function gerarMensagemWhatsApp(
  tipo: 'individual' | 'coletiva',
  nome: string,
  data: string,
  hora: string,
  modalidade: string,
  local: string,
  gestor: string,
): string {
  const dataFmt = formatarData(data)
  const diaAntes = diaAnterior(data)

  if (tipo === 'individual') {
    const localLinha =
      modalidade === 'Presencial'
        ? `Local: ${local}`
        : `Formato: Online — o link será enviado em breve`
    return `Olá, ${nome}!
Parabéns pela aprovação na triagem! Você avançou para a entrevista do processo seletivo da Seleto Store.
Data: ${dataFmt}
Horário: ${hora}h
${localLinha}
Por favor, confirme sua presença respondendo SIM ou NÃO até ${diaAntes}.
Qualquer dúvida, é só chamar aqui.
${gestor} — Seleto Store`
  }

  return `Olá, ${nome}!
Parabéns! Você foi selecionado para participar da nossa dinâmica de grupo — próxima etapa do processo seletivo da Seleto Store.
Data: ${dataFmt}
Horário: ${hora}h
Local: ${local}
Por favor, confirme sua presença respondendo SIM ou NÃO até ${diaAntes}.
Qualquer dúvida, estou à disposição.
${gestor} — Seleto Store | Processo Seletivo`
}

type Props = {
  candidatoId: string
  candidatoNome: string
  candidatoWhatsapp: string | null | undefined
  candidatoEmail: string | null | undefined
  candidatoCargo: string | null | undefined
  candidatoUnidades: string[] | null | undefined
  emailsUnidade?: Record<string, string>
  gestorUnidade?: string | null
  onClose: () => void
  onSuccess: (dados: {
    entrevista_data: string
    entrevista_hora: string
    entrevista_modalidade: string
    entrevista_local: string
    entrevista_gestor: string
    entrevista_email_unidade: string
    entrevista_tipo: string
  }) => void
}

export function ModalConvocacao({
  candidatoId,
  candidatoNome,
  candidatoWhatsapp,
  candidatoEmail,
  candidatoCargo,
  candidatoUnidades,
  emailsUnidade,
  gestorUnidade,
  onClose,
  onSuccess,
}: Props) {
  const unidades = candidatoUnidades ?? []

  // Determina a unidade alvo para pré-preencher o email:
  // 1 unidade → usa ela diretamente
  // múltiplas + gestor com unidade na lista → usa a unidade do gestor
  // demais casos (master ou sem match) → usa a primeira unidade
  const unidadeAlvo: string | undefined =
    unidades.length === 1
      ? unidades[0]
      : gestorUnidade && unidades.includes(gestorUnidade)
        ? gestorUnidade
        : unidades[0]

  // Tenta email configurável; fallback para hardcoded
  const emailPadrao = unidadeAlvo
    ? ((emailsUnidade?.[unidadeAlvo] ?? EMAIL_UNIDADE[unidadeAlvo]) ?? '')
    : ''

  // Emails para a datalist: mescla configuráveis (preferencial) com hardcoded
  const todosEmails = Object.keys(EMAIL_UNIDADE).map(
    u => emailsUnidade?.[u] ?? EMAIL_UNIDADE[u]
  )

  const [tipo, setTipo] = useState<'individual' | 'coletiva'>('individual')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [modalidade, setModalidade] = useState('Presencial')
  const [local, setLocal] = useState('')
  const [gestor, setGestor] = useState('')
  const [emailUnidade, setEmailUnidade] = useState(emailPadrao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const mensagemPreview = useMemo(
    () => gerarMensagemWhatsApp(tipo, candidatoNome, data, hora, modalidade, local, gestor),
    [tipo, candidatoNome, data, hora, modalidade, local, gestor],
  )

  const podeSalvar =
    data.trim() !== '' &&
    hora.trim() !== '' &&
    gestor.trim() !== '' &&
    (modalidade === 'Online' || local.trim() !== '')

  function handleTipo(t: 'individual' | 'coletiva') {
    setTipo(t)
    setEmailUnidade(t === 'individual' ? emailPadrao : '')
  }

  function gerarMailtoLink(): string {
    const cargoLabel = CARGO_LABEL[candidatoCargo ?? ''] ?? (candidatoCargo ?? 'a vaga')
    const dataFmt = formatarData(data)
    const localLinha =
      modalidade === 'Online'
        ? 'Online — o link será enviado em breve'
        : local

    const body =
      `Olá, ${candidatoNome}!\n\n` +
      `Você foi selecionado(a) para uma entrevista para a vaga de ${cargoLabel} na SELETO.\n\n` +
      `📅 Data: ${dataFmt}\n` +
      `🕐 Horário: ${hora}h\n` +
      `📍 Modalidade: ${modalidade}\n` +
      `🏠 Local: ${localLinha}\n` +
      `👤 Responsável: ${gestor}\n\n` +
      `Por favor, confirme sua presença respondendo este e-mail ou entre em contato pelo WhatsApp da loja.\n\n` +
      `Caso não possa comparecer, nos avise com antecedência.\n\n` +
      `Equipe SELETO\n` +
      (emailUnidade ? emailUnidade : '')

    const subject = encodeURIComponent('Convocação para Entrevista — SELETO')
    const encodedBody = encodeURIComponent(body)
    const to = candidatoEmail ?? ''
    const cc = emailUnidade ? `&cc=${encodeURIComponent(emailUnidade)}` : ''
    return `mailto:${to}?subject=${subject}${cc}&body=${encodedBody}`
  }

  async function salvarNoBanco() {
    const res = await fetch('/api/agendar-entrevista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidato_id: candidatoId,
        entrevista_data: data,
        entrevista_hora: hora,
        entrevista_modalidade: modalidade,
        entrevista_local: local,
        entrevista_gestor: gestor,
        entrevista_email_unidade: emailUnidade,
        entrevista_tipo: tipo,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error ?? 'Erro ao salvar')
    }
  }

  const dadosSuccess = {
    entrevista_data: data,
    entrevista_hora: hora,
    entrevista_modalidade: modalidade,
    entrevista_local: local,
    entrevista_gestor: gestor,
    entrevista_email_unidade: emailUnidade,
    entrevista_tipo: tipo,
  }

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    setErro('')
    try {
      await salvarNoBanco()
      onSuccess(dadosSuccess)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setSalvando(false)
    }
  }

  async function abrirGmail() {
    if (!podeSalvar || !candidatoEmail) return
    setSalvando(true)
    setErro('')
    try {
      await salvarNoBanco()
      window.open(gerarMailtoLink(), '_blank', 'noopener,noreferrer')
      onSuccess(dadosSuccess)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setSalvando(false)
    }
  }

  function abrirWhatsApp() {
    if (!candidatoWhatsapp) return
    const num = limparTelefone(candidatoWhatsapp)
    const url = `https://wa.me/55${num}?text=${encodeURIComponent(mensagemPreview)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[640px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Convocar para entrevista</h2>
          <button
            onClick={onClose}
            className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Toggle tipo */}
          <div className="flex gap-2">
            {(['individual', 'coletiva'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTipo(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipo === t
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB]'
                }`}
              >
                {t === 'individual' ? 'Individual' : 'Coletiva / Dinâmica'}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Horário</label>
              <input
                type="text"
                placeholder="Ex: 14:00"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
              />
            </div>
          </div>

          {tipo === 'individual' && (
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Modalidade</label>
              <div className="flex gap-2">
                {['Presencial', 'Online'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setModalidade(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      modalidade === m
                        ? 'bg-[#0A0A0A] text-white'
                        : 'bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(tipo === 'coletiva' || modalidade === 'Presencial') && (
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Local</label>
              <input
                type="text"
                placeholder="Ex: Loja Taquara — Rua X, 123"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[#6B6B6B] mb-1 block">
              {tipo === 'individual' ? 'Nome do gestor' : 'Nome do responsável RH'}
            </label>
            <input
              type="text"
              placeholder="Ex: Rafael"
              value={gestor}
              onChange={(e) => setGestor(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-[#6B6B6B] mb-1 block">E-mail de envio</label>
            <input
              type="email"
              list={tipo === 'individual' ? 'emails-unidade-list' : undefined}
              placeholder={tipo === 'coletiva' ? 'Ex: rh@seleto.com.br' : 'admin@seleto-xxx.com'}
              value={emailUnidade}
              onChange={(e) => setEmailUnidade(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
            {tipo === 'individual' && (
              <datalist id="emails-unidade-list">
                {todosEmails.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            )}
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-[#6B6B6B] mb-2">Preview da mensagem</p>
            <div className="bg-[#F9FAFB] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] whitespace-pre-wrap leading-relaxed border border-[#E5E5E5]">
              {mensagemPreview}
            </div>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] space-y-2">
          <div className="flex gap-3">
            <button
              onClick={abrirWhatsApp}
              disabled={!candidatoWhatsapp || !podeSalvar}
              className="flex-1 bg-[#25D366] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1ebe5d] transition-colors disabled:opacity-40"
            >
              Abrir no WhatsApp
            </button>
            {candidatoEmail ? (
              <button
                onClick={abrirGmail}
                disabled={salvando || !podeSalvar}
                className="flex-1 bg-white border border-[#0A0A0A] text-[#0A0A0A] text-sm font-medium py-2.5 rounded-lg hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
              >
                ✉️ Abrir no Gmail
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-[#B0B0B0]">⚠️ Candidato não informou e-mail</p>
              </div>
            )}
          </div>

          {/* Indicador de email */}
          <p className={`text-xs ${candidatoEmail ? 'text-green-600' : 'text-[#B0B0B0]'}`}>
            {candidatoEmail
              ? `✉️ Email pré-preenchido para: ${candidatoEmail}`
              : '✉️ Sem email cadastrado'}
          </p>

          <button
            onClick={salvar}
            disabled={salvando || !podeSalvar}
            className="w-full bg-[#0A0A0A] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar convocação'}
          </button>
        </div>
      </div>
    </div>
  )
}
