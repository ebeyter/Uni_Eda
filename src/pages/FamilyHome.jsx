import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { FAMILY_NAV } from '../nav'
import { formatDate, formatMoney } from '../lib/format'

function UniversityCard({ uni, programs, notes }) {
  const [openProgram, setOpenProgram] = useState(null)

  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg">{uni.name}</h3>
        {uni.tuition_fee != null && (
          <span className="text-sm text-ink-soft">
            {formatMoney(uni.tuition_fee, uni.currency)}
          </span>
        )}
      </div>
      {uni.city && <p className="text-sm text-ink-soft mt-0.5">{uni.city}</p>}

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

      {/* Bölümler — detay için tıklanıyor */}
      {programs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-line">
          <p className="text-xs text-ink-faint mb-2">Başvurulacak bölümler</p>
          <ul className="space-y-1.5">
            {programs.map((p) => {
              const open = openProgram === p.id
              const hasDetail = p.content || p.details
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setOpenProgram(open ? null : p.id)}
                    disabled={!hasDetail}
                    className="text-sm text-left hover:text-accent transition
                               disabled:hover:text-ink disabled:cursor-default"
                  >
                    {p.name}
                    {hasDetail && (
                      <span className="text-xs text-ink-faint ml-2">
                        {open ? '− gizle' : '+ detay'}
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="mt-1.5 mb-2 pl-3 border-l-2 border-line text-sm text-ink-soft space-y-1.5">
                      {p.content && <p className="whitespace-pre-line">{p.content}</p>}
                      {p.details && (
                        <p className="whitespace-pre-line text-ink-faint">{p.details}</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Eda'nın o okuldan biriyle yaptığı görüşmelerin notları */}
      {notes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-line">
          <p className="text-xs text-ink-faint mb-2">Görüşme notları</p>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="text-sm">
                <span className="text-ink">{n.person_name}</span>
                {n.person_role && (
                  <span className="text-ink-faint text-xs"> · {n.person_role}</span>
                )}
                <p className="text-ink-soft whitespace-pre-line mt-0.5">{n.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

export default function FamilyHome() {
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('family_universities').select('*').order('country'),
      supabase.from('family_programs').select('*'),
      supabase.from('family_notes').select('*'),
    ]).then(([uniRes, progRes, noteRes]) => {
      if (uniRes.error) setError(uniRes.error.message)
      else setRows(uniRes.data ?? [])
      if (!progRes.error) setPrograms(progRes.data ?? [])
      if (!noteRes.error) setNotes(noteRes.data ?? [])
      setLoading(false)
    })
  }, [])

  const byCountry = rows.reduce((acc, row) => {
    ;(acc[row.country] ||= []).push(row)
    return acc
  }, {})

  return (
    <Layout nav={FAMILY_NAV}>
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
                  <UniversityCard
                    key={uni.id}
                    uni={uni}
                    programs={programs.filter((p) => p.university_id === uni.id)}
                    notes={notes.filter((n) => n.university_id === uni.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  )
}
