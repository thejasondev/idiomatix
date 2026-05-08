/* ──────────────────────────────────────────────────────────────
   FlashCard — Componente principal de estudio con flip animation
────────────────────────────────────────────────────────────── */

import { useState, useCallback, useEffect } from 'react'
import { Volume2, Eye } from 'lucide-react'
import PronunciationPractice from '@/components/PronunciationPractice'
import type { VocabCard } from '@/types'
import { LANGUAGES } from '@/types'
import { speak, isTTSSupported } from '@/lib/tts'
import { formatInterval } from '@/lib/sm2'

export type UIRating = 'hard' | 'ok' | 'easy'

interface Props {
  card: VocabCard
  onRate: (rating: UIRating) => void
  nextInterval?: { hard: number; ok: number; easy: number }
  showPhonetic?: boolean
  autoPlayAudio?: boolean
  cardNumber?: number
  totalCards?: number
}

export default function FlashCard({
  card,
  onRate,
  nextInterval,
  showPhonetic = true,
  autoPlayAudio = false,
  cardNumber,
  totalCards,
}: Props) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const ttsSupported = isTTSSupported()
  const lang = LANGUAGES[card.lang]

  // Auto-play on mount if enabled
  useEffect(() => {
    setIsFlipped(false)
    if (autoPlayAudio) {
      const timer = setTimeout(() => speak(card.front, card.lang), 400)
      return () => clearTimeout(timer)
    }
  }, [card.id, autoPlayAudio, card.front, card.lang])

  const handleFlip = useCallback(() => {
    if (isAnimating || isFlipped) return
    setIsAnimating(true)
    setTimeout(() => {
      setIsFlipped(true)
      setIsAnimating(false)
    }, 150)
  }, [isAnimating, isFlipped])

  const handleRate = useCallback((rating: UIRating) => {
    setIsFlipped(false)
    onRate(rating)
  }, [onRate])

  const handleSpeak = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    speak(card.front, card.lang)
  }, [card.front, card.lang])

  return (
    <div className="fc-wrapper">
      {/* Progress indicator */}
      {cardNumber != null && totalCards != null && (
        <div className="fc-progress">
          <div className="fc-progress__bar">
            <div
              className="fc-progress__fill"
              style={{ width: `${((cardNumber - 1) / totalCards) * 100}%` }}
            />
          </div>
          <span className="fc-progress__label">
            {cardNumber} / {totalCards}
          </span>
        </div>
      )}

      {/* Card */}
      <div
        className={`fc-card ${isFlipped ? 'fc-card--flipped' : ''} ${isAnimating ? 'fc-card--animating' : ''}`}
        onClick={!isFlipped ? handleFlip : undefined}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Tarjeta volteada' : 'Presiona para ver la traducción'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFlip() }}
      >
        {/* Lang + Level badge */}
        <div className="fc-meta">
          <span className={`fc-badge fc-badge--${card.lang}`}>
            {lang.name} · {card.level}
          </span>
          {ttsSupported && (
            <button
              className="fc-speak-btn"
              onClick={handleSpeak}
              aria-label="Escuchar pronunciación"
              type="button"
            >
              <Volume2 size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Front: target language word */}
        <div className="fc-front">
          <p className="fc-word">{card.front}</p>
          {showPhonetic && card.phonetic && (
            <p className="fc-phonetic">{card.phonetic}</p>
          )}
          {card.partOfSpeech && (
            <p className="fc-pos">{translatePOS(card.partOfSpeech)}</p>
          )}
        </div>

        {/* Back: translation + example */}
        {isFlipped ? (
          <div className="fc-back animate-fade-in">
            <div className="fc-divider" />
            <p className="fc-translation">{card.back}</p>
            {/* STT pronunciation practice */}
            <PronunciationPractice word={card.front} lang={card.lang} />
            {card.example && (
              <div className="fc-example">
                <p className="fc-example__sentence">{card.example}</p>
                {card.exampleTranslation && (
                  <p className="fc-example__translation">{card.exampleTranslation}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="fc-tap-hint">
            <Eye size={14} strokeWidth={1.5} />
            <span>Toca para revelar</span>
          </div>
        )}
      </div>

      {/* Rating buttons — only visible when flipped */}
      {isFlipped && (
        <div className="fc-rating animate-slide-up">
          <button
            className="fc-rating__btn fc-rating__btn--hard"
            onClick={() => handleRate('hard')}
            type="button"
          >
            <span className="fc-rating__label">Difícil</span>
            {nextInterval && (
              <span className="fc-rating__interval">{formatInterval(nextInterval.hard)}</span>
            )}
          </button>
          <button
            className="fc-rating__btn fc-rating__btn--ok"
            onClick={() => handleRate('ok')}
            type="button"
          >
            <span className="fc-rating__label">Regular</span>
            {nextInterval && (
              <span className="fc-rating__interval">{formatInterval(nextInterval.ok)}</span>
            )}
          </button>
          <button
            className="fc-rating__btn fc-rating__btn--easy"
            onClick={() => handleRate('easy')}
            type="button"
          >
            <span className="fc-rating__label">Fácil</span>
            {nextInterval && (
              <span className="fc-rating__interval">{formatInterval(nextInterval.easy)}</span>
            )}
          </button>
        </div>
      )}

      <style>{`
        .fc-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 420px;
          margin-inline: auto;
        }

        .fc-progress {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fc-progress__bar {
          flex: 1;
          height: 3px;
          background: var(--bg-elevated);
          border-radius: 99px;
          overflow: hidden;
        }

        .fc-progress__fill {
          height: 100%;
          background: var(--verdant-600);
          border-radius: 99px;
          transition: width 300ms ease;
        }

        .fc-progress__label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .fc-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: 20px;
          padding: 1.75rem 1.5rem 1.5rem;
          min-height: 240px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          cursor: pointer;
          transition: border-color 150ms ease, transform 120ms ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .fc-card:hover:not(.fc-card--flipped) {
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }

        .fc-card--flipped {
          cursor: default;
        }

        .fc-card--animating {
          transform: scaleX(0.95);
          opacity: 0.7;
        }

        .fc-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fc-badge {
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
        }

        .fc-badge--ru {
          background: var(--lang-ru-bg);
          color: var(--lang-ru);
          border: 0.5px solid var(--lang-ru-border);
        }

        .fc-badge--de {
          background: var(--lang-de-bg);
          color: var(--lang-de);
          border: 0.5px solid var(--lang-de-border);
        }

        .fc-badge--en {
          background: var(--lang-en-bg);
          color: var(--lang-en);
          border: 0.5px solid var(--lang-en-border);
        }

        .fc-speak-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 0.5px solid var(--border-default);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 150ms, background 150ms;
        }

        .fc-speak-btn:hover {
          color: var(--verdant-500);
          background: var(--bg-elevated);
        }

        .fc-front {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
          padding: 0.5rem 0;
        }

        .fc-word {
          font-family: var(--font-display);
          font-size: clamp(1.6rem, 5vw, 2.2rem);
          color: var(--text-primary) !important;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .fc-phonetic {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--verdant-400) !important;
        }

        .fc-pos {
          font-size: 11px;
          color: var(--text-muted) !important;
          font-style: italic;
        }

        .fc-tap-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: var(--text-muted);
          font-size: 12px;
          padding-bottom: 4px;
        }

        .fc-back {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fc-divider {
          height: 0.5px;
          background: var(--border-subtle);
          margin: 0 -0.25rem;
        }

        .fc-translation {
          font-family: var(--font-body);
          font-size: 1.15rem;
          font-weight: 500;
          color: var(--text-primary) !important;
          text-align: center;
        }

        .fc-example {
          background: var(--bg-elevated);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fc-example__sentence {
          font-size: 13px;
          color: var(--text-secondary) !important;
          font-style: italic;
        }

        .fc-example__translation {
          font-size: 12px;
          color: var(--text-muted) !important;
        }

        /* Rating */
        .fc-rating {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .fc-rating__btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 10px 8px;
          border-radius: 12px;
          border: 0.5px solid transparent;
          cursor: pointer;
          transition: transform 100ms ease, background 150ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .fc-rating__btn:active {
          transform: scale(0.96);
        }

        .fc-rating__btn--hard {
          background: rgba(248, 113, 113, 0.1);
          border-color: rgba(248, 113, 113, 0.2);
          color: var(--crimson-400);
        }

        .fc-rating__btn--hard:hover {
          background: rgba(248, 113, 113, 0.18);
        }

        .fc-rating__btn--ok {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.2);
          color: var(--gold-400);
        }

        .fc-rating__btn--ok:hover {
          background: rgba(251, 191, 36, 0.18);
        }

        .fc-rating__btn--easy {
          background: rgba(45, 212, 191, 0.1);
          border-color: rgba(45, 212, 191, 0.2);
          color: var(--verdant-400);
        }

        .fc-rating__btn--easy:hover {
          background: rgba(45, 212, 191, 0.18);
        }

        .fc-rating__label {
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
        }

        .fc-rating__interval {
          font-family: var(--font-mono);
          font-size: 10px;
          opacity: 0.75;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 200ms ease both;
        }

        .animate-slide-up {
          animation: slideUp 250ms ease both;
        }
      `}</style>
    </div>
  )
}

function translatePOS(pos: string): string {
  const map: Record<string, string> = {
    noun: 'sustantivo',
    verb: 'verbo',
    adjective: 'adjetivo',
    adverb: 'adverbio',
    pronoun: 'pronombre',
    preposition: 'preposición',
    conjunction: 'conjunción',
    interjection: 'interjección',
    numeral: 'numeral',
    phrase: 'frase',
  }
  return map[pos] ?? pos
}
