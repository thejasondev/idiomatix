/* ──────────────────────────────────────────────────────────────
   OfflineBanner — Indicador de estado de conexión PWA
   Se muestra discretamente cuando la aplicación pierde conexión.
────────────────────────────────────────────────────────────── */

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <>
      <div className="offline-banner" role="alert" aria-live="assertive">
        <div className="offline-banner__inner">
          <WifiOff size={16} strokeWidth={2} />
          <span>Estás sin conexión. Idiomatix sigue funcionando offline.</span>
          <button 
            className="offline-banner__retry" 
            onClick={() => window.location.reload()}
            aria-label="Reintentar conexión"
          >
            <RefreshCw size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <style>{`
        .offline-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          padding: 6px;
          pointer-events: none;
          animation: slideDown 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .offline-banner__inner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--amber-500);
          color: var(--bg-base);
          padding: 8px 16px;
          border-radius: 99px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          pointer-events: auto;
        }

        .offline-banner__retry {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          color: inherit;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
          transition: background 150ms, transform 150ms;
          margin-left: 4px;
        }

        .offline-banner__retry:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        
        .offline-banner__retry:active {
          transform: scale(0.9);
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
