/* ──────────────────────────────────────────────────────────────
   Idiomatix — Utilities
   Helpers de fecha, cadenas, estadísticas y generación de ejercicios
────────────────────────────────────────────────────────────── */

// ─── Date helpers ──────────────────────────────────────────────

/** Hoy como string YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0] as string
}

/** Formatea timestamp a fecha legible en es-ES */
export function formatDate(ts: number, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

/** Formatea segundos a mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Formatea minutos a texto legible */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Diferencia en días entre dos timestamps */
export function daysDiff(a: number, b: number): number {
  return Math.round(Math.abs(a - b) / 86_400_000)
}

// ─── String helpers ────────────────────────────────────────────

/** Normaliza texto para comparación (sin acentos, minúsculas) */
export function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Compara dos strings con tolerancia (útil para corrección de ejercicios) */
export function isAnswerCorrect(input: string, expected: string, strict = false): boolean {
  if (strict) return input.trim() === expected.trim()
  return normalize(input) === normalize(expected)
}

/** Levenshtein distance — para hints de "casi correcto" */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
    }
  }
  return dp[m]![n]!
}

/** Determina si una respuesta es "casi correcta" (1-2 errores) */
export function isAlmostCorrect(input: string, expected: string): boolean {
  const dist = levenshtein(normalize(input), normalize(expected))
  return dist > 0 && dist <= Math.ceil(expected.length * 0.2)
}

/** Trunca string con ellipsis */
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}

/** Convierte camelCase a kebab-case */
export function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// ─── Array helpers ─────────────────────────────────────────────

/** Fisher-Yates shuffle — inmutable */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Toma N elementos aleatorios de un array */
export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length))
}

/** Agrupa un array por clave */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] = acc[k] ?? []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// ─── Stats helpers ─────────────────────────────────────────────

/** Calcula porcentaje de forma segura */
export function pct(value: number, total: number, decimals = 0): number {
  if (total === 0) return 0
  return parseFloat(((value / total) * 100).toFixed(decimals))
}

/** Calcula la racha actual desde un array de actividad diaria */
export function calculateStreak(
  activity: { date: string; cardsReviewed: number }[]
): number {
  if (!activity.length) return 0
  const todayStr = today()
  const sorted = [...activity].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  let expected = todayStr

  for (const day of sorted) {
    if (day.date > expected) continue   // future dates, skip
    if (day.date < expected) break       // gap found
    if (day.cardsReviewed > 0) {
      streak++
      const prev = new Date(expected)
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().split('T')[0] as string
    }
  }
  return streak
}

// ─── Exercise generators ───────────────────────────────────────

import type { VocabCard } from '@/types'

export interface FillBlankExercise {
  type: 'fill-blank'
  card: VocabCard
  prompt: string    // sentence with ___
  answer: string
  hint?: string
}

export interface MultipleChoiceExercise {
  type: 'multiple-choice'
  card: VocabCard
  prompt: string
  answer: string
  options: string[] // 4 options shuffled
}

export interface WordOrderExercise {
  type: 'word-order'
  card: VocabCard
  prompt: string    // translation shown
  words: string[]   // shuffled words of the sentence
  answer: string    // correct order joined
}

/** Genera ejercicio fill-in-the-blank desde una tarjeta con ejemplo */
export function generateFillBlank(card: VocabCard): FillBlankExercise | null {
  if (!card.example) return null
  const prompt = card.example.replace(
    new RegExp(card.front, 'gi'),
    '___'
  )
  if (!prompt.includes('___')) return null
  return {
    type: 'fill-blank',
    card,
    prompt,
    answer: card.front,
    hint: card.phonetic,
  }
}

/** Genera ejercicio multiple-choice usando otras tarjetas como distractores */
export function generateMultipleChoice(
  card: VocabCard,
  pool: VocabCard[]
): MultipleChoiceExercise {
  const distractors = pool
    .filter(c => c.id !== card.id && c.lang === card.lang)
    .map(c => c.back)
  const options = shuffle([
    card.back,
    ...sample(distractors, 3),
  ]).slice(0, 4)

  // ensure correct answer is included
  if (!options.includes(card.back)) {
    options[0] = card.back
  }

  return {
    type: 'multiple-choice',
    card,
    prompt: card.front,
    answer: card.back,
    options: shuffle(options),
  }
}

/** Genera ejercicio word-order desde el ejemplo de una tarjeta */
export function generateWordOrder(card: VocabCard): WordOrderExercise | null {
  const sentence = card.example
  if (!sentence || sentence.split(' ').length < 3) return null

  const words = sentence.split(' ')
  return {
    type: 'word-order',
    card,
    prompt: card.exampleTranslation ?? card.back,
    words: shuffle(words),
    answer: sentence,
  }
}

// ─── UUID polyfill ─────────────────────────────────────────────
// Usa crypto.randomUUID si está disponible, fallback manual

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // RFC 4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
