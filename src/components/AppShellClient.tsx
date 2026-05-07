/* ──────────────────────────────────────────────────────────────
   AppShellClient — Island global de la app
   · Inicializa el seed de IndexedDB
   · Sincroniza el tema al DOM
   · Renderiza el ToastContainer global
   Montado una sola vez en AppLayout como client:load
────────────────────────────────────────────────────────────── */

import { useEffect } from 'react'
import { useUIStore } from '@/stores'
import { seedBuiltinDecks } from '@/db/seed'

// Inline Toast to avoid circular dep with the full UI index
import { Toast } from '@/components/ui'

export default function AppShellClient() {
  const { toast, clearToast, theme, setTheme } = useUIStore()

  // Sync theme on mount and when it changes
  useEffect(() => {
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    document.documentElement.setAttribute('data-theme', resolved)
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

  // Seed built-in decks on first load (idempotent)
  useEffect(() => {
    seedBuiltinDecks().catch(err =>
      console.error('[AppShell] Seed failed:', err)
    )
  }, [])

  if (!toast) return null

  return (
    <>
      <div className="toast-container" role="status" aria-live="polite">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      </div>

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
