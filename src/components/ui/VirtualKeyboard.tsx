/* ──────────────────────────────────────────────────────────────
   VirtualKeyboard — Teclado virtual para Cirílico (RU) y
   caracteres especiales alemanes (DE).
   Se inserta inline en cualquier campo de texto activo.
────────────────────────────────────────────────────────────── */

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LanguageCode } from '@/types'

// ─── Key layouts ──────────────────────────────────────────────

const RU_ROWS: string[][] = [
  ['й','ц','у','к','е','н','г','ш','щ','з','х','ъ'],
  ['ф','ы','в','а','п','р','о','л','д','ж','э'],
  ['я','ч','с','м','и','т','ь','б','ю'],
]

const RU_ROWS_UPPER: string[][] = [
  ['Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х','Ъ'],
  ['Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э'],
  ['Я','Ч','С','М','И','Т','Ь','Б','Ю'],
]

const DE_SPECIAL: string[] = ['ä','ö','ü','ß','Ä','Ö','Ü']

// ─── Component ────────────────────────────────────────────────

interface VirtualKeyboardProps {
  lang: LanguageCode
  onKey: (char: string) => void
  onBackspace: () => void
  onSpace: () => void
  visible?: boolean
  onToggle?: () => void
}

export default function VirtualKeyboard({
  lang,
  onKey,
  onBackspace,
  onSpace,
  visible = true,
  onToggle,
}: VirtualKeyboardProps) {
  const [caps, setCaps] = useState(false)

  const handleKey = useCallback(
    (char: string) => {
      onKey(char)
    },
    [onKey]
  )

  if (lang === 'en') return null // No virtual keyboard needed for English

  return (
    <>
      <div className={`vkb ${visible ? 'vkb--visible' : 'vkb--hidden'}`}>
        {/* Header */}
        <div className="vkb__header">
          <span className="vkb__lang-label">
            {lang === 'ru' ? '🇷🇺 Teclado ruso' : '🇩🇪 Caracteres alemanes'}
          </span>
          {onToggle && (
            <button className="vkb__toggle" onClick={onToggle} type="button" aria-label="Ocultar teclado">
              {visible ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>

        {/* Russian full keyboard */}
        {lang === 'ru' && (
          <div className="vkb__ru">
            {(caps ? RU_ROWS_UPPER : RU_ROWS).map((row, ri) => (
              <div key={ri} className="vkb__row">
                {row.map((char) => (
                  <button
                    key={char}
                    className="vkb__key"
                    onClick={() => handleKey(char)}
                    type="button"
                    aria-label={char}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
            {/* Control row */}
            <div className="vkb__row vkb__row--controls">
              <button
                className={`vkb__key vkb__key--caps ${caps ? 'vkb__key--active' : ''}`}
                onClick={() => setCaps(c => !c)}
                type="button"
                aria-label="Mayúsculas"
                aria-pressed={caps}
              >
                ⇧
              </button>
              <button
                className="vkb__key vkb__key--space"
                onClick={onSpace}
                type="button"
                aria-label="Espacio"
              >
                espacio
              </button>
              <button
                className="vkb__key vkb__key--backspace"
                onClick={onBackspace}
                type="button"
                aria-label="Borrar"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* German special chars — compact strip */}
        {lang === 'de' && (
          <div className="vkb__de">
            <div className="vkb__row">
              {DE_SPECIAL.map((char) => (
                <button
                  key={char}
                  className="vkb__key vkb__key--de"
                  onClick={() => handleKey(char)}
                  type="button"
                  aria-label={char}
                >
                  {char}
                </button>
              ))}
              <button
                className="vkb__key vkb__key--backspace"
                onClick={onBackspace}
                type="button"
                aria-label="Borrar"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .vkb {
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: opacity 200ms ease, transform 200ms ease;
        }
        .vkb--hidden { display: none; }
        .vkb--visible { display: block; }

        .vkb__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 0.5px solid var(--border-subtle);
        }
        .vkb__lang-label {
          font-size: 11px; font-family: var(--font-mono);
          color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
        }
        .vkb__toggle {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
          border: none; background: transparent;
          color: var(--text-muted); cursor: pointer; border-radius: 6px;
        }
        .vkb__toggle:hover { background: var(--bg-elevated); color: var(--text-secondary); }

        .vkb__ru, .vkb__de { padding: 8px 10px 10px; }

        .vkb__row {
          display: flex; justify-content: center;
          gap: 4px; margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .vkb__row--controls { margin-top: 4px; }

        .vkb__key {
          min-width: 28px; height: 36px;
          padding: 0 6px;
          background: var(--bg-elevated);
          border: 0.5px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          cursor: pointer;
          transition: background 100ms, transform 80ms;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          display: flex; align-items: center; justify-content: center;
        }
        .vkb__key:active { transform: scale(0.92); background: var(--border-strong); }

        .vkb__key--de {
          min-width: 40px; font-size: 15px;
          border-color: var(--lang-de-border);
          color: var(--lang-de);
          background: var(--lang-de-bg);
        }

        .vkb__key--caps {
          font-size: 16px; min-width: 42px;
        }
        .vkb__key--caps.vkb__key--active {
          background: var(--verdant-700);
          border-color: var(--verdant-600);
          color: var(--text-primary);
        }

        .vkb__key--space {
          flex: 1; max-width: 160px;
          font-size: 11px; color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .vkb__key--backspace {
          min-width: 42px; font-size: 16px;
          color: var(--crimson-400);
          border-color: rgba(248,113,113,0.2);
          background: rgba(248,113,113,0.06);
        }
        .vkb__key--backspace:active { background: rgba(248,113,113,0.15); }

        @media (max-width: 360px) {
          .vkb__key { min-width: 24px; height: 32px; font-size: 13px; }
        }
      `}</style>
    </>
  )
}
