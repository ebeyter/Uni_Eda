import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STAGE_LABELS } from '../lib/format'

const DOC_TYPES = {
  motivation_letter: 'Motivasyon mektubu',
  cv: 'CV',
  transcript: 'Transkript',
  language_certificate: 'Dil sertifikası',
  recommendation_letter: 'Referans mektubu',
  passport: 'Pasaport',
  other: 'Diğer',
}

const FIELD =
  'w-full rounded-md border border-line bg-parchment px-3 py-2 text-sm ' +
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Documents({ universityId }) {
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '', doc_type: 'motivation_letter', stage: 'drafting', file: null,
  })

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('university_id', universityId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setDocs(data ?? [])
  }, [universityId])

  useEffect(() => { load() }, [load])

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.file) return

    setUploading(true)
    setError('')

    // Dosya adı çakışmasın diye zaman damgası ekleniyor
    const safeName = form.file.name.replace(/[^\w.-]/g, '_')
    const path = `${universityId}/${Date.now()}-${safeName}`

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, form.file)

    if (upErr) {
      setError(`Dosya yüklenemedi: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { error: dbErr } = await supabase.from('documents').insert({
      university_id: universityId,
      title: form.title.trim() || form.file.name,
      doc_type: form.doc_type,
      stage: form.stage,
      storage_path: path,
      file_size: form.file.size,
      mime_type: form.file.type || null,
    })

    if (dbErr) {
      // Kayıt oluşmadıysa yüklenen dosyayı da geri al, ortada sahipsiz dosya kalmasın
      await supabase.storage.from('documents').remove([path])
      setError(dbErr.message)
    } else {
      setForm({ title: '', doc_type: 'motivation_letter', stage: 'drafting', file: null })
      e.target.reset()
      await load()
    }
    setUploading(false)
  }

  // Dosyalar kapalı kovada; geçici imzalı bağlantı üretilip açılıyor
  async function openDoc(doc) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60)

    if (error) setError(error.message)
    else window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function updateStage(doc, stage) {
    const { error } = await supabase.from('documents').update({ stage }).eq('id', doc.id)
    if (error) setError(error.message)
    else await load()
  }

  async function handleDelete(doc) {
    if (!window.confirm(`"${doc.title}" silinsin mi? Dosya da silinecek.`)) return

    await supabase.storage.from('documents').remove([doc.storage_path])
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <section className="mt-12">
      <h2 className="text-sm uppercase tracking-wider text-ink-faint mb-4 pb-2 border-b border-line">
        Dökümanlar ({docs.length})
      </h2>

      {error && <p className="text-sm text-alert-critical mb-4">{error}</p>}

      {docs.length > 0 && (
        <ul className="space-y-2 mb-6">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="group rounded-lg border border-line bg-surface px-5 py-4
                         flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
            >
              <div className="min-w-0">
                <button
                  onClick={() => openDoc(doc)}
                  className="text-left hover:text-accent transition"
                >
                  {doc.title}
                </button>
                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-ink-faint">
                  <span>{DOC_TYPES[doc.doc_type]}</span>
                  {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {doc.doc_type === 'motivation_letter' && (
                  <select
                    value={doc.stage}
                    onChange={(e) => updateStage(doc, e.target.value)}
                    className="rounded-md border border-line bg-parchment px-2 py-1 text-xs
                               outline-none focus:border-accent"
                  >
                    {Object.entries(STAGE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-xs text-ink-faint hover:text-alert-critical transition
                             opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleUpload}
        className="rounded-lg border border-dashed border-line p-5 grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label className="block text-xs text-ink-faint mb-1.5">Dosya</label>
          <input
            type="file"
            required
            onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
            className="w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0
                       file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:text-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-faint mb-1.5">Başlık</label>
          <input
            className={FIELD}
            placeholder="Boş bırakırsan dosya adı kullanılır"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-faint mb-1.5">Tür</label>
          <select
            className={FIELD}
            value={form.doc_type}
            onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
          >
            {Object.entries(DOC_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {form.doc_type === 'motivation_letter' && (
          <div>
            <label className="block text-xs text-ink-faint mb-1.5">Yazım aşaması</label>
            <select
              className={FIELD}
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            >
              {Object.entries(STAGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md border border-accent px-5 py-2 text-sm text-accent
                       hover:bg-accent-soft disabled:opacity-50 transition"
          >
            {uploading ? 'Yükleniyor…' : 'Yükle'}
          </button>
          <p className="text-xs text-ink-faint mt-2">
            Dökümanlar tamamen sana özel — aile hiçbir şekilde göremez.
          </p>
        </div>
      </form>
    </section>
  )
}
