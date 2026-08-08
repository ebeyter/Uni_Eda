const ALERT_STYLES = {
  critical: { bar: 'bg-alert-critical', text: 'text-alert-critical', label: 'Son günler' },
  warning:  { bar: 'bg-alert-warning',  text: 'text-alert-warning',  label: 'Yaklaşıyor' },
  missed:   { bar: 'bg-alert-critical', text: 'text-alert-critical', label: 'Tarih geçti' },
  ok:       { bar: 'bg-alert-ok',       text: 'text-alert-ok',       label: 'Zaman var' },
  no_date:  { bar: 'bg-line',           text: 'text-ink-faint',      label: 'Tarih girilmedi' },
  none:     { bar: 'bg-line',           text: 'text-ink-faint',      label: 'Tamamlandı' },
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function DeadlineCard({ item }) {
  const style = ALERT_STYLES[item.alert_level] ?? ALERT_STYLES.ok
  const days = item.days_left

  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-surface p-5">
      {/* Sol kenardaki renk şeridi — uyarı seviyesini bir bakışta gösterir */}
      <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg truncate">{item.name}</h3>
          <p className="text-sm text-ink-soft mt-0.5">
            {[item.city, item.country].filter(Boolean).join(', ')}
          </p>
        </div>

        <div className="text-right shrink-0">
          {days === null || days === undefined ? (
            <span className="text-sm text-ink-faint">{style.label}</span>
          ) : (
            <>
              <div className={`font-serif text-2xl leading-none ${style.text}`}>
                {days < 0 ? `${Math.abs(days)}` : days}
              </div>
              <div className="text-xs text-ink-faint mt-1">
                {days < 0 ? 'gün geçti' : 'gün kaldı'}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line flex justify-between text-xs text-ink-faint">
        <span>Son tarih</span>
        <span className="text-ink-soft">{formatDate(item.application_deadline)}</span>
      </div>
    </article>
  )
}
