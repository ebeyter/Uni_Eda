import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import ThemeToggle from './ThemeToggle'

function navClass({ isActive }) {
  return `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
    isActive
      ? 'bg-accent text-white shadow-md shadow-accent/25'
      : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
  }`
}

export default function Layout({ children, nav = [] }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Üst sıra */}
          <div className="h-14 flex items-center justify-between gap-4">
            <span className="font-display text-lg font-bold">
              Uni <span className="text-accent">Plan</span>
            </span>

            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-ink-soft hidden sm:inline">
                {profile?.full_name}
              </span>
              <ThemeToggle />
              <button
                onClick={signOut}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm font-bold
                           text-ink-soft hover:bg-surface-2 hover:text-ink transition"
              >
                Çıkış
              </button>
            </div>
          </div>

          {/* Menü — mobilde yatay kaydırılır, masaüstünde tek satır */}
          <nav className="flex gap-1.5 overflow-x-auto pb-2.5 -mx-1 px-1
                          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  )
}
