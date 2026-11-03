import { STATUS_CONFIG } from '@/lib/status'

export function StatusChip({
  status,
  showEtapa = false,
}: {
  status: string
  showEtapa?: boolean
}) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]

  if (!cfg) {
    return (
      <span
        style={{ backgroundColor: '#E5E5E5', color: '#0A0A0A' }}
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      >
        {status}
      </span>
    )
  }

  return (
    <span
      style={{ backgroundColor: cfg.cor_fundo, color: cfg.cor_texto }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
    >
      {showEtapa && (
        <span className="opacity-60">E{cfg.etapa}</span>
      )}
      {cfg.label}
    </span>
  )
}
