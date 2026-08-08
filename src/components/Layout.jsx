import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Layout({ children, nav = [] }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-8">
            <span className="font-serif text-lg">Uni Plan</span>
            <nav className="hidden sm:flex gap-6">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `text-sm transition ${
                      isActive
                        ? 'text-accent border-b-2 border-accent pb-0.5'
                        : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft hidden sm:inline">
              {profile?.full_name}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-ink-faint hover:text-ink transition"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </main>
    </div>
  )
}
