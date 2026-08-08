import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { EDA_NAV } from '../nav'
import { formatDate, formatMoney, STATUS_LABELS } from '../lib/format'

// Sık kullanılacak ülkeler öneri olarak çıkar, ama istediğini yazabilirsin
const COUNTRY_SUGGESTIONS = ['Fransa', 'Belçika', 'Hollanda', 'Almanya', 'İtalya', 'İspanya']

function daysLeft(deadline) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(deadline)
  return Math.round((target - today) / 86400000)
}

function DayBadge({ deadline }) {
  const days = daysLeft(deadline)
  if (days === null) return <span className="text-xs text-ink-faint">tarih yok</span>

  const tone =
    days < 0 ? 'text-alert-critical'
    : days <= 7 ? 'text-alert-critical'
    : days <= 30 ? 'text-alert-warning'
    : 'text-ink-soft'

  return (
    <span className={`text-xs tabular-nums ${tone}`}>
      {days < 0 ? `${Math.abs(days)} gün geçti` : `${days} gün kaldı`}
    </span>
  )
}

export default function Universities() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Hızlı ekleme formu — sadece 3 alan, gerisi detay sayfasında
  const [form, setForm] = useState({
    name: '', country: '', application_start: '', application_deadline: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('country')
      .order('application_deadline', { nullsFirst: false })

    if (error) setError(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('universities').insert({
      name: form.name.trim(),
      country: form.country.trim(),
      application_start: form.application_start || null,
      application_deadline: form.application_deadline || null,
    })

    if (error) setError(error.message)
    else {
      setForm({ name: '', country: '', application_start: '', application_deadline: '' })
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(uni) {
    const ok = window.confirm(
      `"${uni.name}" silinsin mi?\n\nBu üniversiteye bağlı bölümler, notlar ve dökümanlar da silinecek. Geri alınamaz.`
    )
    if (!ok) return

    const { error } = await supabase.from('universities').delete().eq('id', uni.id)
    if (error) setError(error.message)
    else await load()
  }

  const byCountry = rows.reduce((acc, row) => {
    ;(acc[row.country] ||= []).push(row)
    return acc
  }, {})

  return (
    <Layout nav={EDA_NAV}>
      <header className="mb-8">
        <h1 className="text-3xl mb-2">Üniversiteler</h1>
        <p className="lede">
          Önce adını ve tarihlerini gir, kalan bilgileri sonra tamamlarsın.
        </p>
      </header>

      {/* Hızlı ekleme */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-line bg-surface p-5 mb-10"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-ink-soft mb-1.5">
              Üniversite adı
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sciences Po"
              className="w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm
                         outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-bold text-ink-soft mb-1.5">
              Ülke
            </label>
            <input
              id="country"
              required
              list="country-list"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Fransa"
              className="w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm
                         outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <datalist id="country-list">
              {COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label htmlFor="start" className="block text-sm font-bold text-ink-soft mb-1.5">
              Başvuru başlangıcı
            </label>
            <input
              id="start"
              type="date"
              value={form.application_start}
              onChange={(e) => setForm({ ...form, application_start: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm
                         outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-bold text-ink-soft mb-1.5">
              Son tarih
            </label>
            <input
              id="deadline"
              type="date"
              value={form.application_deadline}
              onChange={(e) => setForm({ ...form, application_deadline: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm
                         outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-5 py-2 text-sm text-white
                       hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-line bg-surface p-4 mb-6">
          <p className="text-sm text-alert-critical">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-ink-faint text-sm">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-surface/60 p-10 text-center">
          <h2 className="text-xl mb-2">Liste boş</h2>
          <p className="lede">
            Yukarıdaki formdan ilk üniversiteni ekle.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCountry).map(([country, list]) => (
            <section key={country}>
              <h2 className="section-title mb-3 pb-2 border-b border-line">
                {country} <span className="text-ink-faint/60">({list.length})</span>
              </h2>

              <ul className="space-y-2">
                {list.map((uni) => (
                  <li
                    key={uni.id}
                    className="group rounded-2xl border border-line bg-surface px-5 py-4
                               flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/universiteler/${uni.id}`}
                        className="text-lg hover:text-accent transition"
                      >
                        {uni.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-faint">
                        {uni.city && <span>{uni.city}</span>}
                        <span>{STATUS_LABELS[uni.status]}</span>
                        {uni.tuition_fee != null && (
                          <span>{formatMoney(uni.tuition_fee, uni.currency)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        {uni.application_start && (
                          <div className="text-xs text-ink-faint">
                            başlangıç {formatDate(uni.application_start)}
                          </div>
                        )}
                        <div className="text-sm">{formatDate(uni.application_deadline)}</div>
                        <DayBadge deadline={uni.application_deadline} />
                      </div>
                      <button
                        onClick={() => handleDelete(uni)}
                        className="text-xs text-ink-faint hover:text-alert-critical transition
                                   opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`${uni.name} sil`}
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Layout>
  )
}
