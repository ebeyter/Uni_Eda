import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthProvider'
import { isConfigured } from '../lib/supabase'
import { MIN_CODE_LENGTH } from '../lib/accessCode'
import ThemeToggle from '../components/ThemeToggle'

// Arka planda yavaşça süzülen renk lekeleri
function Background() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="blob absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full
                      bg-accent/30 blur-3xl" />
      <div className="blob absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full
                      bg-amber/25 blur-3xl" style={{ animationDelay: '-6s' }} />
      <div className="blob absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full
                      bg-mint/25 blur-3xl" style={{ animationDelay: '-12s' }} />
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
}

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
  }

  if (!isConfigured) {
    return (
      <div className="relative min-h-full grid place-items-center p-6">
        <Background />
        <div className="relative max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
          <h1 className="text-2xl mb-2">Bağlantı ayarlanmamış</h1>
          <p className="lede">
            <code className="text-ink font-bold">.env</code> dosyasındaki Supabase
            değerleri boş. Doldurduktan sonra sunucuyu yeniden başlat.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full flex items-center justify-center">
      <Background />

      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.15 }}
        className="relative w-full max-w-5xl px-6 py-20 text-center"
      >
        {/* Karşılama */}
        <motion.p
          variants={fadeUp}
          className="font-display text-3xl sm:text-4xl font-bold text-accent mb-5"
        >
          Welcome!!
        </motion.p>

        {/* Ana başlık — sayfanın en baskın öğesi */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-7xl lg:text-8xl mx-auto max-w-4xl"
        >
          Follow Eda's university application journey
        </motion.h1>

        {/* Kod girişi */}
        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          className="mt-12 flex flex-col sm:flex-row items-stretch justify-center gap-3
                     mx-auto max-w-2xl"
        >
          <motion.button
            type="submit"
            disabled={busy}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="h-16 shrink-0 inline-flex items-center justify-center gap-3
                       rounded-full bg-accent px-8 text-lg font-bold text-white
                       shadow-xl shadow-accent/30 hover:bg-accent-dark
                       disabled:opacity-50 transition-colors"
          >
            {busy ? 'Kontrol ediliyor…' : 'Başlamak için kodu gir'}
            {busy ? (
              <span className="block h-5 w-5 rounded-full border-2 border-white/40
                               border-t-white animate-spin" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.6"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </motion.button>

          <input
            type="password"
            required
            autoFocus
            aria-label="Kod"
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kodun"
            className="h-16 flex-1 min-w-0 rounded-full border-2 border-line
                       bg-surface/80 backdrop-blur-sm px-7 text-lg font-bold
                       tracking-widest text-center sm:text-left
                       placeholder:font-medium placeholder:tracking-normal
                       placeholder:text-ink-faint
                       outline-none transition focus:border-accent focus:bg-surface"
          />
        </motion.form>

        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 inline-block rounded-full bg-accent-soft px-5 py-2.5
                       font-bold text-accent-dark"
          >
            {error}
          </motion.p>
        )}

        <motion.p variants={fadeUp} className="mt-10 text-sm font-medium text-ink-faint">
          Kodunuzu Eda verdi, bu site kayıt almıyor.
        </motion.p>
      </motion.div>
    </div>
  )
}
