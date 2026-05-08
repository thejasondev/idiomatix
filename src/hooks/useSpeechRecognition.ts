/* ──────────────────────────────────────────────────────────────
   useSpeechRecognition — React hook para STT
   Encapsula el ciclo de vida completo: listen → result → reset
────────────────────────────────────────────────────────────── */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  startRecognition,
  isSpeechRecognitionSupported,
  type STTStatus,
  type STTResult,
  type STTOptions,
} from '@/lib/stt'

export interface UseSpeechRecognitionReturn {
  status:    STTStatus
  result:    STTResult | null
  error:     string | null
  isSupported: boolean
  listen:    (options: STTOptions) => void
  stop:      () => void
  reset:     () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus]   = useState<STTStatus>('idle')
  const [result, setResult]   = useState<STTResult | null>(null)
  const [error,  setError]    = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const isSupported = isSpeechRecognitionSupported()

  const listen = useCallback((options: STTOptions) => {
    // Cancel any ongoing recognition
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    setResult(null)
    setError(null)
    setStatus('idle')

    const cleanup = startRecognition(options, (res, st, err) => {
      setStatus(st)
      if (res) setResult(res)
      if (err) setError(err)
    })

    cleanupRef.current = cleanup
  }, [])

  const stop = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    stop()
    setResult(null)
    setError(null)
    setStatus('idle')
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  return { status, result, error, isSupported, listen, stop, reset }
}
