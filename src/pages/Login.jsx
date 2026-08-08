import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { isConfigured } from '../lib/supabase'
import { MIN_CODE_LENGTH } from '../lib/accessCode'

export default function Login() {
  const { signInWithCode } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (code.trim().length < MIN_CODE_LENGTH) {
      setError(`Kod en az ${MIN_CODE_LENGTH} karakter olmalı.`)
      return
    }

    setBusy(true)
    const { error } = await signInWithCode(code)
    if (error) {
      setError(error.message)
      setBusy(false)
    }
    // Başarılıysa AuthProvider yönlendirmeyi devralır
  }

  if (!isConfigured) {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="max-w-md rounded-lg border border-line bg-surface p-6">
          <h1 className="text-xl mb-2">Bağlantı ayarlanmamış</h1>
          <p className="text-ink-soft text-sm leading-relaxed">
            <code className="text-ink">.env</code> dosyasındaki{' '}
            <code className="text-ink">VITE_SUPABASE_URL</code> ve{' '}
            <code className="text-ink">VITE_SUPABASE_PUBLISHABLE_KEY</code> değerleri boş.
            Doldurduktan sonra sunucuyu yeniden başlat.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-faint mb-3">
            Uni Plan
          </p>
          <h1 className="text-3xl mb-2">Welcome back</h1>
          <p className="text-ink-soft text-sm">
            Devam etmek için kodunu gir
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-6 space-y-4"
        >
          <div>
            <label htmlFor="code" className="block text-sm text-ink-soft mb-1.5">
              Kod
            </label>
            <input
              id="code"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-line bg-parchment px-3 py-2.5
                         text-ink tracking-wider outline-none
                         focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-alert-critical">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-white
                       hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? 'Kontrol ediliyor…' : 'Giriş yap'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-faint mt-5 leading-relaxed">
          Kodunu Eda veriyor —<br />bu site kayıt almıyor.
        </p>
      </div>
    </div>
  )
}
