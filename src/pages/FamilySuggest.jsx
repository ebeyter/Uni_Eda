import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import Layout from '../components/Layout'
import { FAMILY_NAV } from '../nav'
import { formatDate } from '../lib/format'

const FIELD =
  'w-full rounded-md border border-line bg-parchment px-3 py-2 text-sm ' +
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function FamilySuggest() {
  const { session } = useAuth()
  const [universities, setUniversities] = useState([])
  const [mine, setMine] = useState([])
  const [body, setBody] = useState('')
  const [uniId, setUniId] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [uniRes, sugRes] = await Promise.all([
      supabase.from('family_universities').select('id, name, country').order('name'),
      supabase.from('suggestions').select('*').order('created_at', { ascending: false }),
    ])
    if (!uniRes.error) setUniversities(uniRes.data ?? [])
    if (!sugRes.error) setMine(sugRes.data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('suggestions').insert({
      author_id: session.user.id,
      university_id: uniId || null,
      body: body.trim(),
    })

    if (error) setError(error.message)
    else {
      setBody('')
      setUniId('')
      setSent(true)
      await load()
    }
    setSaving(false)
  }

  return (
    <Layout nav={FAMILY_NAV}>
      <header className="mb-8">
        <h1 className="text-3xl mb-2">Öneri bırak</h1>
        <p className="text-ink-soft text-sm max-w-xl leading-relaxed">
          Aklınıza gelen bir üniversite, bir soru ya da bir uyarı varsa buraya yazın.
          Eda kendi sayfasında görecek.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-5 space-y-4 mb-10">
        <div>
          <label htmlFor="uni" className="block text-xs text-ink-faint mb-1.5">
            İlgili üniversite (isteğe bağlı)
          </label>
          <select id="uni" className={FIELD} value={uniId} onChange={(e) => setUniId(e.target.value)}>
            <option value="">Genel</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.country}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="body" className="block text-xs text-ink-faint mb-1.5">
            Öneriniz
          </label>
          <textarea
            id="body"
            required
            rows={4}
            className={FIELD}
            value={body}
            onChange={(e) => { setBody(e.target.value); setSent(false) }}
          />
        </div>

        {error && <p className="text-sm text-alert-critical">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-6 py-2.5 text-sm text-white
                       hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Gönderiliyor…' : 'Gönder'}
          </button>
          {sent && <span className="text-sm text-accent">Gönderildi</span>}
        </div>
      </form>

      {mine.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-ink-faint mb-4 pb-2 border-b border-line">
            Önceki önerileriniz
          </h2>
          <ul className="space-y-3">
            {mine.map((row) => (
              <li key={row.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <span className="text-xs text-ink-faint">{formatDate(row.created_at)}</span>
                  <span className="text-xs text-ink-faint">
                    {row.is_read ? 'Eda okudu' : 'okunmadı'}
                  </span>
                </div>
                <p className="text-ink-soft whitespace-pre-line">{row.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Layout>
  )
}
