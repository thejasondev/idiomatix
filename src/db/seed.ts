/* ──────────────────────────────────────────────────────────────
   Idiomatix — DB Seed v2
   Carga todos los mazos integrados (A1 + B1) en IndexedDB.
   Idempotente: no duplica si ya existen.
────────────────────────────────────────────────────────────── */

import { db } from '@/db'
import { generateId } from '@/utils'
import type { Deck, VocabCard, CEFRLevel, LanguageCode, PartOfSpeech } from '@/types'

import ruA1 from '@/data/ru/a1-esencial.json'
import deA1 from '@/data/de/a1-esencial.json'
import enA1 from '@/data/en/a1-esencial.json'
import ruB1 from '@/data/ru/b1-intermedio.json'
import deB1 from '@/data/de/b1-intermedio.json'
import enB1 from '@/data/en/b1-intermedio.json'

interface RawCard {
  front: string; back: string; phonetic?: string; example?: string
  exampleTranslation?: string; partOfSpeech?: string
  gender?: 'M' | 'F' | 'N'; tags: string[]
}
interface RawDeckFile {
  version: '1.0'
  deck: { name: string; description?: string; lang: LanguageCode; level: CEFRLevel; source: 'builtin'; tags: string[] }
  cards: RawCard[]
}

const BUILTIN_DECKS: RawDeckFile[] = [
  ruA1 as RawDeckFile, deA1 as RawDeckFile, enA1 as RawDeckFile,
  ruB1 as RawDeckFile, deB1 as RawDeckFile, enB1 as RawDeckFile,
]

let seeded = false

export async function seedBuiltinDecks(): Promise<void> {
  if (seeded) return
  seeded = true
  try {
    for (const raw of BUILTIN_DECKS) {
      const existing = await db.decks
        .where('lang').equals(raw.deck.lang)
        .filter(d => d.name === raw.deck.name && d.source === 'builtin')
        .first()
      if (existing) continue

      const now = Date.now()
      const deckId = generateId()
      const deck: Deck = {
        id: deckId, name: raw.deck.name, description: raw.deck.description,
        lang: raw.deck.lang, level: raw.deck.level, source: 'builtin',
        cardCount: raw.cards.length, tags: raw.deck.tags, createdAt: now, updatedAt: now,
      }
      const cards: VocabCard[] = raw.cards.map(c => ({
        id: generateId(), deckId, lang: raw.deck.lang, level: raw.deck.level,
        front: c.front, back: c.back, phonetic: c.phonetic, example: c.example,
        exampleTranslation: c.exampleTranslation,
        partOfSpeech: c.partOfSpeech as PartOfSpeech | undefined,
        gender: c.gender, tags: c.tags ?? [], createdAt: now, updatedAt: now,
      }))
      await db.transaction('rw', db.decks, db.cards, async () => {
        await db.decks.add(deck)
        await db.cards.bulkAdd(cards)
      })
      console.info(`[Idiomatix] ✓ ${deck.name} (${cards.length} tarjetas)`)
    }
  } catch (err) {
    console.error('[Idiomatix] Seed error:', err)
  }
}
