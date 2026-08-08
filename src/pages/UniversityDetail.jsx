import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { EDA_NAV } from '../nav'
import { STATUS_LABELS } from '../lib/format'
import Documents from '../components/Documents'
import Contacts from '../components/Contacts'

const FIELD =
  'w-full rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm ' +
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-ink-soft mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  )
}

export default function UniversityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [uni, setUni] = useState(null)
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newProgram, setNewProgram] = useState({ name: '', content: '', details: '' })

  const load = useCallback(async () => {
    const [uniRes, progRes] = await Promise.all([
      supabase.from('universities').select('*').eq('id', id).single(),
      supabase.from('programs').select('*').eq('university_id', id).order('created_at'),
    ])

    if (uniRes.error) setError(uniRes.error.message)
    else setUni(uniRes.data)

    if (!progRes.error) setPrograms(progRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function change(field, value) {
    setUni((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('universities')
      .update({
        name: uni.name,
        country: uni.country,
        city: uni.city || null,
        website: uni.website || null,
        application_start: uni.application_start || null,
        application_deadline: uni.application_deadline || null,
        requirements: uni.requirements || null,
        tuition_fee: uni.tuition_fee === '' ? null : uni.tuition_fee,
        currency: uni.currency || 'EUR',
        status: uni.status,
        notes: uni.notes || null,
      })
      .eq('id', id)

    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  async function addProgram(e) {
    e.preventDefault()
    const { error } = await supabase.from('programs').insert({
      university_id: id,
      name: newProgram.name.trim(),
      content: newProgram.content || null,
      details: newProgram.details || null,
    })
    if (error) setError(error.message)
    else {
      setNewProgram({ name: '', content: '', details: '' })
      await load()
    }
  }

  async function deleteProgram(program) {
    if (!window.confirm(`"${program.name}" bölümü silinsin mi?`)) return
    const { error } = await supabase.from('programs').delete().eq('id', program.id)
    if (error) setError(error.message)
    else await load()
  }

  if (loading) {
    return <Layout nav={EDA_NAV}><p className="text-ink-faint text-sm">Yükleniyor…</p></Layout>
  }

  if (!uni) {
    return (
      <Layout nav={EDA_NAV}>
        <p className="lede">Üniversite bulunamadı.</p>
        <Link to="/universiteler" className="text-accent text-sm">← Listeye dön</Link>
      </Layout>
    )
  }

  return (
    <Layout nav={EDA_NAV}>
      <Link
        to="/universiteler"
        className="text-sm text-ink-faint hover:text-ink transition inline-block mb-4"
      >
        ← Üniversiteler
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl mb-1">{uni.name}</h1>
        <p className="lede">
          {[uni.city, uni.country].filter(Boolean).join(', ')}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-line bg-surface p-4 mb-6">
          <p className="text-sm text-alert-critical">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Temel bilgiler */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="section-title mb-4">
            Temel bilgiler
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Üniversite adı">
              <input className={FIELD} required value={uni.name}
                     onChange={(e) => change('name', e.target.value)} />
            </Field>
            <Field label="Ülke">
              <input className={FIELD} required value={uni.country}
                     onChange={(e) => change('country', e.target.value)} />
            </Field>
            <Field label="Şehir">
              <input className={FIELD} value={uni.city ?? ''}
                     onChange={(e) => change('city', e.target.value)} />
            </Field>
            <Field label="Web sitesi">
              <input className={FIELD} type="url" placeholder="https://…" value={uni.website ?? ''}
                     onChange={(e) => change('website', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Başvuru */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="section-title mb-4">
            Başvuru
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Başvuru başlangıcı">
              <input className={FIELD} type="date" value={uni.application_start ?? ''}
                     onChange={(e) => change('application_start', e.target.value)} />
            </Field>
            <Field
              label="Son tarih (deadline)"
              hint="Kalan gün ve uyarılar bu tarihten hesaplanır."
            >
              <input className={FIELD} type="date" value={uni.application_deadline ?? ''}
                     onChange={(e) => change('application_deadline', e.target.value)} />
            </Field>
            <Field label="Durum">
              <select className={FIELD} value={uni.status}
                      onChange={(e) => change('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <Field label="Ücret">
                <input className={FIELD} type="number" step="0.01" min="0"
                       value={uni.tuition_fee ?? ''}
                       onChange={(e) => change('tuition_fee', e.target.value)} />
              </Field>
              <Field label="Para birimi">
                <input className={FIELD} value={uni.currency ?? ''}
                       onChange={(e) => change('currency', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="mt-4">
            <Field label="Başvuru şartları" hint="Aile bu alanı görmez.">
              <textarea className={FIELD} rows={4} value={uni.requirements ?? ''}
                        onChange={(e) => change('requirements', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Notlar */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="section-title mb-4">
            Notların
          </h2>
          <Field label="Özel notlar" hint="Sadece sen görürsün.">
            <textarea className={FIELD} rows={4} value={uni.notes ?? ''}
                      onChange={(e) => change('notes', e.target.value)} />
          </Field>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm text-white
                       hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {saved && <span className="text-sm text-accent">Kaydedildi</span>}
        </div>
      </form>

      {/* Bölümler */}
      <section className="mt-12">
        <h2 className="section-title mb-4 pb-2 border-b border-line">
          Bölümler ({programs.length})
        </h2>

        {programs.length > 0 && (
          <ul className="space-y-3 mb-6">
            {programs.map((p) => (
              <li key={p.id} className="group rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg">{p.name}</h3>
                  <button
                    onClick={() => deleteProgram(p)}
                    className="text-xs text-ink-faint hover:text-alert-critical transition
                               opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    Sil
                  </button>
                </div>
                {p.content && (
                  <p className="text-sm text-ink-soft mt-2 whitespace-pre-line">{p.content}</p>
                )}
                {p.details && (
                  <p className="text-sm text-ink-faint mt-2 whitespace-pre-line">{p.details}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addProgram} className="rounded-2xl border-2 border-dashed border-line p-5 space-y-4">
          <Field label="Bölüm adı">
            <input className={FIELD} required placeholder="Siyaset Bilimi"
                   value={newProgram.name}
                   onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })} />
          </Field>
          <Field label="İçerik" hint="Aile bunu tıklayarak görebilir.">
            <textarea className={FIELD} rows={2} value={newProgram.content}
                      onChange={(e) => setNewProgram({ ...newProgram, content: e.target.value })} />
          </Field>
          <Field label="Detay">
            <textarea className={FIELD} rows={2} value={newProgram.details}
                      onChange={(e) => setNewProgram({ ...newProgram, details: e.target.value })} />
          </Field>
          <button
            type="submit"
            className="rounded-xl border-2 border-accent px-5 py-2 text-sm text-accent
                       hover:bg-accent-soft transition"
          >
            Bölüm ekle
          </button>
        </form>
      </section>

      <Contacts universityId={id} />
      <Documents universityId={id} />

      {/* Silme */}
      <section className="mt-12 pt-6 border-t border-line">
        <button
          onClick={async () => {
            if (!window.confirm(
              `"${uni.name}" silinsin mi?\n\nBağlı bölümler, notlar ve dökümanlar da silinecek. Geri alınamaz.`
            )) return
            const { error } = await supabase.from('universities').delete().eq('id', id)
            if (error) setError(error.message)
            else navigate('/universiteler')
          }}
          className="text-sm text-ink-faint hover:text-alert-critical transition"
        >
          Bu üniversiteyi sil
        </button>
      </section>
    </Layout>
  )
}
