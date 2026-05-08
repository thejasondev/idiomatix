/* ──────────────────────────────────────────────────────────────
   SideNav — Sistema de navegación adaptativo
   
   BREAKPOINTS:
   · < 768px    → invisible (BottomNav liquid glass cubre mobile)
   · 768–1023px → Tab bar horizontal superior (tablet)
   · ≥ 1024px   → Sidebar vertical izquierdo (desktop)

   FEATURES:
   · Live stats por idioma desde Dexie (tarjetas pendientes hoy)
   · Active state con indicador animado
   · Theme toggle integrado
   · Colapso a modo icon-only en desktop estrecho
   · Transiciones suaves en todos los estados
────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Home,
  BookOpen,
  Dumbbell,
  GraduationCap,
  BarChart2,
  Settings,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Flame,
  Library,
  ClipboardCheck,
} from 'lucide-react'
import { db } from '@/db'
import { useUIStore } from '@/stores'
import { LANGUAGES, type LanguageCode } from '@/types'

// ─── Nav definition ───────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  badge?: boolean // whether to show live due-card badge
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',            label: 'Inicio',      icon: Home,          badge: false },
  { href: '/vocabulario', label: 'Vocabulario', icon: BookOpen,      badge: false },
  { href: '/lectura',     label: 'Lectura',     icon: Library,       badge: false },
  { href: '/gramatica',   label: 'Gramática',   icon: GraduationCap, badge: false },
  { href: '/practicar',   label: 'Practicar',   icon: Dumbbell,      badge: true  },
  { href: '/examen',      label: 'Examen',      icon: ClipboardCheck, badge: false },
  { href: '/progreso',    label: 'Progreso',    icon: BarChart2,     badge: false },
]

const LANG_CODES: LanguageCode[] = ['ru', 'de', 'en']

// ─── Hooks ────────────────────────────────────────────────────

function useBreakpoint() {
  const [bp, setBP] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setBP('desktop')
      else if (w >= 768) setBP('tablet')
      else setBP('mobile')
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return bp
}

function useCurrentPath() {
  const [path, setPath] = useState('/')
  useEffect(() => {
    setPath(window.location.pathname)

    const onSwap = () => setPath(window.location.pathname)
    document.addEventListener('astro:after-swap', onSwap)
    return () => document.removeEventListener('astro:after-swap', onSwap)
  }, [])
  return path
}

function useTotalDue() {
  return useLiveQuery(async () => {
    const now = Date.now()
    return db.reviews.where('nextReview').belowOrEqual(now).count()
  }, []) ?? 0
}

function useLangDue(lang: LanguageCode) {
  return useLiveQuery(async () => {
    const now = Date.now()
    return db.reviews
      .where('lang').equals(lang)
      .filter(r => r.nextReview <= now)
      .count()
  }, [lang]) ?? 0
}

function useStreak() {
  return useLiveQuery(async () => {
    const activity = await db.dailyActivity
      .orderBy('date').reverse().limit(30).toArray()
    if (!activity.length) return 0
    const today = new Date().toISOString().split('T')[0] as string
    let streak = 0
    let check = today
    for (const day of activity) {
      if (day.date > check) continue
      if (day.date < check) break
      if (day.cardsReviewed > 0) {
        streak++
        const d = new Date(check)
        d.setDate(d.getDate() - 1)
        check = d.toISOString().split('T')[0] as string
      }
    }
    return streak
  }, []) ?? 0
}

// ─── Main component ───────────────────────────────────────────

interface Props {
  activeNav?: string
}

export default function SideNav({ activeNav = '/' }: Props) {
  const bp = useBreakpoint()
  const currentPath = useCurrentPath()
  const current = currentPath || activeNav
  const { theme, setTheme } = useUIStore()
  const [collapsed, setCollapsed] = useState(false)
  const totalDue = useTotalDue()
  const streak = useStreak()

  const isActive = useCallback(
    (href: string) =>
      current === href || (href !== '/' && current.startsWith(href)),
    [current]
  )

  if (bp === 'mobile') return null

  if (bp === 'tablet') {
    return <TabBar items={NAV_ITEMS} isActive={isActive} totalDue={totalDue} />
  }

  // Desktop sidebar
  return (
    <Sidebar
      items={NAV_ITEMS}
      isActive={isActive}
      totalDue={totalDue}
      streak={streak}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(c => !c)}
      theme={theme}
      onThemeChange={setTheme}
    />
  )
}

// ─── Tablet — Tab Bar ─────────────────────────────────────────

interface TabBarProps {
  items: NavItem[]
  isActive: (href: string) => boolean
  totalDue: number
}

function TabBar({ items, isActive, totalDue }: TabBarProps) {
  return (
    <>
      <header className="tabbar">
        {/* Logo */}
        <a href="/" className="tabbar__logo" aria-label="Idiomatix">
          Idiom<em>atix</em>
        </a>

        {/* Nav items */}
        <nav className="tabbar__nav" role="navigation" aria-label="Navegación principal">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href)
            const showBadge = badge && totalDue > 0

            return (
              <a
                key={href}
                href={href}
                className={`tb-item ${active ? 'tb-item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={showBadge ? `${label} — ${totalDue} pendientes` : label}
              >
                <span className="tb-item__icon-wrap">
                  <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                  {showBadge && (
                    <span className="tb-badge" aria-hidden>
                      {totalDue > 99 ? '99+' : totalDue}
                    </span>
                  )}
                </span>
                <span className="tb-item__label">{label}</span>
                {active && <span className="tb-item__indicator" aria-hidden />}
              </a>
            )
          })}
        </nav>

        {/* Right actions */}
        <div className="tabbar__actions">
          <a href="/ajustes" className="tabbar__settings" aria-label="Ajustes">
            <Settings size={16} strokeWidth={1.5} />
          </a>
        </div>
      </header>

      {/* Spacer to push content below fixed tabbar */}
      <div className="tabbar__spacer" aria-hidden />

      <style>{`
        .tabbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 400;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0 1.25rem;
          background: var(--bg-surface);
          border-bottom: 0.5px solid var(--border-subtle);

          /* Glass effect on tablet bar */
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          background: rgba(19, 22, 27, 0.85);
        }
        [data-theme="light"] .tabbar {
          background: rgba(255, 255, 255, 0.88);
        }

        .tabbar__spacer {
          height: 56px;
          flex-shrink: 0;
        }

        .tabbar__logo {
          font-family: var(--font-display);
          font-size: 1.15rem;
          color: var(--text-primary);
          text-decoration: none;
          line-height: 1;
          letter-spacing: -0.01em;
          margin-right: 1.5rem;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .tabbar__logo em {
          font-style: italic;
          color: var(--verdant-500);
        }

        .tabbar__nav {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tabbar__nav::-webkit-scrollbar { display: none; }

        .tb-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          white-space: nowrap;
          position: relative;
          transition: color 150ms ease, background 150ms ease;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .tb-item:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }
        .tb-item--active {
          color: var(--verdant-400);
          font-weight: 500;
          background: rgba(45, 212, 191, 0.08);
        }
        .tb-item--active:hover {
          background: rgba(45, 212, 191, 0.12);
        }

        .tb-item__icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
        }

        .tb-badge {
          position: absolute;
          top: -5px; right: -7px;
          min-width: 16px; height: 16px;
          background: var(--crimson-500);
          color: white;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 500;
          border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          border: 1.5px solid var(--bg-surface);
          animation: badgePop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes badgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .tb-item__label {
          font-family: var(--font-body);
        }

        /* Underline indicator for active */
        .tb-item__indicator {
          position: absolute;
          bottom: -1px;
          left: 12px; right: 12px;
          height: 2px;
          border-radius: 2px 2px 0 0;
          background: var(--verdant-500);
          box-shadow: 0 0 8px rgba(45, 212, 191, 0.5);
        }

        .tabbar__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 1rem;
          flex-shrink: 0;
        }

        .tabbar__settings {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          transition: color 150ms, background 150ms;
          border: 0.5px solid var(--border-default);
        }
        .tabbar__settings:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }
      `}</style>
    </>
  )
}

// ─── Desktop — Sidebar ────────────────────────────────────────

interface SidebarProps {
  items: NavItem[]
  isActive: (href: string) => boolean
  totalDue: number
  streak: number
  collapsed: boolean
  onToggleCollapse: () => void
  theme: string
  onThemeChange: (t: any) => void
}

function Sidebar({
  items, isActive, totalDue, streak,
  collapsed, onToggleCollapse, theme, onThemeChange,
}: SidebarProps) {
  const ruDue = useLangDue('ru')
  const deDue = useLangDue('de')
  const enDue = useLangDue('en')

  const langDues = { ru: ruDue, de: deDue, en: enDue }

  return (
    <>
      <aside
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar__inner">

          {/* ── Logo ──────────────────────────────── */}
          <div className={`sidebar__header ${collapsed ? 'sidebar__header--collapsed' : ''}`}>
            {!collapsed && (
              <a href="/" className="sidebar__logo" aria-label="Idiomatix — inicio">
                Idiom<em>atix</em>
              </a>
            )}
            <button
              className="sidebar__collapse-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir navegación' : 'Colapsar navegación'}
              type="button"
            >
              {collapsed
                ? <ChevronRight size={13} strokeWidth={2} />
                : <ChevronLeft  size={13} strokeWidth={2} />
              }
            </button>
          </div>

          {/* ── Main nav ──────────────────────────── */}
          <nav className="sidebar__nav" role="navigation">
            {items.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href)
              const showBadge = badge && totalDue > 0

              return (
                <a
                  key={href}
                  href={href}
                  className={`snav-item ${active ? 'snav-item--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  aria-label={showBadge ? `${label}, ${totalDue} pendientes` : label}
                >
                  {/* Active bar */}
                  {active && <span className="snav-item__bar" aria-hidden />}

                  {/* Icon */}
                  <span className="snav-item__icon">
                    <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                    {showBadge && (
                      <span className="snav-badge" aria-hidden>
                        {totalDue > 99 ? '99+' : totalDue}
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  {!collapsed && (
                    <span className="snav-item__label">{label}</span>
                  )}
                </a>
              )
            })}
          </nav>

          {/* ── Language indicators ────────────────── */}
          {!collapsed && (
            <div className="sidebar__langs">
              <p className="sidebar__langs-title">Pendientes hoy</p>
              {LANG_CODES.map(lang => (
                <LangIndicator
                  key={lang}
                  lang={lang}
                  due={langDues[lang]}
                />
              ))}
            </div>
          )}

          {/* ── Bottom section ─────────────────────── */}
          <div className="sidebar__footer">
            {/* Streak chip */}
            {!collapsed && streak > 0 && (
              <div className="sidebar__streak">
                <Flame size={13} strokeWidth={1.5} />
                <span>{streak} {streak === 1 ? 'día' : 'días'} de racha</span>
              </div>
            )}

            {/* Theme toggle */}
            <div
              className={`theme-toggle ${collapsed ? 'theme-toggle--collapsed' : ''}`}
              role="group"
              aria-label="Modo de color"
            >
              {([
                ['dark',   <Moon   size={13} />, 'Oscuro'],
                ['light',  <Sun    size={13} />, 'Claro'],
                ['system', <Monitor size={13} />, 'Sistema'],
              ] as [string, React.ReactNode, string][]).map(([val, icon, lbl]) => (
                <button
                  key={val}
                  className={`theme-btn ${theme === val ? 'theme-btn--active' : ''}`}
                  onClick={() => onThemeChange(val)}
                  type="button"
                  title={lbl}
                  aria-pressed={theme === val}
                  aria-label={lbl}
                >
                  {icon}
                  {!collapsed && <span>{lbl}</span>}
                </button>
              ))}
            </div>

            {/* Settings link */}
            <a
              href="/ajustes"
              className={`snav-item snav-item--settings ${isActive('/ajustes') ? 'snav-item--active' : ''}`}
              aria-current={isActive('/ajustes') ? 'page' : undefined}
              title={collapsed ? 'Ajustes' : undefined}
            >
              {isActive('/ajustes') && <span className="snav-item__bar" aria-hidden />}
              <span className="snav-item__icon">
                <Settings size={17} strokeWidth={isActive('/ajustes') ? 2 : 1.5} />
              </span>
              {!collapsed && <span className="snav-item__label">Ajustes</span>}
            </a>
          </div>

        </div>
      </aside>

      <style>{`
        /* ── Sidebar shell ──────────────────────── */
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--bg-surface);
          border-right: 0.5px solid var(--border-subtle);
          position: sticky;
          top: 0;
          height: 100dvh;
          overflow: hidden;
          transition: width 280ms cubic-bezier(0.4, 0, 0.2, 1);
          display: none; /* shown via media query */
        }
        .sidebar--collapsed { width: 64px; }

        .sidebar__inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.25rem 0.75rem 1rem;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .sidebar__inner::-webkit-scrollbar { display: none; }

        /* ── Header ─────────────────────────────── */
        .sidebar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1.25rem;
          border-bottom: 0.5px solid var(--border-subtle);
          margin-bottom: 0.75rem;
          gap: 8px;
          min-height: 48px;
        }
        .sidebar__header--collapsed {
          justify-content: center;
        }

        .sidebar__logo {
          font-family: var(--font-display);
          font-size: 1.35rem;
          color: var(--text-primary);
          text-decoration: none;
          line-height: 1;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          flex: 1;
          transition: opacity 200ms;
        }
        .sidebar__logo em { font-style: italic; color: var(--verdant-500); }

        .sidebar__collapse-btn {
          width: 24px; height: 24px;
          border-radius: 6px;
          border: 0.5px solid var(--border-default);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: color 150ms, background 150ms;
        }
        .sidebar__collapse-btn:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }

        /* ── Nav items ───────────────────────────── */
        .sidebar__nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .snav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          transition: color 150ms ease, background 150ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .snav-item:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }
        .snav-item--active {
          color: var(--verdant-400);
          background: rgba(45, 212, 191, 0.07);
          font-weight: 500;
        }
        .snav-item--active:hover {
          background: rgba(45, 212, 191, 0.11);
        }

        /* Left accent bar */
        .snav-item__bar {
          position: absolute;
          left: 0; top: 4px; bottom: 4px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--verdant-500);
          box-shadow: 0 0 8px rgba(45,212,191,0.4);
          animation: barSlide 200ms ease;
        }
        @keyframes barSlide {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }

        .snav-item__icon {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 20px; height: 20px;
          flex-shrink: 0;
        }

        .snav-item__label {
          overflow: hidden;
          text-overflow: ellipsis;
          transition: opacity 200ms;
        }

        /* Badge on icon */
        .snav-badge {
          position: absolute;
          top: -5px; right: -7px;
          min-width: 16px; height: 16px;
          background: var(--crimson-500);
          color: white;
          font-family: var(--font-mono);
          font-size: 9px;
          border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          border: 1.5px solid var(--bg-surface);
        }

        /* ── Language indicators ─────────────────── */
        .sidebar__langs {
          padding: 12px 0;
          border-top: 0.5px solid var(--border-subtle);
          border-bottom: 0.5px solid var(--border-subtle);
          margin: 0.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .sidebar__langs-title {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-family: var(--font-mono);
          padding: 0 2px;
          margin-bottom: 3px;
        }

        /* ── Footer ─────────────────────────────── */
        .sidebar__footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 0.5rem;
        }

        .sidebar__streak {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 10px;
          border-radius: var(--radius-md);
          background: rgba(251, 146, 60, 0.08);
          border: 0.5px solid rgba(251, 146, 60, 0.2);
          font-size: 11px;
          color: var(--ember-400);
          font-family: var(--font-mono);
          white-space: nowrap;
          overflow: hidden;
        }

        /* ── Theme toggle ────────────────────────── */
        .theme-toggle {
          display: flex;
          gap: 2px;
          background: var(--bg-elevated);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 3px;
          overflow: hidden;
        }
        .theme-toggle--collapsed {
          flex-direction: column;
        }

        .theme-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          gap: 5px;
          padding: 5px 6px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 11px;
          cursor: pointer;
          transition: color 150ms, background 150ms;
          white-space: nowrap;
          overflow: hidden;
        }
        .theme-btn:hover { color: var(--text-primary); }
        .theme-btn--active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .snav-item--settings { margin-top: 2px; }

        /* ── Breakpoints ─────────────────────────── */
        @media (min-width: 1024px) {
          .sidebar { display: flex; }
        }
      `}</style>
    </>
  )
}

