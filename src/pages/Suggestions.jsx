import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { EDA_NAV } from '../nav'
import { formatDate } from '../lib/format'

export default function Suggestions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    // Öneri + yazan kişinin adı tek sorguda
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, profiles(full_name), universities(name)')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(row) {
    await supabase.from('suggestions').update({ is_read: !row.is_read }).eq('id', row.id)
    await load()
  }

  const unread = rows.filter((r) => !r.is_read).length

  return (
    <Layout nav={EDA_NAV}>
      <header className="mb-8">
        <h1 className="text-3xl mb-2">Öneriler</h1>
        <p className="lede">
          {unread > 0
            ? `${unread} okunmamış öneri var.`
            : 'Ailenin bıraktığı öneriler burada görünür.'}
        </p>
      </header>

      {error && <p className="text-sm text-alert-critical mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-faint text-sm">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-surface/60 p-10 text-center">
          <h2 className="text-xl mb-2">Henüz öneri yok</h2>
          <p className="lede">
            Ailen bir şey yazdığında burada belirir.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-lg border bg-surface p-5 ${
                row.is_read ? 'border-line' : 'border-accent/40'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
                <span className="text-sm">
                  {row.profiles?.full_name ?? 'Bilinmiyor'}
                  {row.universities?.name && (
                    <span className="text-ink-faint"> · {row.universities.name}</span>
                  )}
                </span>
                <span className="text-xs text-ink-faint">{formatDate(row.created_at)}</span>
              </div>

              <p className="text-ink-soft whitespace-pre-line leading-relaxed">{row.body}</p>

              <button
                onClick={() => markRead(row)}
                className="mt-3 text-xs text-ink-faint hover:text-accent transition"
              >
                {row.is_read ? 'okunmadı işaretle' : 'okundu işaretle'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
