/* ──────────────────────────────────────────────────────────────
   Idiomatix — Zustand Stores
   Estado global de UI y sesión de estudio
────────────────────────────────────────────────────────────── */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LanguageCode, CEFRLevel, Theme } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

// ─── UI Store ─────────────────────────────────────────────────

interface UIState {
  theme: Theme
  activeNav: string
  isLoading: boolean
  toast: { message: string; type: 'success' | 'error' | 'info' } | null

  setTheme: (theme: Theme) => void
  setActiveNav: (path: string) => void
  setLoading: (v: boolean) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeNav: '/',
      isLoading: false,
      toast: null,

      setTheme: (theme) => {
        set({ theme })
        // Apply to DOM immediately
        if (typeof document !== 'undefined') {
          const resolved = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme
          document.documentElement.setAttribute('data-theme', resolved)
        }
      },

      setActiveNav: (path) => set({ activeNav: path }),
      setLoading: (v) => set({ isLoading: v }),

      showToast: (message, type = 'info') => {
        set({ toast: { message, type } })
        setTimeout(() => set({ toast: null }), 3500)
      },

      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'idiomatix-ui',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

// ─── Settings Store ────────────────────────────────────────────

interface SettingsState {
  newCardsPerDay: number
  reviewsPerDay: number
  autoPlayAudio: boolean
  showPhonetic: boolean
  activeLanguages: LanguageCode[]
  defaultLang: LanguageCode | null

  setNewCardsPerDay: (n: number) => void
  setReviewsPerDay: (n: number) => void
  setAutoPlayAudio: (v: boolean) => void
  setShowPhonetic: (v: boolean) => void
  toggleLanguage: (lang: LanguageCode) => void
  setDefaultLang: (lang: LanguageCode | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      newCardsPerDay: DEFAULT_SETTINGS.newCardsPerDay,
      reviewsPerDay: DEFAULT_SETTINGS.reviewsPerDay,
      autoPlayAudio: DEFAULT_SETTINGS.autoPlayAudio,
      showPhonetic: DEFAULT_SETTINGS.showPhonetic,
      activeLanguages: DEFAULT_SETTINGS.activeLanguages,
      defaultLang: DEFAULT_SETTINGS.defaultLang,

      setNewCardsPerDay: (n) => set({ newCardsPerDay: n }),
      setReviewsPerDay: (n) => set({ reviewsPerDay: n }),
      setAutoPlayAudio: (v) => set({ autoPlayAudio: v }),
      setShowPhonetic: (v) => set({ showPhonetic: v }),

      toggleLanguage: (lang) =>
        set((state) => ({
          activeLanguages: state.activeLanguages.includes(lang)
            ? state.activeLanguages.filter((l) => l !== lang)
            : [...state.activeLanguages, lang],
        })),

      setDefaultLang: (lang) => set({ defaultLang: lang }),
    }),
    { name: 'idiomatix-settings' }
  )
)

// ─── Study Session Store ───────────────────────────────────────

interface SessionCard {
  cardId: string
  deckId: string
  lang: LanguageCode
}

interface StudySessionState {
  isActive: boolean
  currentCardIndex: number
  queue: SessionCard[]
  sessionLang: LanguageCode | null
  sessionDeckId: string | null
  startTime: number | null
  results: Array<{ cardId: string; rating: 'hard' | 'ok' | 'easy' }>
  isFlipped: boolean

  startSession: (lang: LanguageCode, deckId: string, queue: SessionCard[]) => void
  flipCard: () => void
  rateCard: (rating: 'hard' | 'ok' | 'easy') => void
  endSession: () => void
  resetSession: () => void
}

export const useStudyStore = create<StudySessionState>()((set, get) => ({
  isActive: false,
  currentCardIndex: 0,
  queue: [],
  sessionLang: null,
  sessionDeckId: null,
  startTime: null,
  results: [],
  isFlipped: false,

  startSession: (lang, deckId, queue) =>
    set({
      isActive: true,
      currentCardIndex: 0,
      queue,
      sessionLang: lang,
      sessionDeckId: deckId,
      startTime: Date.now(),
      results: [],
      isFlipped: false,
    }),

  flipCard: () => set({ isFlipped: true }),

  rateCard: (rating) => {
    const state = get()
    const currentCard = state.queue[state.currentCardIndex]
    if (!currentCard) return

    const newResults = [...state.results, { cardId: currentCard.cardId, rating }]
    const nextIndex = state.currentCardIndex + 1

    set({
      results: newResults,
      currentCardIndex: nextIndex,
      isFlipped: false,
    })

    if (nextIndex >= state.queue.length) {
      set({ isActive: false })
    }
  },

  endSession: () => set({ isActive: false }),

  resetSession: () =>
    set({
      isActive: false,
      currentCardIndex: 0,
      queue: [],
      sessionLang: null,
      sessionDeckId: null,
      startTime: null,
      results: [],
      isFlipped: false,
    }),
}))

// ─── Filter/Navigation Store ───────────────────────────────────

interface FilterState {
  selectedLang: LanguageCode | 'all'
  selectedLevel: CEFRLevel | 'all'

  setLang: (lang: LanguageCode | 'all') => void
  setLevel: (level: CEFRLevel | 'all') => void
  reset: () => void
}

export const useFilterStore = create<FilterState>()((set) => ({
  selectedLang: 'all',
  selectedLevel: 'all',

  setLang: (lang) => set({ selectedLang: lang }),
  setLevel: (level) => set({ selectedLevel: level }),
  reset: () => set({ selectedLang: 'all', selectedLevel: 'all' }),
}))
