/* ──────────────────────────────────────────────────────────────
   ExerciseSession — Sesión de ejercicios activos
   Genera una cola mixta adaptativa: MultipleChoice · FillBlank · WordOrder
   Se integra en PracticarClient como modo alternativo al flashcard puro.
────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircle, RotateCcw, Home, Zap } from 'lucide-react'
import { MultipleChoice, FillBlank, WordOrder } from '@/components/exercises'
import { Spinner, Button } from '@/components/ui'
import { useTimer } from '@/hooks'
import { db, recordDailyActivity } from '@/db'
import {
  generateMultipleChoice,
  generateFillBlank,
  generateWordOrder,
  shuffle,
  sample,
  type MultipleChoiceExercise,
  type FillBlankExercise,
  type WordOrderExercise,
} from '@/utils'
import { LANGUAGES, type LanguageCode, type VocabCard } from '@/types'

// ─── Types ────────────────────────────────────────────────────

type AnyExercise =
  | { kind: 'mc';   data: MultipleChoiceExercise }
  | { kind: 'fb';   data: FillBlankExercise }
  | { kind: 'wo';   data: WordOrderExercise }

type SessionPhase = 'loading' | 'exercising' | 'complete' | 'empty'

interface ResultEntry {
  cardId: string
  correct: boolean
  exerciseType: 'mc' | 'fb' | 'wo'
}

interface Props {
  deckId: string
  lang: LanguageCode
  onExit: () => void
}

// ─── Queue builder ────────────────────────────────────────────

function buildExerciseQueue(cards: VocabCard[], pool: VocabCard[]): AnyExercise[] {
  const exercises: AnyExercise[] = []

  for (const card of cards) {
    // Prioritize by what the card supports
    const fb = generateFillBlank(card)
    const wo = generateWordOrder(card)
    const mc = generateMultipleChoice(card, pool)

    // Always generate MC (works for any card)
    exercises.push({ kind: 'mc', data: mc })

    // Add FB only if the card has an example with the word in it
    if (fb) exercises.push({ kind: 'fb', data: fb })

    // Add WO only if the example has 3+ words
    if (wo) exercises.push({ kind: 'wo', data: wo })
  }

  // Shuffle and cap at a reasonable session size
  return shuffle(exercises).slice(0, Math.max(cards.length, 15))
}

// ─── Component ────────────────────────────────────────────────

export default function ExerciseSession({ deckId, lang, onExit }: Props) {
  const [phase, setPhase]     = useState<SessionPhase>('loading')
  const [queue, setQueue]     = useState<AnyExercise[]>([])
  const [index, setIndex]     = useState(0)
  const [results, setResults] = useState<ResultEntry[]>([])
  const { seconds, formatted: timeFormatted, reset: resetTimer } = useTimer(
    phase === 'exercising'
  )

  const langInfo = LANGUAGES[lang]

  // Build queue on mount
  useEffect(() => {
    async function load() {
      try {
        const [deckCards, allCards] = await Promise.all([
          db.cards.where('deckId').equals(deckId).toArray(),
          db.cards.where('lang').equals(lang).toArray(),
        ])

        if (deckCards.length === 0) { setPhase('empty'); return }

        // Use all lang cards as distractor pool for MC
        const pool = allCards.length > 4 ? allCards : deckCards
        const target = sample(deckCards, Math.min(deckCards.length, 20))
        const built  = buildExerciseQueue(target, pool)

        if (built.length === 0) { setPhase('empty'); return }

        setQueue(built)
        setPhase('exercising')
      } catch (err) {
        console.error('[ExerciseSession] load error:', err)
        setPhase('empty')
      }
    }
    load()
  }, [deckId, lang])

  const handleResult = useCallback(async (correct: boolean) => {
    const current = queue[index]
    if (!current) return

    const cardId = current.data.card.id
    const exerciseType = current.kind

    const newResults = [...results, { cardId, correct, exerciseType }]
    const next = index + 1

    if (next >= queue.length) {
      // Session done
      const minutesStudied = Math.ceil(seconds / 60)
      await recordDailyActivity(lang, queue.length, minutesStudied)

      await db.sessions.add({
        id: crypto.randomUUID(),
        lang,
        deckId,
        startedAt: Date.now() - seconds * 1000,
        endedAt: Date.now(),
        cardsReviewed: queue.length,
        cardsCorrect: newResults.filter(r => r.correct).length,
        newCardsIntroduced: 0,
        durationSeconds: seconds,
      })

      setResults(newResults)
      setPhase('complete')
    } else {
      setResults(newResults)
      setIndex(next)
    }
  }, [queue, index, results, lang, deckId, seconds])

  const handleRestart = useCallback(() => {
    setIndex(0)
    setResults([])
    resetTimer()
    setPhase('exercising')
  }, [resetTimer])

  // ── Loading ────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="es-center">
        <Spinner size={26} />
        <p className="es-hint">Preparando ejercicios…</p>
        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className="es-center">
        <Zap size={36} strokeWidth={1} style={{ color: 'var(--gold-400)' }} />
        <h3 className="es-empty-title">Sin ejercicios disponibles</h3>
        <p className="es-empty-sub">Añade ejemplos a tus tarjetas para activar todos los tipos de ejercicios.</p>
        <Button onClick={onExit}>Volver</Button>
        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────
  if (phase === 'complete') {
    const total   = results.length
    const correct = results.filter(r => r.correct).length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const byType = {
      mc: results.filter(r => r.exerciseType === 'mc'),
      fb: results.filter(r => r.exerciseType === 'fb'),
      wo: results.filter(r => r.exerciseType === 'wo'),
    }

    return (
      <div className="es-complete">
        <div className="es-complete__header">
          <span className="es-complete__emoji">
            {accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📚'}
          </span>
          <h2 className="es-complete__title">¡Ejercicios completados!</h2>
          <p className="es-complete__sub">{langInfo.name} · {timeFormatted}</p>
        </div>

        <div className="es-stats">
          <div className="es-stat">
            <span className="es-stat__val es-stat__val--accent">{total}</span>
            <span className="es-stat__label">ejercicios</span>
          </div>
          <div className="es-stat">
            <span className="es-stat__val" style={{ color: accuracy >= 70 ? 'var(--verdant-400)' : 'var(--crimson-400)' }}>
              {accuracy}%
            </span>
            <span className="es-stat__label">precisión</span>
          </div>
          <div className="es-stat">
            <span className="es-stat__val" style={{ color: 'var(--verdant-400)' }}>{correct}</span>
            <span className="es-stat__label">correctas</span>
          </div>
          <div className="es-stat">
            <span className="es-stat__val" style={{ color: 'var(--crimson-400)' }}>{total - correct}</span>
            <span className="es-stat__label">fallidas</span>
          </div>
        </div>

        {/* Breakdown by type */}
        <div className="es-breakdown">
          {byType.mc.length > 0 && (
            <div className="es-breakdown__row">
              <span className="es-breakdown__type">Opción múltiple</span>
              <span className="es-breakdown__count">{byType.mc.filter(r => r.correct).length}/{byType.mc.length}</span>
            </div>
          )}
          {byType.fb.length > 0 && (
            <div className="es-breakdown__row">
              <span className="es-breakdown__type">Completar frase</span>
              <span className="es-breakdown__count">{byType.fb.filter(r => r.correct).length}/{byType.fb.length}</span>
            </div>
          )}
          {byType.wo.length > 0 && (
            <div className="es-breakdown__row">
              <span className="es-breakdown__type">Ordenar palabras</span>
              <span className="es-breakdown__count">{byType.wo.filter(r => r.correct).length}/{byType.wo.length}</span>
            </div>
          )}
        </div>

        <div className="es-actions">
          <Button variant="ghost" onClick={handleRestart} fullWidth>
            <RotateCcw size={14} /> Repetir ejercicios
          </Button>
          <Button onClick={onExit} fullWidth>
            <Home size={14} /> Volver
          </Button>
        </div>

        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Exercising ─────────────────────────────────────────────
  const current = queue[index]
  if (!current) return null

  const pct = Math.round((index / queue.length) * 100)

  return (
    <div className="es-session">
      {/* Top bar */}
      <div className="es-topbar">
        <span className="es-topbar__timer">{timeFormatted}</span>
        <div className="es-topbar__track">
          <div className="es-topbar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="es-topbar__count">{index + 1}/{queue.length}</span>
      </div>

      {/* Exercise */}
      <div className="es-exercise-wrapper">
        {current.kind === 'mc' && (
          <MultipleChoice
            key={`mc-${index}`}
            exercise={current.data}
            onResult={handleResult}
          />
        )}
        {current.kind === 'fb' && (
          <FillBlank
            key={`fb-${index}`}
            exercise={current.data}
            onResult={handleResult}
          />
        )}
        {current.kind === 'wo' && (
          <WordOrder
            key={`wo-${index}`}
            exercise={current.data}
            onResult={handleResult}
          />
        )}
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
  .es-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px;
    min-height: 55vh; text-align: center; padding: 2rem;
  }
  .es-hint { font-size: 13px; color: var(--text-muted); }
  .es-empty-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
  .es-empty-sub { font-size: 13px; color: var(--text-muted); max-width: 260px; line-height: 1.6; }

  .es-session { display: flex; flex-direction: column; gap: 1.25rem; animation: esIn 250ms ease; }
  @keyframes esIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .es-topbar { display: flex; align-items: center; gap: 10px; }
  .es-topbar__timer { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); white-space: nowrap; }
  .es-topbar__track { flex: 1; height: 3px; background: var(--bg-elevated); border-radius: 99px; overflow: hidden; }
  .es-topbar__fill { height: 100%; background: var(--lucid-600); border-radius: 99px; transition: width 300ms ease; }
  .es-topbar__count { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); white-space: nowrap; }

  .es-exercise-wrapper { animation: esIn 200ms ease; }

  .es-complete { display: flex; flex-direction: column; gap: 1.25rem; animation: esIn 300ms ease; }
  .es-complete__header { text-align: center; padding: 0.5rem 0; }
  .es-complete__emoji { font-size: 2.5rem; display: block; margin-bottom: 8px; }
  .es-complete__title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
  .es-complete__sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  .es-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); overflow: hidden;
  }
  .es-stat {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 16px 8px; border-right: 0.5px solid var(--border-subtle);
  }
  .es-stat:last-child { border-right: none; }
  .es-stat__val { font-family: var(--font-mono); font-size: 1.25rem; font-weight: 500; color: var(--text-primary); line-height: 1; }
  .es-stat__val--accent { color: var(--lucid-400); }
  .es-stat__label { font-size: 10px; color: var(--text-muted); }

  .es-breakdown {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); overflow: hidden;
  }
  .es-breakdown__row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 0.5px solid var(--border-subtle);
    font-size: 13px;
  }
  .es-breakdown__row:last-child { border-bottom: none; }
  .es-breakdown__type { color: var(--text-secondary); }
  .es-breakdown__count { font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); }

  .es-actions { display: flex; flex-direction: column; gap: 8px; }
`
