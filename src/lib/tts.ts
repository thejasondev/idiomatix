/* ──────────────────────────────────────────────────────────────
   Idiomatix — Text-to-Speech (Web Speech API)
   Gratis, nativo, offline-capable (voces del sistema)
────────────────────────────────────────────────────────────── */

import type { LanguageCode } from '@/types'

// BCP-47 locales para cada idioma
const LANG_LOCALES: Record<LanguageCode, string[]> = {
  ru: ['ru-RU'],
  de: ['de-DE', 'de-AT', 'de-CH'],
  en: ['en-US', 'en-GB', 'en-AU'],
}

let cachedVoices: SpeechSynthesisVoice[] = []

function getVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length > 0) return cachedVoices
  cachedVoices = window.speechSynthesis.getVoices()
  return cachedVoices
}

function findBestVoice(lang: LanguageCode): SpeechSynthesisVoice | null {
  const voices = getVoices()
  const locales = LANG_LOCALES[lang]

  // Preferred: exact locale match
  for (const locale of locales) {
    const match = voices.find(v => v.lang === locale)
    if (match) return match
  }

  // Fallback: prefix match (e.g., 'ru' for any 'ru-*')
  const prefix = lang.toLowerCase()
  const fallback = voices.find(v => v.lang.toLowerCase().startsWith(prefix))
  return fallback ?? null
}

export interface SpeakOptions {
  rate?: number    // 0.1 – 10, default 0.9 (slightly slower for learning)
  pitch?: number   // 0 – 2, default 1
  volume?: number  // 0 – 1, default 1
}

export function speak(text: string, lang: LanguageCode, opts: SpeakOptions = {}): void {
  if (!('speechSynthesis' in window)) return

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_LOCALES[lang]?.[0] ?? lang
  utterance.rate = opts.rate ?? 0.9
  utterance.pitch = opts.pitch ?? 1
  utterance.volume = opts.volume ?? 1

  const voice = findBestVoice(lang)
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window
}

export function getAvailableVoices(lang: LanguageCode): SpeechSynthesisVoice[] {
  const voices = getVoices()
  const locales = LANG_LOCALES[lang]
  return voices.filter(v =>
    locales.some(locale => v.lang.startsWith(locale.split('-')[0] ?? ''))
  )
}

// Load voices asynchronously (Chrome loads them async)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}
