/* ──────────────────────────────────────────────────────────────
   Idiomatix — Speech Recognition (STT)
   Wrapper sobre Web Speech API SpeechRecognition
   Soporta RU / DE / EN con scoring de similitud fonética
────────────────────────────────────────────────────────────── */

import type { LanguageCode } from '@/types'
import { normalize, levenshtein } from '@/utils'

// Web Speech API Types
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

// BCP-47 locales por idioma (preferidos primero)
const LANG_LOCALES: Record<LanguageCode, string> = {
  ru: 'ru-RU',
  de: 'de-DE',
  en: 'en-US',
}

// ─── Types ─────────────────────────────────────────────────────

export type STTStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'error'
  | 'unsupported'

export interface STTResult {
  transcript: string        // Lo que el usuario dijo
  confidence: number        // 0–1 del motor de reconocimiento
  similarity: number        // 0–100 comparado con expected
  grade: 'perfect' | 'good' | 'acceptable' | 'wrong'
}

export interface STTOptions {
  lang: LanguageCode
  expected?: string         // Texto esperado para scoring
  maxDurationMs?: number    // Timeout (default 8000ms)
  continuous?: boolean
}

// ─── Availability ──────────────────────────────────────────────

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
}

// ─── Core recognition ──────────────────────────────────────────

export function createRecognition(lang: LanguageCode): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) return null

  const SpeechRec =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  const rec = new SpeechRec() as SpeechRecognition
  rec.lang = LANG_LOCALES[lang]
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.continuous = false
  return rec
}

// ─── Score transcript against expected ─────────────────────────

export function scoreTranscript(
  transcript: string,
  expected: string
): Omit<STTResult, 'confidence'> {
  const normTranscript = normalize(transcript)
  const normExpected   = normalize(expected)

  const maxLen   = Math.max(normExpected.length, 1)
  const distance = levenshtein(normTranscript, normExpected)
  const similarity = Math.max(0, Math.round((1 - distance / maxLen) * 100))

  const grade: STTResult['grade'] =
    similarity >= 90 ? 'perfect' :
    similarity >= 70 ? 'good' :
    similarity >= 50 ? 'acceptable' :
    'wrong'

  return { transcript, similarity, grade }
}

// ─── React-friendly hook factory ───────────────────────────────

type STTCallback = (result: STTResult | null, status: STTStatus, error?: string) => void

export function startRecognition(
  options: STTOptions,
  callback: STTCallback
): () => void {
  const rec = createRecognition(options.lang)

  if (!rec) {
    callback(null, 'unsupported', 'Web Speech API no disponible en este navegador.')
    return () => {}
  }

  const timeout = setTimeout(() => {
    rec.stop()
    callback(null, 'error', 'Tiempo de espera agotado. Intenta de nuevo.')
  }, options.maxDurationMs ?? 8000)

  callback(null, 'listening')

  rec.onresult = (event: SpeechRecognitionEvent) => {
    clearTimeout(timeout)
    callback(null, 'processing')

    // Take the first (best) alternative
    const result = event.results[0]
    if (!result) {
      callback(null, 'error', 'No se detectó voz.')
      return
    }

    const alt = result[0]
    if (!alt) {
      callback(null, 'error', 'No se detectó voz.')
      return
    }

    const transcript = alt.transcript.trim()
    const confidence = alt.confidence

    if (options.expected) {
      const scored = scoreTranscript(transcript, options.expected)
      callback({ ...scored, confidence }, 'success')
    } else {
      callback(
        { transcript, confidence, similarity: 100, grade: 'perfect' },
        'success'
      )
    }
  }

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    clearTimeout(timeout)
    const msgs: Record<string, string> = {
      'no-speech':         'No se detectó voz. ¿Hay ruido de fondo?',
      'audio-capture':     'No se pudo acceder al micrófono.',
      'not-allowed':       'Permiso de micrófono denegado.',
      'network':           'Error de red. Algunos motores STT requieren conexión.',
      'aborted':           'Reconocimiento cancelado.',
      'language-not-supported': 'Idioma no soportado por este dispositivo.',
    }
    callback(null, 'error', msgs[event.error] ?? `Error: ${event.error}`)
  }

  rec.onend = () => {
    clearTimeout(timeout)
  }

  try {
    rec.start()
  } catch (err) {
    clearTimeout(timeout)
    callback(null, 'error', 'No se pudo iniciar el micrófono.')
  }

  // Return cleanup function
  return () => {
    clearTimeout(timeout)
    try { rec.abort() } catch {}
  }
}
