/* ──────────────────────────────────────────────────────────────
   Exercises — Componentes de ejercicios activos
   MultipleChoice · FillBlank · WordOrder
   Con teclado virtual integrado, feedback visual y puntuación
────────────────────────────────────────────────────────────── */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Check, X, CornerDownLeft, Volume2 } from 'lucide-react'
import VirtualKeyboard from '@/components/ui/VirtualKeyboard'
import { Badge } from '@/components/ui'
import { isAnswerCorrect, isAlmostCorrect } from '@/utils'
import { speak, isTTSSupported } from '@/lib/tts'
import type {
  MultipleChoiceExercise,
  FillBlankExercise,
  WordOrderExercise,
} from '@/utils'
import type { LanguageCode } from '@/types'
import { LANGUAGES } from '@/types'

// ─── Shared types ──────────────────────────────────────────────

type AnswerState = 'idle' | 'correct' | 'almost' | 'wrong'

interface ExerciseFeedback {
  state: AnswerState
  message: string
}

// ─── MultipleChoice ───────────────────────────────────────────

interface MCProps {
  exercise: MultipleChoiceExercise
  onResult: (correct: boolean) => void
}

export function MultipleChoice({ exercise, onResult }: MCProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null)
  const answered = selected !== null

  const handleSelect = useCallback((option: string) => {
    if (answered) return
    setSelected(option)
    const correct = isAnswerCorrect(option, exercise.answer)
    setFeedback({
      state: correct ? 'correct' : 'wrong',
      message: correct ? '¡Correcto!' : `La respuesta era: ${exercise.answer}`,
    })
    setTimeout(() => onResult(correct), 1000)
  }, [answered, exercise.answer, onResult])

  const tts = isTTSSupported()

  return (
    <div className="ex-wrapper">
      <div className="ex-header">
        <Badge variant={exercise.card.lang}>{LANGUAGES[exercise.card.lang].name}</Badge>
        <span className="ex-type-label">opción múltiple</span>
      </div>

      <div className="ex-prompt-card">
        <p className="ex-prompt-word">{exercise.prompt}</p>
        {exercise.card.phonetic && (
          <p className="ex-prompt-phonetic">{exercise.card.phonetic}</p>
        )}
        {tts && (
          <button
            className="ex-speak-btn"
            onClick={() => speak(exercise.card.front, exercise.card.lang)}
            type="button"
            aria-label="Escuchar"
          >
            <Volume2 size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <p className="ex-question">¿Cuál es la traducción?</p>

      <div className="mc-options">
        {exercise.options.map((option) => {
          const isSelected = selected === option
          const isCorrect  = option === exercise.answer
          let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle'
          if (answered) {
            if (isCorrect) state = 'correct'
            else if (isSelected) state = 'wrong'
          } else if (isSelected) state = 'selected'

          return (
            <button
              key={option}
              className={`mc-option mc-option--${state}`}
              onClick={() => handleSelect(option)}
              type="button"
              disabled={answered}
            >
              <span>{option}</span>
              {answered && isCorrect && <Check size={15} strokeWidth={2.5} />}
              {answered && isSelected && !isCorrect && <X size={15} strokeWidth={2.5} />}
            </button>
          )
        })}
      </div>

      {feedback && <FeedbackBanner state={feedback.state} message={feedback.message} />}

      <style>{EX_STYLES}</style>
    </div>
  )
}

// ─── FillBlank ────────────────────────────────────────────────

interface FBProps {
  exercise: FillBlankExercise
  onResult: (correct: boolean) => void
}

export function FillBlank({ exercise, onResult }: FBProps) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const answered = feedback !== null
  const lang = exercise.card.lang

  useEffect(() => {
    // Auto-show keyboard for non-Latin scripts
    if (lang === 'ru') setShowKeyboard(true)
    inputRef.current?.focus()
  }, [lang])

  const handleSubmit = useCallback(() => {
    if (!value.trim() || answered) return
    const correct = isAnswerCorrect(value, exercise.answer)
    const almost  = !correct && isAlmostCorrect(value, exercise.answer)
    const state: AnswerState = correct ? 'correct' : almost ? 'almost' : 'wrong'
    const msgs = {
      correct: '¡Perfecto!',
      almost:  `Casi... La respuesta correcta es: ${exercise.answer}`,
      wrong:   `Incorrecto. La respuesta es: ${exercise.answer}`,
    }
    setFeedback({ state, message: msgs[state] })
    setTimeout(() => onResult(correct || almost), 1200)
  }, [value, exercise.answer, answered, onResult])

  const handleVirtualKey = useCallback((char: string) => {
    setValue(v => v + char)
    inputRef.current?.focus()
  }, [])

  const handleBackspace = useCallback(() => {
    setValue(v => v.slice(0, -1))
    inputRef.current?.focus()
  }, [])

  const handleSpace = useCallback(() => {
    setValue(v => v + ' ')
    inputRef.current?.focus()
  }, [])

  const tts = isTTSSupported()

  // Highlight the blank in the prompt
  const parts = exercise.prompt.split('___')

  return (
    <div className="ex-wrapper">
      <div className="ex-header">
        <Badge variant={lang}>{LANGUAGES[lang].name}</Badge>
        <span className="ex-type-label">completar frase</span>
      </div>

      <div className="fb-prompt">
        {parts[0]}
        <span className="fb-blank">
          {answered ? exercise.answer : value || '\u00A0\u00A0\u00A0\u00A0\u00A0'}
        </span>
        {parts[1]}
      </div>

      {exercise.card.exampleTranslation && (
        <p className="fb-translation-hint">{exercise.card.exampleTranslation}</p>
      )}

      {!answered && (
        <>
          <div className="fb-input-row">
            <input
              ref={inputRef}
              className="fb-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder={`Escribe en ${LANGUAGES[lang].name}…`}
              disabled={answered}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Tu respuesta"
            />
            <button
              className="fb-submit"
              onClick={handleSubmit}
              disabled={!value.trim() || answered}
              type="button"
              aria-label="Confirmar"
            >
              <CornerDownLeft size={16} strokeWidth={2} />
            </button>
          </div>

          {exercise.hint && (
            <p className="fb-hint">
              💡 Pista fonética: <span>{exercise.hint}</span>
            </p>
          )}

          {(lang === 'ru' || lang === 'de') && (
            <div className="fb-keyboard-toggle">
              <button
                className="fb-keyboard-btn"
                onClick={() => setShowKeyboard(v => !v)}
                type="button"
              >
                {showKeyboard ? 'Ocultar teclado' : 'Mostrar teclado virtual'}
              </button>
            </div>
          )}

          {(lang === 'ru' || lang === 'de') && (
            <VirtualKeyboard
              lang={lang}
              onKey={handleVirtualKey}
              onBackspace={handleBackspace}
              onSpace={handleSpace}
              visible={showKeyboard}
              onToggle={() => setShowKeyboard(v => !v)}
            />
          )}
        </>
      )}

      {feedback && <FeedbackBanner state={feedback.state} message={feedback.message} />}

      <style>{EX_STYLES}</style>
    </div>
  )
}

