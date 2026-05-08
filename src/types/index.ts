/* ──────────────────────────────────────────────────────────────
   Idiomatix — Core Domain Types
   Fuente de verdad para todos los modelos de datos
────────────────────────────────────────────────────────────── */

// ─── Language ─────────────────────────────────────────────────

export type LanguageCode = 'ru' | 'de' | 'en'

export interface Language {
  code: LanguageCode
  name: string
  nativeName: string
  flag: string
  script: 'cyrillic' | 'latin'
  colorToken: string
}

export const LANGUAGES: Record<LanguageCode, Language> = {
  ru: { code: 'ru', name: 'Ruso',   nativeName: 'Русский',  flag: '🇷🇺', script: 'cyrillic', colorToken: 'ember'  },
  de: { code: 'de', name: 'Alemán', nativeName: 'Deutsch',  flag: '🇩🇪', script: 'latin',    colorToken: 'gold'   },
  en: { code: 'en', name: 'Inglés', nativeName: 'English',  flag: '🇬🇧', script: 'latin',    colorToken: 'lucid'  },
}

// ─── CEFR Levels ───────────────────────────────────────────────

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: 'Principiante',
  A2: 'Elemental',
  B1: 'Intermedio',
  B2: 'Intermedio Alto',
  C1: 'Avanzado',
  C2: 'Maestría',
}

// ─── Vocabulary Card ───────────────────────────────────────────

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'numeral'
  | 'phrase'

export interface VocabCard {
  id: string                    // UUID
  deckId: string                // parent deck
  lang: LanguageCode
  level: CEFRLevel
  front: string                 // word in target language
  back: string                  // translation (es)
  phonetic?: string             // /transcripción/
  example?: string              // example sentence
  exampleTranslation?: string   // translated example
  partOfSpeech?: PartOfSpeech
  tags: string[]
  gender?: 'M' | 'F' | 'N'    // for gendered languages
  createdAt: number             // timestamp
  updatedAt: number
}

// ─── Deck ─────────────────────────────────────────────────────

export type DeckSource = 'builtin' | 'imported' | 'custom'

export interface Deck {
  id: string
  name: string
  description?: string
  lang: LanguageCode
  level: CEFRLevel
  source: DeckSource
  cardCount: number
  tags: string[]
  order?: number
  createdAt: number
  updatedAt: number
}

// ─── SM-2 Review Data ──────────────────────────────────────────

export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5
// 0-1: fail, 2: hard, 3: ok, 4: easy, 5: perfect

export interface CardReview {
  id: string
  cardId: string
  deckId: string
  lang: LanguageCode
  /** Easiness Factor — starts at 2.5, min 1.3 */
  easinessFactor: number
  /** Interval in days until next review */
  interval: number
  /** Number of successful repetitions */
  repetitions: number
  /** Unix timestamp of next scheduled review */
  nextReview: number
  /** Unix timestamp of last review */
  lastReview: number | null
  /** Rating given on last review (SM-2 quality) */
  lastRating: ReviewRating | null
  /** Is the card currently being learned (interval < 1 day) */
  isLearning: boolean
}

// ─── Study Session ─────────────────────────────────────────────

export interface StudySession {
  id: string
  lang: LanguageCode
  deckId: string
  startedAt: number
  endedAt: number | null
  cardsReviewed: number
  cardsCorrect: number
  newCardsIntroduced: number
  durationSeconds: number
}

// ─── User Progress ────────────────────────────────────────────

export interface DailyActivity {
  date: string              // YYYY-MM-DD
  cardsReviewed: number
  minutesStudied: number
  langs: LanguageCode[]
}

export interface UserStats {
  totalCardsLearned: number
  totalCardsReviewed: number
  totalMinutesStudied: number
  currentStreak: number
  longestStreak: number
  lastStudiedAt: number | null
  byLang: Record<LanguageCode, {
    cardsLearned: number
    cardsReviewed: number
    minutesStudied: number
  }>
}

// ─── Settings ─────────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system'

export interface UserSettings {
  theme: Theme
  defaultLang: LanguageCode | null
  newCardsPerDay: number        // default: 20
  reviewsPerDay: number         // default: 100
  autoPlayAudio: boolean        // TTS on card flip
  showPhonetic: boolean
  activeLanguages: LanguageCode[]
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultLang: null,
  newCardsPerDay: 20,
  reviewsPerDay: 100,
  autoPlayAudio: false,
  showPhonetic: true,
  activeLanguages: ['ru', 'de', 'en'],
}

// ─── Import formats ───────────────────────────────────────────

export type ImportFormat = 'idiomatix-json' | 'csv' | 'tsv' | 'anki-apkg'

export interface ImportResult {
  success: boolean
  cardsImported: number
  deckName: string
  errors: string[]
}

// ─── Exercise types ───────────────────────────────────────────

export type ExerciseType =
  | 'flashcard'
  | 'fill-blank'
  | 'word-order'
  | 'matching'
  | 'translation'
  | 'multiple-choice'

export interface Exercise {
  type: ExerciseType
  cardId: string
  prompt: string
  answer: string
  options?: string[]       // for multiple-choice / matching
  lang: LanguageCode
}
