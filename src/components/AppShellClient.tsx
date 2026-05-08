/* ──────────────────────────────────────────────────────────────
   AppShellClient — Island global de la app
   · Inicializa el seed de IndexedDB
   · Sincroniza el tema al DOM
   · Renderiza el ToastContainer global
   Montado una sola vez en AppLayout como client:load
────────────────────────────────────────────────────────────── */

import { useEffect } from 'react'
import { useUIStore } from '@/stores'

// Inline Toast to avoid circular dep with the full UI index
import { Toast } from '@/components/ui'

import OfflineBanner from '@/components/OfflineBanner'

export default function AppShellClient() {
  const { toast, clearToast, theme, setTheme } = useUIStore()

  // Sync theme on mount and when it changes, AND on SPA navigation
  useEffect(() => {
    const applyTheme = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme
      document.documentElement.setAttribute('data-theme', resolved)
    }

    applyTheme() // Apply initially

    // During view transitions, Astro replaces the HTML element, wiping out our attribute.
    // We must re-apply it after every swap.
    document.addEventListener('astro:after-swap', applyTheme)
    return () => document.removeEventListener('astro:after-swap', applyTheme)
  }, [theme])

  // Listen for system theme changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute(
        'data-theme',
        e.matches ? 'dark' : 'light'
      )
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <>
      <OfflineBanner />
      {toast && (
      <div className="toast-container" role="status" aria-live="polite">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      </div>
      )}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: calc(90px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          z-index: 300;
          width: calc(100% - 2.5rem);
          max-width: 380px;
          pointer-events: none;
        }
        .toast-container > * {
          pointer-events: auto;
        }
        @media (min-width: 768px) {
          .toast-container {
            bottom: 1.5rem;
            left: calc(220px + 50%);
          }
        }
      `}</style>
    </>
  )
}
