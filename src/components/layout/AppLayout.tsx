import { NavLink, Outlet } from 'react-router'
import { BookOpen, FlaskConical, LayoutDashboard, Library, LogOut, Settings, Sparkles, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  clinical?: boolean
  soon?: boolean
}

const nav: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/methode', label: 'Ma méthode', icon: Sparkles, clinical: true },
  { to: '/referentiel', label: 'Référentiel', icon: Library, clinical: true },
  { to: '/bibliotheque', label: 'Bibliothèque scientifique', icon: BookOpen, soon: true },
  { to: '/parametres', label: 'Paramètres', icon: Settings, soon: true },
]

export function AppLayout() {
  const { signOut, session } = useAuth()
  const { organization, canAccessClinical, practitioner } = useWorkspace()

  return (
    <div className="flex min-h-full flex-col">
      {/* Rappel permanent tant que la conformité HDS n'est pas en place */}
      <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900">
        <FlaskConical className="size-3.5" aria-hidden />
        Version de développement — données fictives uniquement, aucune donnée réelle de patient.
      </div>

      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex size-7 items-center justify-center rounded-md bg-accent-600 text-sm font-semibold text-white">O</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">OstéoAssist</p>
              <p className="truncate text-xs text-stone-500">{organization.name}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3" aria-label="Navigation principale">
            {nav
              .filter((item) => !item.clinical || canAccessClinical)
              .map((item) =>
                item.soon ? (
                  <span key={item.to} className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-stone-400">
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-wide">Bientôt</span>
                  </span>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                        isActive ? 'bg-accent-50 font-medium text-accent-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ),
              )}
          </nav>

          <div className="border-t border-stone-100 px-3 py-3">
            <p className="truncate px-2.5 text-xs text-stone-500">
              {practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : session?.user.email}
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Navigation mobile simple */}
          <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2 md:hidden">
            {nav.filter((i) => !i.soon && (!i.clinical || canAccessClinical)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-accent-50 text-accent-700' : 'text-stone-600')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
