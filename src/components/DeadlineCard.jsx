import { formatDate } from '../lib/format'

const ALERT_STYLES = {
  critical: { bg: 'bg-accent-soft',  ring: 'border-accent',        text: 'text-accent-dark', label: 'Son günler' },
  missed:   { bg: 'bg-accent-soft',  ring: 'border-accent',        text: 'text-accent-dark', label: 'Tarih geçti' },
  warning:  { bg: 'bg-surface-2',    ring: 'border-amber',         text: 'text-alert-warning', label: 'Yaklaşıyor' },
  ok:       { bg: 'bg-mint-soft',    ring: 'border-mint',          text: 'text-mint',        label: 'Zaman var' },
  no_date:  { bg: 'bg-surface',      ring: 'border-line',          text: 'text-ink-faint',   label: 'Tarih girilmedi' },
  none:     { bg: 'bg-surface',      ring: 'border-line',          text: 'text-ink-faint',   label: 'Tamamlandı' },
}

export default function DeadlineCard({ item }) {
  const style = ALERT_STYLES[item.alert_level] ?? ALERT_STYLES.ok
  const days = item.days_left

  return (
    <article
      className={`min-w-0 rounded-2xl border-2 ${style.ring} ${style.bg} p-5
                  transition hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold truncate">{item.name}</h3>
          <p className="text-sm font-semibold text-ink-soft mt-0.5 truncate">
            {[item.city, item.country].filter(Boolean).join(', ')}
          </p>
        </div>

        <div className="text-right shrink-0">
          {days === null || days === undefined ? (
            <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
          ) : (
            <>
              <div className={`font-display text-4xl font-bold leading-none ${style.text}`}>
                {Math.abs(days)}
              </div>
              <div className="text-xs font-bold text-ink-soft mt-1">
                {days < 0 ? 'gün geçti' : 'gün kaldı'}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line/70 flex justify-between text-sm">
        <span className="font-semibold text-ink-soft">Son tarih</span>
        <span className="font-bold">{formatDate(item.application_deadline)}</span>
      </div>
    </article>
  )
}
