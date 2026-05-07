/* ──────────────────────────────────────────────────────────────
   StudySession — Orquestador de sesión de estudio completa
   Gestiona: cola · flip · rating · SM-2 · resumen final
────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, BarChart2, RotateCcw, Home } from 'lucide-react'
import FlashCard, { type UIRating } from '@/components/flashcards/FlashCard'
import { Spinner, Button, ProgressBar } from '@/components/ui'
import { useStudyQueue, useTimer } from '@/hooks'
import { calculateSM2, uiRatingToSM2, formatInterval } from '@/lib/sm2'
import { db, recordDailyActivity } from '@/db'
import type { LanguageCode, VocabCard } from '@/types'
import { LANGUAGES } from '@/types'

interface Props {
  deckId: string
  lang: LanguageCode
  onExit: () => void
}

type SessionPhase = 'loading' | 'studying' | 'complete' | 'empty'

interface ResultEntry {
  card: VocabCard
  rating: UIRating
  intervalDays: number
}

export default function StudySession({ deckId, lang, onExit }: Props) {
  const { queue, reviews, isLoading, submitRating } = useStudyQueue(deckId, lang)
  const { seconds, formatted: timeFormatted, reset: resetTimer } = useTimer(true)

  const [phase, setPhase] = useState<SessionPhase>('loading')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [nextIntervals, setNextIntervals] = useState<{ hard: number; ok: number; easy: number } | undefined>()

  const langInfo = LANGUAGES[lang]

  // Transition to studying once queue is ready
  useEffect(() => {
    if (isLoading) return
    setPhase(queue.length === 0 ? 'empty' : 'studying')
  }, [isLoading, queue.length])

  // Precompute next intervals for current card
  useEffect(() => {
    const card = queue[index]
    if (!card || phase !== 'studying') return

    const existing = reviews.get(card.id) ?? null
    const hard = calculateSM2({ cardId: card.id, deckId, lang, current: existing, rating: uiRatingToSM2('hard') }).intervalDays
    const ok   = calculateSM2({ cardId: card.id, deckId, lang, current: existing, rating: uiRatingToSM2('ok')   }).intervalDays
    const easy = calculateSM2({ cardId: card.id, deckId, lang, current: existing, rating: uiRatingToSM2('easy') }).intervalDays

    setNextIntervals({ hard, ok, easy })
  }, [index, queue, reviews, phase, deckId, lang])

  const handleRate = useCallback(
    async (rating: UIRating) => {
      const card = queue[index]
      if (!card) return

      // Calculate final interval for results display
      const existing = reviews.get(card.id) ?? null
      const { intervalDays } = calculateSM2({
        cardId: card.id, deckId, lang,
        current: existing,
        rating: uiRatingToSM2(rating),
      })

      // Persist to DB
      await submitRating(card, rating)

      setResults(prev => [...prev, { card, rating, intervalDays }])

      const next = index + 1
      if (next >= queue.length) {
        // Session complete — record activity
        const minutesStudied = Math.ceil(seconds / 60)
        await recordDailyActivity(lang, queue.length, minutesStudied)

        // Save session record
        await db.sessions.add({
          id: crypto.randomUUID(),
          lang,
          deckId,
          startedAt: Date.now() - seconds * 1000,
          endedAt: Date.now(),
          cardsReviewed: queue.length,
          cardsCorrect: results.filter(r => r.rating !== 'hard').length + (rating !== 'hard' ? 1 : 0),
          newCardsIntroduced: queue.filter(c => !reviews.has(c.id)).length,
          durationSeconds: seconds,
        })

        setPhase('complete')
      } else {
        setIndex(next)
      }
    },
    [index, queue, reviews, deckId, lang, submitRating, results, seconds]
  )

  // ── Loading ────────────────────────────────────────────────
  if (phase === 'loading' || isLoading) {
    return (
      <div className="ss-center">
        <Spinner size={28} />
        <p className="ss-loading-text">Preparando sesión…</p>
        <style>{SS_STYLES}</style>
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className="ss-center">
        <CheckCircle size={42} strokeWidth={1} style={{ color: 'var(--verdant-400)' }} />
        <h2 className="ss-empty-title">¡Todo al día!</h2>
        <p className="ss-empty-sub">No hay tarjetas pendientes en {langInfo.name} por ahora. Vuelve mañana.</p>
        <Button onClick={onExit}>Volver</Button>
        <style>{SS_STYLES}</style>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────
  if (phase === 'complete') {
    const correct = results.filter(r => r.rating !== 'hard').length
    const accuracy = Math.round((correct / results.length) * 100)
    const hardCards = results.filter(r => r.rating === 'hard')
    const easyCards = results.filter(r => r.rating === 'easy')

    return (
      <div className="ss-complete">
        <div className="ss-complete__header">
          <span className="ss-complete__emoji">
            {accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '📖'}
          </span>
          <h2 className="ss-complete__title">Sesión completada</h2>
          <p className="ss-complete__sub">
            {langInfo.name} · {timeFormatted}
          </p>
        </div>

        <div className="ss-complete__stats">
          <div className="ss-stat">
            <span className="ss-stat__val ss-stat__val--primary">{results.length}</span>
            <span className="ss-stat__label">tarjetas</span>
          </div>
          <div className="ss-stat">
            <span className="ss-stat__val" style={{ color: 'var(--verdant-400)' }}>{accuracy}%</span>
            <span className="ss-stat__label">precisión</span>
          </div>
          <div className="ss-stat">
            <span className="ss-stat__val" style={{ color: 'var(--crimson-400)' }}>{hardCards.length}</span>
            <span className="ss-stat__label">difíciles</span>
          </div>
          <div className="ss-stat">
            <span className="ss-stat__val" style={{ color: 'var(--gold-400)' }}>{easyCards.length}</span>
            <span className="ss-stat__label">fáciles</span>
          </div>
        </div>

        <ProgressBar value={accuracy} lang={lang} label="Precisión" showValue={false} />

        {hardCards.length > 0 && (
          <div className="ss-hard-list">
            <p className="ss-hard-list__title">Tarjetas a repasar</p>
            {hardCards.slice(0, 5).map(({ card }) => (
              <div key={card.id} className="ss-hard-item">
                <span className="ss-hard-item__front">{card.front}</span>
                <span className="ss-hard-item__back">{card.back}</span>
              </div>
            ))}
            {hardCards.length > 5 && (
              <p className="ss-hard-more">+{hardCards.length - 5} más</p>
            )}
          </div>
        )}

        <div className="ss-complete__actions">
          <Button
            variant="ghost"
            onClick={() => { setIndex(0); setResults([]); resetTimer(); setPhase('studying') }}
            fullWidth
          >
            <RotateCcw size={15} /> Repetir sesión
          </Button>
          <Button onClick={onExit} fullWidth>
            <Home size={15} /> Volver al inicio
          </Button>
        </div>

        <style>{SS_STYLES}</style>
      </div>
    )
  }

  // ── Studying ──────────────────────────────────────────────
  const currentCard = queue[index]
  if (!currentCard) return null

  return (
    <div className="ss-study">
      {/* Top bar: timer + progress */}
      <div className="ss-topbar">
        <span className="ss-topbar__timer">{timeFormatted}</span>
        <div className="ss-topbar__progress">
          <div
            className="ss-topbar__fill"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <span className="ss-topbar__count">{index + 1}/{queue.length}</span>
      </div>

      <FlashCard
        card={currentCard}
        onRate={handleRate}
        nextInterval={nextIntervals}
        cardNumber={index + 1}
        totalCards={queue.length}
      />

      <style>{SS_STYLES}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const SS_STYLES = `
  .ss-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 14px;
    min-height: 60vh; text-align: center; padding: 2rem;
  }
  .ss-loading-text { font-size: 14px; color: var(--text-muted); }
  .ss-empty-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
  .ss-empty-sub { font-size: 14px; color: var(--text-muted); max-width: 260px; line-height: 1.5; }

  .ss-study {
    display: flex; flex-direction: column; gap: 1.25rem;
    animation: fadeIn 250ms ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .ss-topbar {
    display: flex; align-items: center; gap: 10px;
  }
  .ss-topbar__timer {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
    white-space: nowrap;
  }
  .ss-topbar__progress {
    flex: 1; height: 3px; background: var(--bg-elevated);
    border-radius: 99px; overflow: hidden;
  }
  .ss-topbar__fill {
    height: 100%; background: var(--verdant-700);
    border-radius: 99px; transition: width 300ms ease;
  }
  .ss-topbar__count {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
    white-space: nowrap;
  }

  /* Complete screen */
  .ss-complete {
    display: flex; flex-direction: column; gap: 1.25rem;
    animation: fadeIn 300ms ease;
  }
  .ss-complete__header { text-align: center; padding: 0.5rem 0; }
  .ss-complete__emoji { font-size: 2.5rem; display: block; margin-bottom: 8px; }
  .ss-complete__title { font-size: 22px; font-weight: 600; color: var(--text-primary); }
  .ss-complete__sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  .ss-complete__stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .ss-stat {
    display: flex; flex-direction: column; align-items: center;
    gap: 3px; padding: 16px 8px;
    border-right: 0.5px solid var(--border-subtle);
  }
  .ss-stat:last-child { border-right: none; }
  .ss-stat__val {
    font-family: var(--font-mono); font-size: 1.3rem; font-weight: 500;
    color: var(--text-primary); line-height: 1;
  }
  .ss-stat__val--primary { color: var(--verdant-400); }
  .ss-stat__label { font-size: 10px; color: var(--text-muted); }

  .ss-hard-list {
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .ss-hard-list__title {
    font-size: 11px; font-weight: 500; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.07em;
    padding: 10px 14px 8px;
    border-bottom: 0.5px solid var(--border-subtle);
  }
  .ss-hard-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 14px;
    border-bottom: 0.5px solid var(--border-subtle);
  }
  .ss-hard-item:last-child { border-bottom: none; }
  .ss-hard-item__front { font-size: 14px; color: var(--text-primary); }
  .ss-hard-item__back { font-size: 13px; color: var(--text-muted); }
  .ss-hard-more { font-size: 12px; color: var(--text-muted); text-align: center; padding: 8px; }

  .ss-complete__actions { display: flex; flex-direction: column; gap: 8px; }
`
