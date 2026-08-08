import { useState } from 'react'
import { resolveTheme, setTheme } from '../lib/theme'

export default function ThemeToggle() {
  const [theme, setLocal] = useState(resolveTheme)

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setLocal(next)
  }

  const dark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Açık moda geç' : 'Karanlık moda geç'}
      title={dark ? 'Açık mod' : 'Karanlık mod'}
      className="grid place-items-center h-9 w-9 rounded-full border border-line
                 text-ink-soft hover:bg-surface-2 hover:text-ink transition"
    >
      {dark ? (
        // Güneş
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Ay
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
