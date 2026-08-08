import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'

const FIELD =
  'w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm ' +
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const EMPTY = { person_name: '', person_role: '', contact_info: '', note: '', talked_at: '' }

export default function Contacts({ universityId }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('university_id', universityId)
      .order('talked_at', { ascending: false, nullsFirst: false })

    if (error) setError(error.message)
    else setRows(data ?? [])
  }, [universityId])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('contacts').insert({
      university_id: universityId,
      person_name: form.person_name.trim(),
      person_role: form.person_role || null,
      contact_info: form.contact_info || null,
      note: form.note || null,
      talked_at: form.talked_at || null,
    })

    if (error) setError(error.message)
    else {
      setForm(EMPTY)
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(row) {
    if (!window.confirm(`${row.person_name} kaydı silinsin mi?`)) return
    const { error } = await supabase.from('contacts').delete().eq('id', row.id)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <section className="mt-12">
      <h2 className="section-title mb-4 pb-2 border-b border-line">
        Görüştüğün kişiler ({rows.length})
      </h2>

      {error && <p className="text-sm text-alert-critical mb-4">{error}</p>}

      {rows.length > 0 && (
        <ul className="space-y-3 mb-6">
          {rows.map((row) => (
            <li key={row.id} className="group rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg">{row.person_name}</h3>
                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-ink-faint">
                    {row.person_role && <span>{row.person_role}</span>}
                    {row.talked_at && <span>{formatDate(row.talked_at)}</span>}
                    {row.contact_info && (
                      <span title="Aile bu bilgiyi görmez">{row.contact_info}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(row)}
                  className="text-xs text-ink-faint hover:text-alert-critical transition
                             opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  Sil
                </button>
              </div>
              {row.note && (
                <p className="text-sm text-ink-soft mt-3 whitespace-pre-line">{row.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="rounded-2xl border-2 border-dashed border-line p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-bold text-ink-soft mb-1.5">Kim</label>
          <input className={FIELD} required placeholder="Zeynep"
                 value={form.person_name}
                 onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink-soft mb-1.5">Kimliği</label>
          <input className={FIELD} placeholder="2. sınıf öğrencisi"
                 value={form.person_role}
                 onChange={(e) => setForm({ ...form, person_role: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink-soft mb-1.5">İletişim</label>
          <input className={FIELD} placeholder="Instagram, e-posta…"
                 value={form.contact_info}
                 onChange={(e) => setForm({ ...form, contact_info: e.target.value })} />
          <p className="text-xs text-ink-faint mt-1">Aile bu alanı görmez.</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-ink-soft mb-1.5">Görüşme tarihi</label>
          <input className={FIELD} type="date" value={form.talked_at}
                 onChange={(e) => setForm({ ...form, talked_at: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-ink-soft mb-1.5">Not</label>
          <textarea className={FIELD} rows={3} placeholder="Ne konuştunuz?"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <p className="text-xs text-ink-faint mt-1">
            Bu notu aile de görebilir — brief'te öyle istemiştin.
          </p>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border-2 border-accent px-5 py-2 text-sm text-accent
                       hover:bg-accent-soft disabled:opacity-50 transition"
          >
            {saving ? 'Ekleniyor…' : 'Kişi ekle'}
          </button>
        </div>
      </form>
    </section>
  )
}
