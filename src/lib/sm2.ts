/* ──────────────────────────────────────────────────────────────
   SM-2 Algorithm — Spaced Repetition
   Based on SuperMemo 2 by Piotr Wozniak (1987)
   https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-and-speed-of-learning
────────────────────────────────────────────────────────────── */

import type { CardReview, ReviewRating } from '@/types'


const MIN_EASINESS = 1.3
const DEFAULT_EASINESS = 2.5
const DAY_MS = 86_400_000

export interface SM2Input {
  cardId: string
  deckId: string
  lang: CardReview['lang']
  current?: CardReview | null
  rating: ReviewRating
}

export interface SM2Output {
  review: CardReview
  nextReviewDate: Date
  intervalDays: number
}

/**
 * Calcula el próximo intervalo de revisión usando SM-2.
 *
 * Quality scale (rating):
 * 5 — respuesta perfecta, sin vacilación
 * 4 — respuesta correcta con ligera vacilación
 * 3 — respuesta correcta con esfuerzo notable
 * 2 — respuesta incorrecta, pero la respuesta correcta fue fácil al verla
 * 1 — respuesta incorrecta, respuesta correcta recordada
 * 0 — respuesta incorrecta, respuesta completamente olvidada
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { cardId, deckId, lang, current, rating } = input
  const now = Date.now()

  let ef = current?.easinessFactor ?? DEFAULT_EASINESS
  let interval = current?.interval ?? 0
  let repetitions = current?.repetitions ?? 0

  if (rating >= 3) {
    // Respuesta correcta
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ef)
    }
    repetitions += 1
  } else {
    // Respuesta incorrecta — reiniciar
    repetitions = 0
    interval = 1
  }

  // Actualizar Easiness Factor
  ef = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  ef = Math.max(MIN_EASINESS, ef)

  const nextReview = now + interval * DAY_MS
  const isLearning = interval < 1

  const review: CardReview = {
    id: current?.id ?? crypto.randomUUID(),
    cardId,
    deckId,
    lang,
    easinessFactor: parseFloat(ef.toFixed(3)),
    interval,
    repetitions,
    nextReview,
    lastReview: now,
    lastRating: rating,
    isLearning,
  }

  return {
    review,
    nextReviewDate: new Date(nextReview),
    intervalDays: interval,
  }
}

/**
 * Convierte el rating numérico SM-2 (0-5) a la
 * UI simplificada de 3 botones.
 */
export function uiRatingToSM2(ui: 'hard' | 'ok' | 'easy'): ReviewRating {
  const map: Record<string, ReviewRating> = {
    hard: 1,
    ok: 3,
    easy: 5,
  }
  return map[ui] ?? 3
}

/**
 * Texto descriptivo del próximo intervalo.
 */
export function formatInterval(days: number): string {
  if (days < 1) return 'en minutos'
  if (days === 1) return 'mañana'
  if (days < 7) return `en ${days} días`
  if (days < 30) {
    const weeks = Math.round(days / 7)
    return `en ${weeks} semana${weeks > 1 ? 's' : ''}`
  }
  const months = Math.round(days / 30)
  return `en ${months} mes${months > 1 ? 'es' : ''}`
}

/**
 * Calcula el porcentaje de retención estimado
 * basado en el factor de facilidad.
 */
export function estimatedRetention(ef: number): number {
  // Aproximación lineal entre EF mín (1.3) y máx (~3.0)
  const normalized = (ef - MIN_EASINESS) / (3.0 - MIN_EASINESS)
  return Math.round(Math.min(99, Math.max(50, 50 + normalized * 49)))
}
