/* ──────────────────────────────────────────────────────────────
   PronunciationPractice — Botón de micrófono + feedback STT
   Se integra dentro de FlashCard cuando la carta está volteada.
   Features:
   · Anillo animado mientras escucha
   · Muestra el transcript del usuario
   · Score de similitud 0–100 con grado (perfect/good/acceptable/wrong)
   · Colores de feedback coherentes con el design system
   · Tooltip de soporte para browsers sin SpeechRecognition
────────────────────────────────────────────────────────────── */

import { useCallback } from 'react'
import { Mic, MicOff, Loader } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { LanguageCode } from '@/types'

interface Props {
  word: string          // La palabra / frase a pronunciar
  lang: LanguageCode
  compact?: boolean     // true → solo icono sin label
}

export default function PronunciationPractice({ word, lang, compact = false }: Props) {
  const { status, result, error, isSupported, listen, reset } = useSpeechRecognition()

  const handleListen = useCallback(() => {
    if (status === 'listening') { reset(); return }
    listen({ lang, expected: word, maxDurationMs: 7000 })
  }, [status, lang, word, listen, reset])

  if (!isSupported) {
    return (
      <div className="pp-unsupported" title="Tu navegador no soporta reconocimiento de voz">
        <MicOff size={14} strokeWidth={1.5} />
        {!compact && <span>STT no disponible</span>}
        <style>{PP_STYLES}</style>
      </div>
    )
  }

  const gradeConfig = {
    perfect:    { color: 'var(--verdant-400)',  bg: 'rgba(45,212,191,0.1)',  label: '¡Perfecto!',   emoji: '🎯' },
    good:       { color: 'var(--verdant-400)',  bg: 'rgba(45,212,191,0.07)', label: '¡Muy bien!',   emoji: '👍' },
    acceptable: { color: 'var(--gold-400)',     bg: 'rgba(251,191,36,0.1)',  label: 'Aceptable',    emoji: '💪' },
    wrong:      { color: 'var(--crimson-400)',  bg: 'rgba(248,113,113,0.1)', label: 'Inténtalo otra vez', emoji: '🔁' },
  }

  const cfg = result ? gradeConfig[result.grade] : null

  return (
    <div className="pp-wrapper">
      {/* Microphone button */}
      <button
        className={`pp-btn pp-btn--${status}`}
        onClick={status === 'success' || status === 'error' ? reset : handleListen}
        type="button"
        aria-label={
          status === 'listening' ? 'Detener grabación' :
          status === 'success'   ? 'Repetir pronunciación' :
          'Practicar pronunciación'
        }
        disabled={status === 'processing'}
      >
        {/* Pulse ring when listening */}
        {status === 'listening' && <span className="pp-ring" aria-hidden />}

        {/* Icon */}
        <span className="pp-btn__icon">
          {status === 'processing'
            ? <Loader size={16} strokeWidth={2} className="pp-spin" />
            : status === 'listening'
              ? <Mic size={16} strokeWidth={2} />
              : <Mic size={16} strokeWidth={1.5} />
          }
        </span>

        {!compact && (
          <span className="pp-btn__label">
            {status === 'idle'       && 'Pronunciar'}
            {status === 'listening'  && 'Escuchando…'}
            {status === 'processing' && 'Analizando…'}
            {status === 'success'    && 'Repetir'}
            {status === 'error'      && 'Reintentar'}
          </span>
        )}
      </button>

      {/* Result feedback */}
      {status === 'success' && result && cfg && (
        <div className="pp-result" style={{ background: cfg.bg, borderColor: cfg.color + '40' }}>
          <div className="pp-result__header">
            <span className="pp-result__emoji" aria-hidden>{cfg.emoji}</span>
            <span className="pp-result__label" style={{ color: cfg.color }}>{cfg.label}</span>
            <span className="pp-result__score" style={{ color: cfg.color }}>
              {result.similarity}%
            </span>
          </div>
          {result.transcript && (
            <p className="pp-result__transcript">
              <span className="pp-result__transcript-label">Dijiste:</span>
              <span className="pp-result__transcript-text">"{result.transcript}"</span>
            </p>
          )}
          {result.grade !== 'perfect' && (
            <p className="pp-result__expected">
              <span className="pp-result__transcript-label">Correcto:</span>
              <span className="pp-result__transcript-text" style={{ color: 'var(--verdant-400)' }}>"{word}"</span>
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div className="pp-error">
          <MicOff size={12} strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      <style>{PP_STYLES}</style>
    </div>
  )
}

const PP_STYLES = `
  .pp-wrapper { display: flex; flex-direction: column; gap: 8px; width: 100%; }

  .pp-unsupported {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; color: var(--text-muted);
    padding: 5px 10px; border-radius: var(--radius-md);
    background: var(--bg-elevated); border: 0.5px solid var(--border-default);
    cursor: not-allowed; opacity: 0.6;
  }

  /* ── Microphone button ── */
  .pp-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-family: var(--font-body); font-size: 13px;
    cursor: pointer; position: relative; overflow: hidden;
    transition: all 180ms ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none; min-width: 120px;
  }

  .pp-btn:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .pp-btn--listening {
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.35);
    color: var(--crimson-400);
  }
  .pp-btn--listening:hover:not(:disabled) {
    background: rgba(248,113,113,0.13);
  }

  .pp-btn--processing { opacity: 0.7; cursor: wait; }

  .pp-btn--success {
    background: rgba(45,212,191,0.07);
    border-color: rgba(45,212,191,0.3);
    color: var(--verdant-400);
  }

  .pp-btn--error {
    background: rgba(248,113,113,0.06);
    border-color: rgba(248,113,113,0.25);
    color: var(--crimson-400);
  }

  .pp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .pp-btn:active:not(:disabled) { transform: scale(0.96); }

  .pp-btn__icon { display: flex; align-items: center; }
  .pp-btn__label { font-size: 12px; }

  /* Pulse ring */
  .pp-ring {
    position: absolute; inset: -2px;
    border-radius: inherit;
    border: 1.5px solid var(--crimson-400);
    opacity: 0;
    animation: ppRing 1.4s ease-out infinite;
    pointer-events: none;
  }
  @keyframes ppRing {
    0%   { transform: scale(0.95); opacity: 0.7; }
    70%  { transform: scale(1.06); opacity: 0; }
    100% { opacity: 0; }
  }

  /* Spinner */
  @keyframes ppSpin { to { transform: rotate(360deg); } }
  .pp-spin { animation: ppSpin 700ms linear infinite; }

  /* ── Result card ── */
  .pp-result {
    border: 0.5px solid;
    border-radius: var(--radius-md);
    padding: 10px 12px;
    display: flex; flex-direction: column; gap: 6px;
    animation: ppIn 200ms ease;
  }
  @keyframes ppIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

  .pp-result__header {
    display: flex; align-items: center; gap: 8px;
  }
  .pp-result__emoji { font-size: 14px; flex-shrink: 0; }
  .pp-result__label { font-size: 13px; font-weight: 500; flex: 1; }
  .pp-result__score {
    font-family: var(--font-mono); font-size: 13px; font-weight: 500;
    margin-left: auto;
  }

  .pp-result__transcript,
  .pp-result__expected {
    display: flex; align-items: baseline; gap: 6px;
    font-size: 12px;
  }
  .pp-result__transcript-label { color: var(--text-muted); flex-shrink: 0; }
  .pp-result__transcript-text  { color: var(--text-secondary); font-style: italic; }

  /* ── Error ── */
  .pp-error {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--crimson-400);
    padding: 6px 10px;
    background: rgba(248,113,113,0.06);
    border: 0.5px solid rgba(248,113,113,0.2);
    border-radius: var(--radius-md);
    animation: ppIn 200ms ease;
  }
`
