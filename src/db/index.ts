/* ──────────────────────────────────────────────────────────────
   Idiomatix — Database (Dexie / IndexedDB)
   Schema v1 · Todos los datos viven 100% en el cliente
────────────────────────────────────────────────────────────── */

import Dexie, { type Table } from 'dexie'
import type {
  VocabCard,
  Deck,
  CardReview,
  StudySession,
  DailyActivity,
  UserSettings,
} from '@/types'

class IdiomatixDB extends Dexie {
  // Tables
  decks!:          Table<Deck>
  cards!:          Table<VocabCard>
  reviews!:        Table<CardReview>
  sessions!:       Table<StudySession>
  dailyActivity!:  Table<DailyActivity>
  settings!:       Table<UserSettings & { id: number }>

  constructor() {
    super('IdiomatixDB')

    this.version(1).stores({
      // Decks: buscar por lang, level, source
      decks: 'id, lang, level, source, createdAt',

      // Cards: buscar por deck, lang, level, tags
      cards: 'id, deckId, lang, level, createdAt, *tags',

      // Reviews: buscar por card, próxima revisión, idioma
      reviews: 'id, cardId, deckId, lang, nextReview, lastReview, isLearning',

      // Sessions: historial de sesiones
      sessions: 'id, lang, deckId, startedAt, endedAt',

      // Actividad diaria para heatmap y racha
      dailyActivity: 'date, *langs',

      // Settings: singleton (id siempre = 1)
      settings: 'id',
    })
  }
}

export const db = new IdiomatixDB()

// ─── Helper queries ────────────────────────────────────────────

/** Cards pendientes de revisión hoy para un idioma */
export async function getDueCards(lang?: string, limit = 50): Promise<CardReview[]> {
  const now = Date.now()
  let query = db.reviews.where('nextReview').belowOrEqual(now)
  if (lang) {
    return await query.filter(r => r.lang === lang).limit(limit).toArray()
  }
  return await query.limit(limit).toArray()
}

/** Cards nuevas (nunca revisadas) de un deck */
export async function getNewCards(deckId: string, limit = 20): Promise<VocabCard[]> {
  const allCards = await db.cards.where('deckId').equals(deckId).toArray()
  const reviewedIds = new Set(
    (await db.reviews.where('deckId').equals(deckId).toArray()).map(r => r.cardId)
  )
  return allCards.filter(c => !reviewedIds.has(c.id)).slice(0, limit)
}

/** Contar cards por estado en un deck */
export async function getDeckStats(deckId: string) {
  const total = await db.cards.where('deckId').equals(deckId).count()
  const reviews = await db.reviews.where('deckId').equals(deckId).toArray()
  const now = Date.now()

  return {
    total,
    learned: reviews.filter(r => r.interval >= 21).length,
    due: reviews.filter(r => r.nextReview <= now).length,
    learning: reviews.filter(r => r.isLearning).length,
    new: total - reviews.length,
  }
}

/** Upsert settings (singleton) */
export async function getOrCreateSettings(): Promise<UserSettings> {
  const existing = await db.settings.get(1)
  if (existing) {
    const { id: _id, ...settings } = existing
    return settings as UserSettings
  }
  const { DEFAULT_SETTINGS } = await import('@/types')
  await db.settings.put({ id: 1, ...DEFAULT_SETTINGS })
  return DEFAULT_SETTINGS
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ id: 1, ...settings })
}

/** Registrar o actualizar actividad diaria */
export async function recordDailyActivity(
  lang: string,
  cardsReviewed: number,
  minutesStudied: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0] as string
  const existing = await db.dailyActivity.get(today)
  if (existing) {
    await db.dailyActivity.update(today, {
      cardsReviewed: existing.cardsReviewed + cardsReviewed,
      minutesStudied: existing.minutesStudied + minutesStudied,
      langs: Array.from(new Set([...existing.langs, lang])) as typeof existing.langs,
    })
  } else {
    await db.dailyActivity.put({
      date: today,
      cardsReviewed,
      minutesStudied,
      langs: [lang as 'ru' | 'de' | 'en'],
    })
  }
}

/** Últimos N días de actividad para el heatmap */
export async function getActivityHistory(days = 90): Promise<DailyActivity[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0] as string
  return await db.dailyActivity
    .where('date')
    .aboveOrEqual(cutoffStr)
    .sortBy('date')
}
