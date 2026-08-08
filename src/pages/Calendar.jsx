import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { EDA_NAV } from '../nav'

// Brief'teki dönem: Ağustos 2026 – Eylül 2027
const FIRST = { year: 2026, month: 7 }
const LAST = { year: 2027, month: 8 }

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const EVENT_TYPES = {
  task: 'Yapılacak',
  exam: 'Sınav',
  interview: 'Mülakat',
  personal: 'Kişisel',
}

const FIELD =
  'w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm ' +
  'outline-none focus:border-accent'

const toKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const monthIndex = ({ year, month }) => year * 12 + month

export default function Calendar() {
  const [cursor, setCursor] = useState(FIRST)
  const [events, setEvents] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', event_type: 'task' })

  const load = useCallback(async () => {
    const [evRes, uniRes] = await Promise.all([
      supabase.from('calendar_events').select('*'),
      supabase.from('universities').select('id, name, application_start, application_deadline'),
    ])
    if (evRes.error) setError(evRes.error.message)
    else setEvents(evRes.data ?? [])
    if (!uniRes.error) setDeadlines(uniRes.data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  // Başvuru tarihleri üniversitelerden otomatik gelir
  const byDay = useMemo(() => {
    const map = {}
    const push = (date, item) => {
      if (!date) return
      ;(map[date] ||= []).push(item)
    }
    for (const uni of deadlines) {
      push(uni.application_start, { kind: 'start', label: `${uni.name} — başvuru açılıyor` })
      push(uni.application_deadline, { kind: 'deadline', label: `${uni.name} — SON TARİH` })
    }
    for (const ev of events) {
      push(ev.start_date, { kind: 'event', label: ev.title, id: ev.id, done: ev.is_done })
    }
    return map
  }, [events, deadlines])

  const { year, month } = cursor
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7   // Pazartesi başlangıç
  const weeks = Math.ceil((leading + daysInMonth) / 7)
  const trailing = weeks * 7 - (leading + daysInMonth)

  const canPrev = monthIndex(cursor) > monthIndex(FIRST)
  const canNext = monthIndex(cursor) < monthIndex(LAST)

  function step(delta) {
    const total = year * 12 + month + delta
    setCursor({ year: Math.floor(total / 12), month: total % 12 })
    setSelected(null)
  }

  async function addEvent(e) {
    e.preventDefault()
    const { error } = await supabase.from('calendar_events').insert({
      title: form.title.trim(),
      event_type: form.event_type,
      start_date: selected,
    })
    if (error) setError(error.message)
    else {
      setForm({ title: '', event_type: 'task' })
      await load()
    }
  }

  async function toggleDone(id, done) {
    await supabase.from('calendar_events').update({ is_done: !done }).eq('id', id)
    await load()
  }

  async function deleteEvent(id) {
    await supabase.from('calendar_events').delete().eq('id', id)
    await load()
  }

  const selectedItems = selected ? byDay[selected] ?? [] : []

  return (
    <Layout nav={EDA_NAV}>
      {/* Masaüstünde ekrana sığar — aşağı kaydırmaya gerek yok */}
      <div className="lg:h-[calc(100dvh-11rem)] flex flex-col lg:flex-row gap-5">

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Başlık ve ay gezinmesi tek satırda — dikey yer kazandırır */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <h1 className="text-2xl sm:text-3xl">
              {MONTHS[month]} <span className="text-ink-faint">{year}</span>
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => step(-1)}
                disabled={!canPrev}
                aria-label="Önceki ay"
                className="grid place-items-center h-10 w-10 rounded-full border-2 border-line
                           font-bold hover:border-accent hover:text-accent
                           disabled:opacity-30 transition"
              >
                ←
              </button>
              <button
                onClick={() => step(1)}
                disabled={!canNext}
                aria-label="Sonraki ay"
                className="grid place-items-center h-10 w-10 rounded-full border-2 border-line
                           font-bold hover:border-accent hover:text-accent
                           disabled:opacity-30 transition"
              >
                →
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-bold text-alert-critical mb-2">{error}</p>}

          <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-line
                          bg-surface overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-line shrink-0">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-1 py-1.5 text-center text-xs font-bold text-ink-soft">
                  {d}
                </div>
              ))}
            </div>

            {/* Satır sayısı aya göre değişir; her satır kalan yüksekliği eşit paylaşır */}
            <div
              className="grid grid-cols-7 flex-1 min-h-0"
              style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: leading }).map((_, i) => (
                <div key={`pad-${i}`} className="border-b border-r border-line bg-canvas/40" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const key = toKey(year, month, day)
                const items = byDay[key] ?? []
                const isSelected = selected === key

                return (
                  <button
                    key={key}
                    onClick={() => setSelected(isSelected ? null : key)}
                    className={`min-h-14 lg:min-h-0 overflow-hidden border-b border-r border-line
                                p-1 text-left align-top transition hover:bg-accent-soft/40
                                ${isSelected ? 'bg-accent-soft' : ''}`}
                  >
                    <span className="text-xs font-bold text-ink-soft">{day}</span>

                    {/* Telefonda etiket sığmaz — renkli nokta gösteriliyor */}
                    <div className="mt-1 flex gap-0.5 sm:hidden">
                      {items.slice(0, 4).map((item, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.kind === 'deadline' ? 'bg-accent'
                            : item.kind === 'start' ? 'bg-mint'
                            : 'bg-amber'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-0.5 space-y-0.5 hidden sm:block">
                      {items.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className={`truncate rounded px-1 py-0.5 text-[11px] font-semibold leading-tight ${
                            item.kind === 'deadline'
                              ? 'bg-accent-soft text-accent-dark'
                              : item.kind === 'start'
                              ? 'bg-mint-soft text-mint'
                              : item.done
                              ? 'bg-line/50 text-ink-faint line-through'
                              : 'bg-surface-2 text-ink-soft'
                          }`}
                        >
                          {item.label}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div className="text-[11px] font-bold text-ink-soft">
                          +{items.length - 2}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}

              {Array.from({ length: trailing }).map((_, i) => (
                <div key={`tail-${i}`} className="border-b border-r border-line bg-canvas/40" />
              ))}
            </div>
          </div>
        </div>

        {/* Seçili gün sağda duruyor — takvimi aşağı itmiyor */}
        <aside className="lg:w-80 shrink-0 lg:overflow-y-auto rounded-2xl border border-line
                          bg-surface p-5">
          {!selected ? (
            <div className="h-full grid place-items-center text-center py-6">
              <div>
                <p className="font-bold mb-1">Bir güne tıkla</p>
                <p className="text-sm text-ink-soft">
                  O günün planlarını görür, yenisini eklersin.
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg mb-4">
                {new Date(selected).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long', weekday: 'long',
                })}
              </h2>

              {selectedItems.length > 0 ? (
                <ul className="space-y-2 mb-5">
                  {selectedItems.map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className={item.done ? 'line-through text-ink-faint' : ''}>
                          {item.label}
                        </span>
                        {item.kind === 'event' && (
                          <span className="flex gap-2 shrink-0">
                            <button
                              onClick={() => toggleDone(item.id, item.done)}
                              className="text-xs font-bold text-ink-faint hover:text-mint transition"
                            >
                              {item.done ? 'geri al' : 'bitti'}
                            </button>
                            <button
                              onClick={() => deleteEvent(item.id)}
                              className="text-xs font-bold text-ink-faint hover:text-accent transition"
                            >
                              sil
                            </button>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft mb-5">Bu güne bir şey eklenmemiş.</p>
              )}

              <form onSubmit={addEvent} className="space-y-3 pt-4 border-t border-line">
                <div>
                  <label className="block text-sm font-bold text-ink-soft mb-1.5">
                    Ne yapacaksın?
                  </label>
                  <input
                    className={FIELD}
                    required
                    placeholder="TCF sınavına çalış"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-soft mb-1.5">Tür</label>
                  <select
                    className={FIELD}
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  >
                    {Object.entries(EVENT_TYPES).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white
                             hover:bg-accent-dark transition"
                >
                  Ekle
                </button>
              </form>
            </>
          )}
        </aside>
      </div>
    </Layout>
  )
}
