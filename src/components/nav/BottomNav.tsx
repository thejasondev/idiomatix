/* ──────────────────────────────────────────────────────────────
   BottomNav — Floating Liquid Glass Navigation
   Inspirado en iOS 26 · visionOS · Apple Intelligence UI

   Técnica:
   · backdrop-filter: blur + saturate para el efecto glass
   · Capa de noise SVG como textura de vidrio
   · Highlight especular superior (borde-top brillante)
   · Pill indicator animado bajo el ícono activo
   · spring physics en el indicador via CSS custom properties
   · Sombra multicapa para elevación realista
   · safe-area-inset-bottom para iPhone con notch/island
────────────────────────────────────────────────────────────── */

import { useEffect, useState, useRef } from 'react'
import { Home, BookOpen, Dumbbell, GraduationCap, BarChart2, Library, ClipboardCheck } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',            label: 'Inicio',    icon: Home          },
  { href: '/vocabulario', label: 'Vocab',     icon: BookOpen      },
  { href: '/lectura',     label: 'Lectura',   icon: Library       },
  { href: '/gramatica',   label: 'Gramática', icon: GraduationCap },
  { href: '/practicar',   label: 'Practicar', icon: Dumbbell      },
  { href: '/examen',      label: 'Examen',    icon: ClipboardCheck},
  { href: '/progreso',    label: 'Progreso',  icon: BarChart2     },
]

interface Props {
  activeNav?: string
}

