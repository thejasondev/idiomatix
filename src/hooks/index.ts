/* ──────────────────────────────────────────────────────────────
   Idiomatix — Custom React Hooks
────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getDueCards, getNewCards } from '@/db'
import { calculateSM2, uiRatingToSM2 } from '@/lib/sm2'
import { useUIStore, useSettingsStore } from '@/stores'
import type { LanguageCode, VocabCard, CardReview, CEFRLevel } from '@/types'

// ─── useAppInit ───────────────────────────────────────────────
/** Inicializa la app: seed, theme, etc. Llamar una vez en el root. */
export function useAppInit() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Only load the heavy seed module if DB is empty
    db.decks.count().then(async (count) => {
      if (count === 0) {
        const { seedBuiltinDecks } = await import('@/db/seed')
        await seedBuiltinDecks()
      }
    }).finally(() => setReady(true))
  }, []) // eslint-disable-line

  return { ready }
}

// ─── useDecks ─────────────────────────────────────────────────
export function useDecks(lang?: LanguageCode) {
  return useLiveQuery(
    () =>
      lang
        ? db.decks.where('lang').equals(lang).toArray()
        : db.decks.toArray(),
    [lang]
  )
}

// ─── useDeck ──────────────────────────────────────────────────
export function useDeck(deckId: string) {
  return useLiveQuery(() => db.decks.get(deckId), [deckId])
}

// ─── useCards ─────────────────────────────────────────────────
export function useCards(deckId: string) {
  return useLiveQuery(
    () => db.cards.where('deckId').equals(deckId).toArray(),
    [deckId]
  )
}

// ─── useCardsByLang ───────────────────────────────────────────
export function useCardsByLang(lang: LanguageCode, level?: CEFRLevel) {
  return useLiveQuery(
    () => {
      const q = db.cards.where('lang').equals(lang)
      if (level) return q.filter(c => c.level === level).toArray()
      return q.toArray()
    },
    [lang, level]
  )
}

// ─── useStudyQueue ────────────────────────────────────────────
/** Construye la cola de estudio mezclando due + new cards */
export function useStudyQueue(deckId: string, lang: LanguageCode) {
  const [queue, setQueue] = useState<VocabCard[]>([])
  const [reviews, setReviews] = useState<Map<string, CardReview>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const { newCardsPerDay, reviewsPerDay } = useSettingsStore()

  useEffect(() => {
    async function build() {
      setIsLoading(true)
      try {
        const [dueReviews, newCards] = await Promise.all([
          getDueCards(lang, reviewsPerDay),
          getNewCards(deckId, newCardsPerDay),
        ])

        // Fetch card data for due reviews
        const dueCardIds = dueReviews.map(r => r.cardId)
        const dueCards = await db.cards.bulkGet(dueCardIds)
        const validDueCards = dueCards.filter((c): c is VocabCard => c !== undefined)

        // Build review map
        const reviewMap = new Map<string, CardReview>()
        dueReviews.forEach(r => reviewMap.set(r.cardId, r))

        // Shuffle and merge: due first, then new
        const shuffledDue = shuffle(validDueCards)
        const shuffledNew = shuffle(newCards)
        const combined = [...shuffledDue, ...shuffledNew]

        setQueue(combined)
        setReviews(reviewMap)
      } catch (err) {
        console.error('Error building study queue:', err)
      } finally {
        setIsLoading(false)
      }
    }
    build()
  }, [deckId, lang, newCardsPerDay, reviewsPerDay])

  const submitRating = useCallback(
    async (card: VocabCard, uiRating: 'hard' | 'ok' | 'easy') => {
      const rating = uiRatingToSM2(uiRating)
      const existing = reviews.get(card.id) ?? null
      const { review } = calculateSM2({
        cardId: card.id,
        deckId: card.deckId,
        lang: card.lang,
        current: existing,
        rating,
      })

      await db.reviews.put(review)
    },
    [reviews]
  )

  return { queue, reviews, isLoading, submitRating }
}

// ─── useTimer ─────────────────────────────────────────────────
/** Cronómetro para sesiones de estudio */
export function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  const reset = useCallback(() => setSeconds(0), [])

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return { seconds, formatted, reset }
}

// ─── useTheme ─────────────────────────────────────────────────
export function useTheme() {
  const { theme, setTheme } = useUIStore()

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}

// ─── useDeckStats ─────────────────────────────────────────────
export function useDeckStats(deckId: string) {
  return useLiveQuery(async () => {
    const total = await db.cards.where('deckId').equals(deckId).count()
    const allReviews = await db.reviews.where('deckId').equals(deckId).toArray()
    const now = Date.now()
    return {
      total,
      reviewed: allReviews.length,
      new: total - allReviews.length,
      due: allReviews.filter(r => r.nextReview <= now).length,
      learned: allReviews.filter(r => r.interval >= 21).length,
      learning: allReviews.filter(r => r.isLearning).length,
    }
  }, [deckId])
}

// ─── useImportDeck ────────────────────────────────────────────
export function useImportDeck() {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useUIStore()

  const importFile = useCallback(async (file: File, defaultLang?: LanguageCode) => {
    setImporting(true)
    setError(null)
    try {
      const { importDeck } = await import('@/lib/importer')
      const { result, deck, cards } = await importDeck(file, { defaultLang })

      if (!result.success || !deck || !cards) {
        const msg = result.errors[0] ?? 'Error desconocido al importar'
        setError(msg)
        showToast(msg, 'error')
        return false
      }

      await db.transaction('rw', db.decks, db.cards, async () => {
        await db.decks.add(deck)
        await db.cards.bulkAdd(cards)
      })

      showToast(`✓ ${result.cardsImported} tarjetas importadas en "${result.deckName}"`, 'success')
      return true
    } catch (err) {
      const msg = 'Error al importar el archivo'
      setError(msg)
      showToast(msg, 'error')
      return false
    } finally {
      setImporting(false)
    }
  }, [showToast])

  return { importFile, importing, error }
}

// ─── Helpers ──────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
