/* ──────────────────────────────────────────────────────────────
   BottomNav — Navegación inferior de la app
   Responsive: bottom nav en móvil, sidebar en desktop
────────────────────────────────────────────────────────────── */

import { Home, BookOpen, Dumbbell, BarChart2, Settings, GraduationCap } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',            label: 'Inicio',    icon: Home          },
  { href: '/vocabulario', label: 'Vocab',     icon: BookOpen      },
  { href: '/practicar',   label: 'Practicar', icon: Dumbbell      },
  { href: '/gramatica',   label: 'Gramática', icon: GraduationCap },
  { href: '/progreso',    label: 'Progreso',  icon: BarChart2     },
]

interface Props {
  activeNav?: string
}

export default function BottomNav({ activeNav = '/' }: Props) {
  const current = typeof window !== 'undefined'
    ? window.location.pathname
    : activeNav

  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = current === href ||
            (href !== '/' && current.startsWith(href))

          return (
            <a
              key={href}
              href={href}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="bottom-nav__icon">
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              </span>
              <span className="bottom-nav__label">{label}</span>
            </a>
          )
        })}
      </div>

      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: var(--z-nav, 400);
          background: var(--bg-surface);
          border-top: 0.5px solid var(--border-subtle);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .bottom-nav__inner {
          display: flex;
          align-items: stretch;
          max-width: 480px;
          margin-inline: auto;
        }

        .bottom-nav__item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px 4px;
          text-decoration: none;
          color: var(--text-muted);
          transition: color 150ms ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .bottom-nav__item:hover {
          color: var(--text-secondary);
        }

        .bottom-nav__item--active {
          color: var(--verdant-500);
        }

        .bottom-nav__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }

        .bottom-nav__label {
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* Desktop: ocultar bottom nav, mostrar sidebar */
        @media (min-width: 768px) {
          .bottom-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}