export default function BottomNav({ activeNav = '/' }: Props) {
  const [current, setCurrent] = useState(activeNav)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const [tapped, setTapped] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const navRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  // Sync with URL on client + after View Transition swaps
  useEffect(() => {
    setCurrent(window.location.pathname)

    const onSwap = () => setCurrent(window.location.pathname)
    document.addEventListener('astro:after-swap', onSwap)
    return () => document.removeEventListener('astro:after-swap', onSwap)
  }, [])

  // Scroll-aware: hide on scroll down, show on scroll up
  useEffect(() => {
    const THRESHOLD = 12 // px of scroll before toggling
    const handleScroll = () => {
      const y = window.scrollY
      if (y > lastScrollY.current + THRESHOLD) {
        setHidden(true)
      } else if (y < lastScrollY.current - THRESHOLD) {
        setHidden(false)
      }
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animate indicator to active item
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(
      item => current === item.href || (item.href !== '/' && current.startsWith(item.href))
    )
    const el = itemRefs.current[activeIndex]
    const nav = navRef.current
    if (!el || !nav) return

    const elRect  = el.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    const left    = elRect.left - navRect.left + elRect.width * 0.2
    const width   = elRect.width * 0.6

    setIndicatorStyle({ left, width, opacity: 1 })
  }, [current])

  const handleTap = (href: string) => {
    setTapped(href)
    setTimeout(() => setTapped(null), 350)
  }

  return (
    <>
      {/* Noise texture SVG — baked as data URI, zero HTTP request */}
      <svg style={{ display: 'none' }} aria-hidden>
        <filter id="glass-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="overlay" result="noisy" />
          <feComposite in="noisy" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>

      {/* ── The nav pill ── */}
      <nav
        ref={navRef}
        className={`lg-nav ${hidden ? 'lg-nav--hidden' : ''}`}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Glass layers — order matters for realism */}
        <div className="lg-glass__base"    aria-hidden />
        <div className="lg-glass__tint"    aria-hidden />
        <div className="lg-glass__noise"   aria-hidden />
        <div className="lg-glass__edge"    aria-hidden />
        <div className="lg-glass__shimmer" aria-hidden />

        {/* Sliding pill indicator */}
        <div
          className="lg-indicator"
          aria-hidden
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: indicatorStyle.width,
            opacity: indicatorStyle.opacity,
          }}
        />

        {/* Nav items */}
        <div className="lg-items">
          {NAV_ITEMS.map((item, i) => {
            const isActive = current === item.href ||
              (item.href !== '/' && current.startsWith(item.href))
            const isTapped = tapped === item.href

            return (
              <a
                key={item.href}
                ref={el => { itemRefs.current[i] = el }}
                href={item.href}
                className={`lg-item ${isActive ? 'lg-item--active' : ''} ${isTapped ? 'lg-item--tapped' : ''}`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleTap(item.href)}
              >
                <span className="lg-item__icon-wrap">
                  <item.icon
                    size={22}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="lg-item__icon"
                  />
                </span>
                <span className="lg-item__label">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      <style>{`
        /* ── Positioning ────────────────────────────── */
        .lg-nav {
          position: fixed;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          z-index: 400;

          /* Pill shape */
          border-radius: 28px;
          width: min(calc(100% - 32px), 420px);

          /* Clip glass layers */
          overflow: hidden;

          /* Isolation for mix-blend-mode children */
          isolation: isolate;

          /* Scroll-aware transition */
          transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 320ms ease;

          /* Elevation shadow — layered for depth */
          box-shadow:
            0 0 0 0.5px rgba(255,255,255,0.12),
            0 2px 8px  rgba(0,0,0,0.18),
            0 8px 24px rgba(0,0,0,0.22),
            0 20px 48px rgba(0,0,0,0.16),
            inset 0 0.5px 0 rgba(255,255,255,0.18);
        }

        /* Scroll-aware: slide down + fade when user scrolls down */
        .lg-nav--hidden {
          transform: translateX(-50%) translateY(calc(100% + 24px));
          opacity: 0;
          pointer-events: none;
        }

        /* ── Glass system ───────────────────────────── */

        /* Base: the blur + transparency */
        .lg-glass__base {
          position: absolute; inset: 0;
          backdrop-filter: blur(28px) saturate(180%) brightness(1.08);
          -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(1.08);
          border-radius: inherit;
          background: transparent;
        }

        /* Tint: semi-transparent fill */
        .lg-glass__tint {
          position: absolute; inset: 0;
          border-radius: inherit;
          background: rgba(18, 20, 26, 0.72);
        }

        /* Light mode override */
        [data-theme="light"] .lg-glass__tint {
          background: rgba(240, 242, 248, 0.78);
        }

        /* Noise: micro-texture for material feel */
        .lg-glass__noise {
          position: absolute; inset: 0;
          border-radius: inherit;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-size: 120px 120px;
        }

        /* Edge: border definition */
        .lg-glass__edge {
          position: absolute; inset: 0;
          border-radius: inherit;
          border: 0.5px solid rgba(255,255,255,0.10);
          pointer-events: none;
        }
        [data-theme="light"] .lg-glass__edge {
          border-color: rgba(0,0,0,0.07);
        }

        /* Shimmer: specular highlight on the top edge — the iOS magic */
        .lg-glass__shimmer {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          border-radius: 28px 28px 0 0;
          background: linear-gradient(
            90deg,
            transparent          0%,
            rgba(255,255,255,0.06) 15%,
            rgba(255,255,255,0.28) 40%,
            rgba(255,255,255,0.32) 50%,
            rgba(255,255,255,0.28) 60%,
            rgba(255,255,255,0.06) 85%,
            transparent          100%
          );
          pointer-events: none;
        }

        /* ── Sliding pill indicator ──────────────────── */
        .lg-indicator {
          position: absolute;
          bottom: 8px;
          height: 3px;
          border-radius: 2px;
          background: var(--verdant-500);
          box-shadow: 0 0 8px rgba(45,212,191,0.6), 0 0 16px rgba(45,212,191,0.25);
          transition:
            transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
            width     380ms cubic-bezier(0.34, 1.56, 0.64, 1),
            opacity   200ms ease;
          pointer-events: none;
        }

        /* ── Items layout ────────────────────────────── */
        .lg-items {
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px 4px 12px;
        }

        /* ── Individual item ─────────────────────────── */
        .lg-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 2px;
          text-decoration: none;
          color: rgba(148, 163, 184, 0.7);
          border-radius: 18px;
          transition:
            color 220ms ease,
            transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .lg-item:hover {
          color: rgba(203, 213, 225, 0.9);
        }

        .lg-item--active {
          color: var(--verdant-400);
        }

        /* Spring bounce on tap */
        .lg-item--tapped {
          transform: scale(0.88);
        }

        /* Icon container — glow on active */
        .lg-item__icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          transition: background 220ms ease;
          position: relative;
        }

        .lg-item--active .lg-item__icon-wrap::after {
          content: '';
          position: absolute; inset: -2px;
          border-radius: 12px;
          background: radial-gradient(circle at 50% 50%, rgba(45,212,191,0.14), transparent 70%);
        }

        .lg-item__icon {
          transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .lg-item--active .lg-item__icon {
          transform: translateY(-1px);
          filter: drop-shadow(0 0 4px rgba(45,212,191,0.5));
        }

        /* Label */
        .lg-item__label {
          font-family: var(--font-body);
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          transition: opacity 220ms ease;
          opacity: 0.6;
        }

        .lg-item--active .lg-item__label {
          opacity: 1;
          color: var(--verdant-400);
        }

        /* ── Light mode adjustments ──────────────────── */
        [data-theme="light"] .lg-nav {
          box-shadow:
            0 0 0 0.5px rgba(0,0,0,0.07),
            0 2px 8px  rgba(0,0,0,0.07),
            0 8px 24px rgba(0,0,0,0.09),
            0 20px 48px rgba(0,0,0,0.06),
            inset 0 0.5px 0 rgba(255,255,255,0.85);
        }

        [data-theme="light"] .lg-item {
          color: rgba(100, 116, 139, 0.7);
        }
        [data-theme="light"] .lg-item:hover {
          color: rgba(71, 85, 105, 0.9);
        }
        [data-theme="light"] .lg-item--active {
          color: var(--verdant-700);
        }
        [data-theme="light"] .lg-item--active .lg-item__label {
          color: var(--verdant-700);
        }
        [data-theme="light"] .lg-glass__shimmer {
          background: linear-gradient(
            90deg,
            transparent          0%,
            rgba(255,255,255,0.2) 20%,
            rgba(255,255,255,0.7) 50%,
            rgba(255,255,255,0.2) 80%,
            transparent          100%
          );
        }

        /* ── Desktop: hide completely ─────────────────── */
        @media (min-width: 768px) {
          .lg-nav { display: none; }
        }

        /* ── Landscape compact mode ──────────────────── */
        @media (max-height: 500px) and (orientation: landscape) {
          .lg-nav {
            bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          }
          .lg-items {
            padding: 5px 4px 8px;
          }
          .lg-item__label {
            display: none;
          }
          .lg-item__icon-wrap {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </>
  )
}
