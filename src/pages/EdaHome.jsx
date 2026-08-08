import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import DeadlineCard from '../components/DeadlineCard'
import { EDA_NAV } from '../nav'

export default function EdaHome() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('application_timeline')
      .select('*')
      .order('application_deadline', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data ?? [])
        setLoading(false)
      })
  }, [])

  const urgent = rows.filter((r) => ['critical', 'warning'].includes(r.alert_level))

  return (
    <Layout nav={EDA_NAV}>
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint mb-3">
          {new Date().toLocaleDateString('tr-TR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
        <h1 className="text-4xl mb-3">Hi Eda, let's build your future</h1>
        <p className="text-ink-soft max-w-xl leading-relaxed">
          Başvuru sürecinin tamamı burada. Yaklaşan son tarihler aşağıda,
          kalan günler otomatik hesaplanıyor.
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
          <h2 className="text-xl mb-2">Henüz üniversite eklenmemiş</h2>
          <p className="text-ink-soft text-sm max-w-sm mx-auto leading-relaxed">
            İlk üniversiteni eklediğinde son tarihler burada kartlar hâlinde
            görünecek ve kalan gün sayısı kendiliğinden işlemeye başlayacak.
          </p>
        </div>
      ) : (
        <>
          {urgent.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm uppercase tracking-wider text-ink-faint mb-4">
                Dikkat gerektirenler
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {urgent.map((item) => (
                  <DeadlineCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm uppercase tracking-wider text-ink-faint mb-4">
              Tüm başvurular ({rows.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((item) => (
                <DeadlineCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </Layout>
  )
}
