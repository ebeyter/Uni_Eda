import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { EDA_NAV } from '../nav'

// Brief'teki dönem: Ağustos 2026 – Eylül 2027
const FIRST = { year: 2026, month: 7 }   // 7 = Ağustos (0'dan sayılır)
const LAST = { year: 2027, month: 8 }    // 8 = Eylül

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
  'w-full rounded-md border border-line bg-parchment px-3 py-2 text-sm ' +
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent'

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

  // Güne göre dizilmiş kayıtlar: başvuru tarihleri üniversitelerden otomatik gelir
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
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Pazartesi haftanın ilk günü olacak şekilde kaydır
  const leading = (first.getDay() + 6) % 7

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
      <header className="mb-6">
        <h1 className="text-3xl mb-2">Takvim</h1>
        <p className="text-ink-soft text-sm">
          Ağustos 2026 – Eylül 2027. Başvuru tarihleri üniversitelerden otomatik düşer;
          kendi planlarını bir güne tıklayarak eklersin.
        </p>
      </header>

      {error && <p className="text-sm text-alert-critical mb-4">{error}</p>}

      {/* Ay gezinme */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => step(-1)}
          disabled={!canPrev}
          className="rounded-md border border-line px-3 py-1.5 text-sm
                     hover:border-accent disabled:opacity-30 transition"
        >
          ← Önceki
        </button>
        <h2 className="font-serif text-xl">{MONTHS[month]} {year}</h2>
        <button
          onClick={() => step(1)}
          disabled={!canNext}
          className="rounded-md border border-line px-3 py-1.5 text-sm
                     hover:border-accent disabled:opacity-30 transition"
        >
          Sonraki →
        </button>
      </div>

      {/* Ay ızgarası */}
      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs text-ink-faint">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24 border-b border-r border-line bg-parchment/40" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const key = toKey(year, month, day)
            const items = byDay[key] ?? []
            const isSelected = selected === key

            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`min-h-24 border-b border-r border-line p-1.5 text-left align-top
                            transition hover:bg-accent-soft/40
                            ${isSelected ? 'bg-accent-soft' : ''}`}
              >
                <span className="text-xs text-ink-faint">{day}</span>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                        item.kind === 'deadline'
                          ? 'bg-alert-critical/10 text-alert-critical'
                          : item.kind === 'start'
                          ? 'bg-accent-soft text-accent'
                          : item.done
                          ? 'bg-line/50 text-ink-faint line-through'
                          : 'bg-line/50 text-ink-soft'
                      }`}
                    >
                      {item.label}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-ink-faint">+{items.length - 3}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Seçili gün */}
      {selected && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="text-lg mb-4">
            {new Date(selected).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
            })}
          </h3>

          {selectedItems.length > 0 && (
            <ul className="space-y-2 mb-5">
              {selectedItems.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between gap-4 text-sm">
                  <span className={item.done ? 'line-through text-ink-faint' : ''}>
                    {item.label}
                  </span>
                  {item.kind === 'event' && (
                    <span className="flex gap-3 shrink-0">
                      <button
                        onClick={() => toggleDone(item.id, item.done)}
                        className="text-xs text-ink-faint hover:text-accent transition"
                      >
                        {item.done ? 'geri al' : 'bitti'}
                      </button>
                      <button
                        onClick={() => deleteEvent(item.id)}
                        className="text-xs text-ink-faint hover:text-alert-critical transition"
                      >
                        sil
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addEvent} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-ink-faint mb-1.5">Ne yapacaksın?</label>
              <input
                className={FIELD}
                required
                placeholder="TCF sınavına çalış"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-faint mb-1.5">Tür</label>
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
              className="rounded-md bg-accent px-5 py-2 text-sm text-white hover:opacity-90 transition"
            >
              Ekle
            </button>
          </form>
        </section>
      )}
    </Layout>
  )
}