// ─── LangIndicator ────────────────────────────────────────────

function LangIndicator({ lang, due }: { lang: LanguageCode; due: number }) {
  const info = LANGUAGES[lang]

  return (
    <div className={`lang-ind lang-ind--${lang}`}>
      <span className="lang-ind__name">{info.name}</span>
      <div className="lang-ind__bar-wrap">
        <div className={`lang-ind__bar lang-ind__bar--${lang}`} />
      </div>
      <span className={`lang-ind__due ${due > 0 ? 'lang-ind__due--active' : ''}`}>
        {due > 0 ? due : '✓'}
      </span>
      <style>{`
        .lang-ind {
          display: flex; align-items: center; gap: 7px;
          padding: 2px 2px;
        }
        .lang-ind__name {
          font-size: 11px; color: var(--text-muted);
          min-width: 42px; font-weight: 400;
        }
        .lang-ind__bar-wrap {
          flex: 1; height: 3px;
          background: var(--bg-elevated);
          border-radius: 99px; overflow: hidden;
        }
        .lang-ind__bar {
          height: 100%; width: 60%;
          border-radius: 99px;
          transition: width 400ms ease;
        }
        .lang-ind__bar--ru { background: var(--ember-500); }
        .lang-ind__bar--de { background: var(--gold-500); }
        .lang-ind__bar--en { background: var(--lucid-500); }
        .lang-ind__due {
          font-family: var(--font-mono); font-size: 10px;
          color: var(--text-muted); min-width: 20px; text-align: right;
        }
        .lang-ind__due--active { color: var(--crimson-400); }
      `}</style>
    </div>
  )
}