// ─── WordOrder ────────────────────────────────────────────────

interface WOProps {
  exercise: WordOrderExercise
  onResult: (correct: boolean) => void
}

export function WordOrder({ exercise, onResult }: WOProps) {
  const [placed, setPlaced] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>(exercise.words)
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null)
  const answered = feedback !== null

  const handlePlace = useCallback((word: string, idx: number) => {
    if (answered) return
    setRemaining(r => r.filter((_, i) => i !== idx))
    setPlaced(p => [...p, word])
  }, [answered])

  const handleRemove = useCallback((word: string, idx: number) => {
    if (answered) return
    setPlaced(p => p.filter((_, i) => i !== idx))
    setRemaining(r => [...r, word])
  }, [answered])

  const handleCheck = useCallback(() => {
    const input = placed.join(' ')
    const correct = isAnswerCorrect(input, exercise.answer)
    const almost  = !correct && isAlmostCorrect(input, exercise.answer)
    const state: AnswerState = correct ? 'correct' : almost ? 'almost' : 'wrong'
    const msgs = {
      correct: '¡Orden correcto!',
      almost:  `Casi bien. La frase correcta: "${exercise.answer}"`,
      wrong:   `Incorrecto. La frase es: "${exercise.answer}"`,
    }
    setFeedback({ state, message: msgs[state] })
    setTimeout(() => onResult(correct || almost), 1400)
  }, [placed, exercise.answer, onResult])

  return (
    <div className="ex-wrapper">
      <div className="ex-header">
        <Badge variant={exercise.card.lang}>{LANGUAGES[exercise.card.lang].name}</Badge>
        <span className="ex-type-label">ordenar palabras</span>
      </div>

      <p className="ex-question">Traduce esta frase:</p>
      <div className="ex-prompt-card">
        <p className="ex-prompt-word" style={{ fontSize: '1rem' }}>{exercise.prompt}</p>
      </div>

      {/* Drop zone — placed words */}
      <div className={`wo-zone ${placed.length === 0 ? 'wo-zone--empty' : ''}`}>
        {placed.length === 0 && (
          <span className="wo-zone__placeholder">Toca las palabras para ordenarlas</span>
        )}
        {placed.map((word, i) => (
          <button
            key={`placed-${i}`}
            className="wo-word wo-word--placed"
            onClick={() => handleRemove(word, i)}
            type="button"
            disabled={answered}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="wo-bank">
        {remaining.map((word, i) => (
          <button
            key={`rem-${i}`}
            className="wo-word wo-word--available"
            onClick={() => handlePlace(word, i)}
            type="button"
            disabled={answered}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Check button */}
      {!answered && placed.length > 0 && (
        <button className="wo-check" onClick={handleCheck} type="button">
          <Check size={15} strokeWidth={2.5} /> Comprobar
        </button>
      )}

      {feedback && <FeedbackBanner state={feedback.state} message={feedback.message} />}

      <style>{EX_STYLES}</style>
    </div>
  )
}

// ─── FeedbackBanner ───────────────────────────────────────────

function FeedbackBanner({ state, message }: { state: AnswerState; message: string }) {
  const config = {
    correct: { bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.25)', color: 'var(--verdant-400)', icon: '✓' },
    almost:  { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', color: 'var(--gold-400)',    icon: '~' },
    wrong:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--crimson-400)', icon: '✕' },
    idle:    { bg: 'transparent', border: 'transparent', color: 'transparent', icon: '' },
  }
  const c = config[state]
  return (
    <div className="ex-feedback" style={{ background: c.bg, borderColor: c.border }}>
      <span className="ex-feedback__icon" style={{ color: c.color }}>{c.icon}</span>
      <span className="ex-feedback__msg">{message}</span>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────

const EX_STYLES = `
  .ex-wrapper { display: flex; flex-direction: column; gap: 1rem; animation: exIn 200ms ease; }
  @keyframes exIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }

  .ex-header { display: flex; align-items: center; gap: 8px; }
  .ex-type-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

  .ex-prompt-card {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); padding: 1.25rem;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    text-align: center; position: relative;
  }
  .ex-prompt-word { font-family: var(--font-display); font-size: 1.75rem; color: var(--text-primary); line-height: 1.1; }
  .ex-prompt-phonetic { font-family: var(--font-mono); font-size: 12px; color: var(--verdant-400); }
  .ex-speak-btn {
    position: absolute; top: 10px; right: 10px;
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px;
    border: 0.5px solid var(--border-default); background: transparent;
    color: var(--text-muted); cursor: pointer; transition: color 150ms, background 150ms;
  }
  .ex-speak-btn:hover { color: var(--verdant-400); background: var(--bg-elevated); }

  .ex-question { font-size: 13px; color: var(--text-muted); }

  /* Multiple choice */
  .mc-options { display: flex; flex-direction: column; gap: 8px; }
  .mc-option {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-body); font-size: 14px; color: var(--text-primary);
    text-align: left; cursor: pointer; width: 100%;
    transition: border-color 150ms, background 150ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .mc-option:hover:not(:disabled):not(.mc-option--correct):not(.mc-option--wrong) {
    border-color: var(--border-strong); background: var(--bg-elevated);
  }
  .mc-option:active:not(:disabled) { transform: scale(0.99); }
  .mc-option:disabled { cursor: default; }
  .mc-option--selected { border-color: var(--verdant-600); background: rgba(13,148,136,0.06); }
  .mc-option--correct { border-color: var(--verdant-500) !important; background: rgba(45,212,191,0.08) !important; color: var(--verdant-400); }
  .mc-option--wrong   { border-color: var(--crimson-500) !important; background: rgba(248,113,113,0.08) !important; color: var(--crimson-400); }

  /* Fill blank */
  .fb-prompt {
    font-size: 1.1rem; color: var(--text-primary); line-height: 1.7;
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem;
  }
  .fb-blank {
    display: inline-block; min-width: 60px;
    border-bottom: 2px solid var(--verdant-600);
    color: var(--verdant-400); font-weight: 600; padding: 0 4px;
    margin: 0 4px;
  }
  .fb-translation-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }

  .fb-input-row { display: flex; gap: 8px; }
  .fb-input {
    flex: 1; padding: 10px 14px;
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary); font-family: var(--font-body); font-size: 15px;
    outline: none; transition: border-color 150ms;
  }
  .fb-input:focus { border-color: var(--border-focus); }
  .fb-input::placeholder { color: var(--text-muted); }
  .fb-input--correct { border-color: var(--verdant-500) !important; }
  .fb-input--wrong   { border-color: var(--crimson-500) !important; }
  .fb-input--almost  { border-color: var(--gold-500) !important; }

  .fb-submit {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; flex-shrink: 0;
    background: var(--verdant-600); color: white;
    border: none; border-radius: var(--radius-md); cursor: pointer;
    transition: background 150ms, opacity 150ms;
  }
  .fb-submit:disabled { background: var(--bg-elevated); color: var(--text-muted); cursor: not-allowed; }
  .fb-submit:hover:not(:disabled) { background: var(--verdant-500); }

  .fb-hint { font-size: 12px; color: var(--text-muted); }
  .fb-hint span { color: var(--verdant-400); font-family: var(--font-mono); }

  .fb-keyboard-toggle { display: flex; justify-content: center; }
  .fb-keyboard-btn {
    font-size: 12px; color: var(--text-muted);
    background: none; border: none; cursor: pointer;
    padding: 4px 8px; border-radius: var(--radius-sm);
    transition: color 150ms, background 150ms;
  }
  .fb-keyboard-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }

  /* Word order */
  .wo-zone {
    min-height: 56px; padding: 10px 12px;
    background: var(--bg-card); border: 1.5px dashed var(--border-default);
    border-radius: var(--radius-md);
    display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start;
    transition: border-color 200ms;
  }
  .wo-zone--empty { align-items: center; justify-content: center; }
  .wo-zone:has(.wo-word) { border-color: var(--verdant-700); }
  .wo-zone__placeholder { font-size: 12px; color: var(--text-muted); }

  .wo-bank { display: flex; flex-wrap: wrap; gap: 6px; min-height: 40px; }

  .wo-word {
    padding: 6px 12px; border-radius: var(--radius-md);
    font-family: var(--font-body); font-size: 14px;
    cursor: pointer; transition: transform 100ms, background 150ms;
    border: 0.5px solid;
    -webkit-tap-highlight-color: transparent;
  }
  .wo-word:active:not(:disabled) { transform: scale(0.94); }
  .wo-word:disabled { opacity: 0.6; cursor: default; }

  .wo-word--available {
    background: var(--bg-card); border-color: var(--border-default);
    color: var(--text-primary);
  }
  .wo-word--available:hover:not(:disabled) { background: var(--bg-elevated); border-color: var(--border-strong); }

  .wo-word--placed {
    background: rgba(13,148,136,0.08); border-color: var(--verdant-700);
    color: var(--verdant-400);
  }
  .wo-word--placed:hover:not(:disabled) { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.3); color: var(--crimson-400); }

  .wo-check {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 20px; width: 100%;
    background: var(--verdant-600); color: white;
    border: none; border-radius: var(--radius-md);
    font-family: var(--font-body); font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background 150ms;
  }
  .wo-check:hover { background: var(--verdant-500); }

  /* Feedback banner */
  .ex-feedback {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: var(--radius-md);
    border: 0.5px solid; animation: exIn 200ms ease;
  }
  .ex-feedback__icon { font-size: 14px; font-weight: 700; flex-shrink: 0; }
  .ex-feedback__msg { font-size: 13px; color: var(--text-secondary); flex: 1; line-height: 1.4; }
`
