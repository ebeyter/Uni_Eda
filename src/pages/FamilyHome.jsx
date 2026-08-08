import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const NAV = [
  { to: '/', label: 'Üniversiteler', end: true },
  { to: '/oneri-birak', label: 'Öneri bırak' },
]

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function FamilyHome() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('family_universities')
      .select('*')
      .order('country', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data ?? [])
        setLoading(false)
      })
  }, [])

  // Ülkeye göre grupla — rapor gibi okunsun
  const byCountry = rows.reduce((acc, row) => {
    ;(acc[row.country] ||= []).push(row)
    return acc
  }, {})

  return (
    <Layout nav={NAV}>
      <header className="mb-10">
        <h1 className="text-4xl mb-3">
          Hello family, let's follow up on Eda's university journey
        </h1>
        <p className="text-ink-soft max-w-xl leading-relaxed">
          Eda'nın başvuracağı üniversiteler ve tarihleri burada. Aklınıza bir şey
          gelirse öneri bırakabilirsiniz — Eda kendi sayfasında görüyor.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-line bg-surface p-4 mb-6">
          <p className="text-sm text-alert-critical">Veri okunamadı: {error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-ink-faint text-sm">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface/60 p-10 text-center">
          <h2 className="text-xl mb-2">Liste henüz hazırlanıyor</h2>
          <p className="text-ink-soft text-sm">
            Eda üniversiteleri eklediğinde burada görünecek.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(byCountry).map(([country, list]) => (
            <section key={country}>
              <h2 className="text-sm uppercase tracking-wider text-ink-faint mb-4 pb-2 border-b border-line">
                {country}
              </h2>
              <div className="space-y-3">
                {list.map((uni) => (
                  <article
                    key={uni.id}
                    className="rounded-lg border border-line bg-surface p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-lg">{uni.name}</h3>
                      {uni.tuition_fee != null && (
                        <span className="text-sm text-ink-soft">
                          {Number(uni.tuition_fee).toLocaleString('tr-TR')} {uni.currency}
                        </span>
                      )}
                    </div>
                    {uni.city && (
                      <p className="text-sm text-ink-soft mt-0.5">{uni.city}</p>
                    )}
                    <dl className="mt-4 pt-3 border-t border-line grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs text-ink-faint mb-0.5">Başvuru başlangıcı</dt>
                        <dd>{formatDate(uni.application_start)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-faint mb-0.5">Son tarih</dt>
                        <dd>{formatDate(uni.application_deadline)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  )
}
