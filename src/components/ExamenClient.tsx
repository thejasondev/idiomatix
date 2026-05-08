/* ──────────────────────────────────────────────────────────────
   ExamenClient — Modo Examen CEFR simulado
   · Sesión cronometrada de 20 preguntas
   · Mezcla adaptativa: MC + FillBlank + WordOrder
   · Selección por idioma y nivel estimado
   · Informe final: puntuación, nivel CEFR estimado, áreas débiles
   · Exportación de informe en texto plano descargable
────────────────────────────────────────────────────────────── */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Trophy, Clock, Target, ChevronRight,
  Download, RotateCcw, BookOpen, Flame,
} from 'lucide-react'
import { MultipleChoice, FillBlank, WordOrder } from '@/components/exercises'
import { SectionHeader, Badge, Button, ProgressBar } from '@/components/ui'
import { db } from '@/db'
import {
  generateMultipleChoice, generateFillBlank,
  generateWordOrder, shuffle, sample,
  type MultipleChoiceExercise, type FillBlankExercise, type WordOrderExercise,
} from '@/utils'
import { LANGUAGES, CEFR_LEVELS, type LanguageCode, type CEFRLevel } from '@/types'

// ─── Types ────────────────────────────────────────────────────

type ExamPhase = 'setup' | 'countdown' | 'running' | 'complete'

type AnyExercise =
  | { kind: 'mc'; data: MultipleChoiceExercise }
  | { kind: 'fb'; data: FillBlankExercise }
  | { kind: 'wo'; data: WordOrderExercise }

interface ExamResult {
  cardId: string
  correct: boolean
  type: 'mc' | 'fb' | 'wo'
  level: CEFRLevel
}

const EXAM_QUESTIONS = 20
const EXAM_DURATION  = 15 * 60 // 15 minutes in seconds

// ─── CEFR level estimation from score ─────────────────────────

function estimateCEFR(
  accuracy: number,
  targetLevel: CEFRLevel
): CEFRLevel {
  const idx = CEFR_LEVELS.indexOf(targetLevel)
  if (accuracy >= 90) return CEFR_LEVELS[Math.min(idx + 1, CEFR_LEVELS.length - 1)] as CEFRLevel
  if (accuracy >= 75) return targetLevel
  if (accuracy >= 55) return CEFR_LEVELS[Math.max(idx - 1, 0)] as CEFRLevel
  return CEFR_LEVELS[Math.max(idx - 2, 0)] as CEFRLevel
}

function cefrMessage(level: CEFRLevel): string {
  const msgs: Record<CEFRLevel, string> = {
    A1: 'Principiante — Reconoces palabras básicas y frases muy simples.',
    A2: 'Elemental — Comprendes frases y vocabulario de uso cotidiano.',
    B1: 'Intermedio — Puedes manejar situaciones cotidianas y expresarte.',
    B2: 'Intermedio Alto — Interactúas con fluidez con hablantes nativos.',
    C1: 'Avanzado — Te expresas de forma fluida, precisa y bien estructurada.',
    C2: 'Maestría — Comprendes prácticamente todo con naturalidad total.',
  }
  return msgs[level]
}

// ─── Component ────────────────────────────────────────────────

export default function ExamenClient() {
  const [phase,        setPhase]        = useState<ExamPhase>('setup')
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('ru')
  const [selectedLevel,setSelectedLevel]= useState<CEFRLevel>('A2')
  const [queue,        setQueue]        = useState<AnyExercise[]>([])
  const [index,        setIndex]        = useState(0)
  const [results,      setResults]      = useState<ExamResult[]>([])
  const [timeLeft,     setTimeLeft]     = useState(EXAM_DURATION)
  const [countdown,    setCountdown]    = useState(3)
  const [building,     setBuilding]     = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown before exam starts
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdown(3)
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          setPhase('running')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  // Exam timer
  useEffect(() => {
    if (phase !== 'running') return
    setTimeLeft(EXAM_DURATION)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('complete')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const buildExam = useCallback(async () => {
    setBuilding(true)
    try {
      // Get cards for selected level + neighbors (i+1 principle)
      const levelIdx = CEFR_LEVELS.indexOf(selectedLevel)
      const targetLevels = [
        CEFR_LEVELS[Math.max(levelIdx - 1, 0)],
        selectedLevel,
        CEFR_LEVELS[Math.min(levelIdx + 1, CEFR_LEVELS.length - 1)],
      ].filter(Boolean) as CEFRLevel[]

      const allCards = await db.cards.where('lang').equals(selectedLang).toArray()
      const levelCards = allCards.filter(c => targetLevels.includes(c.level))
      const pool = allCards

      if (levelCards.length < 5) {
        alert('Pocos mazos para este nivel. Asegúrate de tener los mazos integrados cargados.')
        setBuilding(false)
        return
      }

      const target = sample(levelCards, Math.min(levelCards.length, EXAM_QUESTIONS))
      const exercises: AnyExercise[] = []

      for (const card of target) {
        const fb = generateFillBlank(card)
        const wo = generateWordOrder(card)
        const mc = generateMultipleChoice(card, pool)

        // Weighted: prefer richer exercise types
        if (fb)      exercises.push({ kind: 'fb', data: fb })
        else if (wo) exercises.push({ kind: 'wo', data: wo })
        else         exercises.push({ kind: 'mc', data: mc })
      }

      // Pad with MC if needed
      while (exercises.length < EXAM_QUESTIONS && target.length > 0) {
        const card = target[exercises.length % target.length]!
        exercises.push({ kind: 'mc', data: generateMultipleChoice(card, pool) })
      }

      setQueue(shuffle(exercises).slice(0, EXAM_QUESTIONS))
      setIndex(0)
      setResults([])
      setBuilding(false)
      setPhase('countdown')
    } catch (err) {
      console.error(err)
      setBuilding(false)
    }
  }, [selectedLang, selectedLevel])

  const handleResult = useCallback((correct: boolean) => {
    const current = queue[index]
    if (!current) return

    const newResults: ExamResult[] = [
      ...results,
      {
        cardId: current.data.card.id,
        correct,
        type: current.kind,
        level: current.data.card.level,
      },
    ]
    const next = index + 1

    if (next >= queue.length) {
      if (timerRef.current) clearInterval(timerRef.current)
      setResults(newResults)
      setPhase('complete')
    } else {
      setResults(newResults)
      setIndex(next)
    }
  }, [queue, index, results])

  const handleRestart = useCallback(() => {
    setPhase('setup')
    setQueue([])
    setIndex(0)
    setResults([])
    setTimeLeft(EXAM_DURATION)
  }, [])

  // ── Setup ─────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="ex-page">
        <SectionHeader
          title="Modo Examen"
          description="Simulacro CEFR cronometrado · 20 preguntas · 15 minutos"
        />

        <div className="ex-setup">
          {/* Language */}
          <div className="ex-setup__section">
            <p className="ex-setup__label">Idioma</p>
            <div className="ex-setup__tabs">
              {(['ru', 'de', 'en'] as LanguageCode[]).map(lang => (
                <button
                  key={lang}
                  className={`ex-tab ex-tab--lang ${selectedLang === lang ? `ex-tab--active ex-tab--${lang}` : ''}`}
                  onClick={() => setSelectedLang(lang)}
                  type="button"
                >
                  {LANGUAGES[lang].name}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="ex-setup__section">
            <p className="ex-setup__label">Nivel objetivo</p>
            <div className="ex-setup__tabs ex-setup__tabs--grid">
              {CEFR_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  className={`ex-tab ex-tab--lvl ${selectedLevel === lvl ? 'ex-tab--active' : ''}`}
                  onClick={() => setSelectedLevel(lvl)}
                  type="button"
                >
                  <span className="ex-tab__lvl">{lvl}</span>
                  <span className="ex-tab__name">{getLevelShortName(lvl)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="ex-info">
            <div className="ex-info__row">
              <Target size={14} strokeWidth={1.5} /><span>20 preguntas mixtas</span>
            </div>
            <div className="ex-info__row">
              <Clock size={14} strokeWidth={1.5} /><span>15 minutos máximo</span>
            </div>
            <div className="ex-info__row">
              <Trophy size={14} strokeWidth={1.5} /><span>Nivel CEFR estimado al finalizar</span>
            </div>
          </div>

          <Button onClick={buildExam} loading={building} fullWidth size="lg">
            <ChevronRight size={16} /> Comenzar examen
          </Button>
        </div>

        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Countdown ─────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="ex-countdown">
        <div className="ex-countdown__num">{countdown}</div>
        <p className="ex-countdown__label">Prepárate…</p>
        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <ExamReport
        results={results}
        lang={selectedLang}
        targetLevel={selectedLevel}
        timeUsed={EXAM_DURATION - timeLeft}
        onRestart={handleRestart}
      />
    )
  }

  // ── Running ───────────────────────────────────────────────
  const current = queue[index]
  if (!current) return null

  const pct       = Math.round((index / EXAM_QUESTIONS) * 100)
  const minutes   = Math.floor(timeLeft / 60)
  const seconds   = timeLeft % 60
  const timeStr   = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent  = timeLeft <= 120

  return (
    <div className="ex-running">
      {/* Top bar */}
      <div className="ex-bar">
        <span className={`ex-bar__time ${isUrgent ? 'ex-bar__time--urgent' : ''}`}>
          <Clock size={12} strokeWidth={1.5} />
          {timeStr}
        </span>
        <div className="ex-bar__prog">
          <div className="ex-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ex-bar__count">{index + 1}/{EXAM_QUESTIONS}</span>
      </div>

      {/* Exercise */}
      <div className="ex-exercise" key={index}>
        {current.kind === 'mc' && (
          <MultipleChoice exercise={current.data} onResult={handleResult} />
        )}
        {current.kind === 'fb' && (
          <FillBlank exercise={current.data} onResult={handleResult} />
        )}
        {current.kind === 'wo' && (
          <WordOrder exercise={current.data} onResult={handleResult} />
        )}
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

// ─── ExamReport ───────────────────────────────────────────────

interface ReportProps {
  results: ExamResult[]
  lang: LanguageCode
  targetLevel: CEFRLevel
  timeUsed: number
  onRestart: () => void
}

function ExamReport({ results, lang, targetLevel, timeUsed, onRestart }: ReportProps) {
  const total    = results.length
  const correct  = results.filter(r => r.correct).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const estimated = estimateCEFR(accuracy, targetLevel)

  const minutes = Math.floor(timeUsed / 60)
  const seconds = timeUsed % 60
  const timeStr = `${minutes}m ${seconds}s`

  // Breakdown by exercise type
  const byType = {
    mc: results.filter(r => r.type === 'mc'),
    fb: results.filter(r => r.type === 'fb'),
    wo: results.filter(r => r.type === 'wo'),
  }

  // Breakdown by level
  const byLevel = CEFR_LEVELS.map(lvl => {
    const lvlResults = results.filter(r => r.level === lvl)
    return {
      level: lvl,
      total: lvlResults.length,
      correct: lvlResults.filter(r => r.correct).length,
    }
  }).filter(r => r.total > 0)

  const handleDownload = useCallback(() => {
    const lines = [
      '═══════════════════════════════════',
      '     IDIOMATIX — INFORME DE EXAMEN',
      '═══════════════════════════════════',
      '',
      `Idioma:        ${LANGUAGES[lang].name}`,
      `Nivel objetivo: ${targetLevel}`,
      `Nivel estimado: ${estimated}`,
      `Tiempo usado:  ${timeStr}`,
      '',
      '─── PUNTUACIÓN ───────────────────',
      `Total preguntas: ${total}`,
      `Correctas:       ${correct}`,
      `Precisión:       ${accuracy}%`,
      '',
      '─── POR TIPO DE EJERCICIO ────────',
      byType.mc.length > 0 ? `Opción múltiple: ${byType.mc.filter(r=>r.correct).length}/${byType.mc.length}` : '',
      byType.fb.length > 0 ? `Completar frase: ${byType.fb.filter(r=>r.correct).length}/${byType.fb.length}` : '',
      byType.wo.length > 0 ? `Ordenar palabras: ${byType.wo.filter(r=>r.correct).length}/${byType.wo.length}` : '',
      '',
      '─── DIAGNÓSTICO ──────────────────',
      cefrMessage(estimated),
      '',
      `Generado: ${new Date().toLocaleDateString('es-ES')}`,
      '═══════════════════════════════════',
    ].filter(l => l !== null)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `idiomatix-examen-${lang}-${estimated}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [lang, targetLevel, estimated, total, correct, accuracy, timeStr, byType])

  const grade =
    accuracy >= 90 ? '🏆' :
    accuracy >= 75 ? '🎯' :
    accuracy >= 55 ? '💪' : '📚'

  return (
    <div className="rep-page">
      {/* Hero */}
      <div className="rep-hero">
        <span className="rep-hero__grade">{grade}</span>
        <h1 className="rep-hero__title">Examen completado</h1>
        <p className="rep-hero__sub">
          {LANGUAGES[lang].name} · {timeStr}
        </p>
      </div>

      {/* CEFR result */}
      <div className="rep-cefr">
        <div className="rep-cefr__levels">
          {CEFR_LEVELS.map(lvl => (
            <div
              key={lvl}
              className={`rep-cefr__pip ${lvl === estimated ? 'rep-cefr__pip--active' : ''} ${lvl === targetLevel ? 'rep-cefr__pip--target' : ''}`}
            >
              <span className="rep-cefr__pip-label">{lvl}</span>
              {lvl === estimated && <span className="rep-cefr__pip-dot" aria-hidden />}
            </div>
          ))}
        </div>
        <p className="rep-cefr__msg">{cefrMessage(estimated)}</p>
      </div>

      {/* Score grid */}
      <div className="rep-grid">
        <div className="rep-stat">
          <span className="rep-stat__val" style={{ color: accuracy >= 70 ? 'var(--verdant-400)' : 'var(--crimson-400)' }}>
            {accuracy}%
          </span>
          <span className="rep-stat__lbl">precisión</span>
        </div>
        <div className="rep-stat">
          <span className="rep-stat__val rep-stat__val--primary">{correct}</span>
          <span className="rep-stat__lbl">correctas</span>
        </div>
        <div className="rep-stat">
          <span className="rep-stat__val" style={{ color: 'var(--crimson-400)' }}>{total - correct}</span>
          <span className="rep-stat__lbl">fallidas</span>
        </div>
      </div>

      <ProgressBar value={accuracy} lang={lang} size="md" />

      {/* Breakdown by type */}
      <div className="rep-breakdown">
        <p className="rep-breakdown__title">Por tipo de ejercicio</p>
        {byType.mc.length > 0 && (
          <BreakdownRow label="Opción múltiple" results={byType.mc} />
        )}
        {byType.fb.length > 0 && (
          <BreakdownRow label="Completar frase" results={byType.fb} />
        )}
        {byType.wo.length > 0 && (
          <BreakdownRow label="Ordenar palabras" results={byType.wo} />
        )}
      </div>

      {/* Breakdown by level */}
      {byLevel.length > 1 && (
        <div className="rep-breakdown">
          <p className="rep-breakdown__title">Por nivel CEFR</p>
          {byLevel.map(({ level, total: t, correct: c }) => (
            <BreakdownRow
              key={level}
              label={level}
              results={Array.from({ length: t }, (_, i) => ({ correct: i < c }))}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="rep-actions">
        <Button variant="subtle" onClick={handleDownload} fullWidth>
          <Download size={14} /> Descargar informe
        </Button>
        <Button variant="ghost" onClick={onRestart} fullWidth>
          <RotateCcw size={14} /> Nuevo examen
        </Button>
        <Button onClick={() => (window.location.href = '/practicar')} fullWidth>
          <BookOpen size={14} /> Seguir estudiando
        </Button>
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

function BreakdownRow({
  label,
  results,
}: {
  label: string
  results: { correct: boolean }[]
}) {
  const c   = results.filter(r => r.correct).length
  const t   = results.length
  const pct = t > 0 ? Math.round((c / t) * 100) : 0
  const color = pct >= 75 ? 'var(--verdant-400)' : pct >= 50 ? 'var(--gold-400)' : 'var(--crimson-400)'

  return (
    <div className="bdr">
      <span className="bdr__label">{label}</span>
      <div className="bdr__bar">
        <div className="bdr__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bdr__score" style={{ color }}>{c}/{t}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function getLevelShortName(lvl: CEFRLevel): string {
  const names: Record<CEFRLevel, string> = {
    A1: 'Principiante', A2: 'Elemental',
    B1: 'Intermedio',   B2: 'Int. Alto',
    C1: 'Avanzado',     C2: 'Maestría',
  }
  return names[lvl]
}

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .ex-page, .rep-page { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  /* Setup */
  .ex-setup { display: flex; flex-direction: column; gap: 1.25rem; }
  .ex-setup__section { display: flex; flex-direction: column; gap: 8px; }
  .ex-setup__label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-muted); font-family: var(--font-mono); }
  .ex-setup__tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .ex-setup__tabs--grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }

  .ex-tab {
    padding: 8px 16px; border-radius: var(--radius-md);
    border: 0.5px solid var(--border-default);
    background: transparent; font-family: var(--font-body); font-size: 13px;
    color: var(--text-secondary); cursor: pointer; transition: all 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .ex-tab:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .ex-tab--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }
  .ex-tab--ru.ex-tab--active { color: var(--lang-ru); border-color: var(--lang-ru-border); background: var(--lang-ru-bg); }
  .ex-tab--de.ex-tab--active { color: var(--lang-de); border-color: var(--lang-de-border); background: var(--lang-de-bg); }
  .ex-tab--en.ex-tab--active { color: var(--lang-en); border-color: var(--lang-en-border); background: var(--lang-en-bg); }

  .ex-tab--lvl { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 8px; }
  .ex-tab__lvl { font-family: var(--font-mono); font-size: 14px; font-weight: 500; }
  .ex-tab__name { font-size: 10px; color: var(--text-muted); }

  .ex-info {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 8px;
  }
  .ex-info__row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }

  /* Countdown */
  .ex-countdown {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 60vh; gap: 16px; animation: fadeIn 300ms ease;
  }
  .ex-countdown__num {
    font-family: var(--font-display); font-size: 6rem; color: var(--verdant-400);
    line-height: 1; animation: countPulse 1s ease;
  }
  @keyframes countPulse { from { transform: scale(1.3); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
  .ex-countdown__label { font-size: 18px; color: var(--text-muted); }

  /* Running */
  .ex-running { display: flex; flex-direction: column; gap: 1.25rem; }
  .ex-bar { display: flex; align-items: center; gap: 10px; }
  .ex-bar__time { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; white-space: nowrap; }
  .ex-bar__time--urgent { color: var(--crimson-400); animation: urgentPulse 1s ease-in-out infinite; }
  @keyframes urgentPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .ex-bar__prog { flex: 1; height: 3px; background: var(--bg-elevated); border-radius: 99px; overflow: hidden; }
  .ex-bar__fill { height: 100%; background: var(--lucid-600); border-radius: 99px; transition: width 400ms ease; }
  .ex-bar__count { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); white-space: nowrap; }
  .ex-exercise { animation: fadeIn 200ms ease; }

  /* Report */
  .rep-hero { text-align: center; padding: 1rem 0; }
  .rep-hero__grade { font-size: 3rem; display: block; margin-bottom: 8px; }
  .rep-hero__title { font-size: 1.4rem; font-weight: 600; color: var(--text-primary); }
  .rep-hero__sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  /* CEFR scale */
  .rep-cefr {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 12px;
  }
  .rep-cefr__levels { display: flex; justify-content: space-between; gap: 4px; }
  .rep-cefr__pip {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 8px 4px; border-radius: var(--radius-md);
    border: 0.5px solid var(--border-subtle);
    transition: all 200ms;
  }
  .rep-cefr__pip--target { border-color: var(--border-default); background: var(--bg-elevated); }
  .rep-cefr__pip--active {
    border-color: var(--verdant-600);
    background: rgba(45,212,191,0.08);
  }
  .rep-cefr__pip-label { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
  .rep-cefr__pip--active .rep-cefr__pip-label { color: var(--verdant-400); font-weight: 500; }
  .rep-cefr__pip-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--verdant-500);
    box-shadow: 0 0 6px rgba(45,212,191,0.5);
  }
  .rep-cefr__msg { font-size: 13px; color: var(--text-secondary); line-height: 1.5; text-align: center; }

  /* Score grid */
  .rep-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); overflow: hidden;
  }
  .rep-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 16px 8px; border-right: 0.5px solid var(--border-subtle); }
  .rep-stat:last-child { border-right: none; }
  .rep-stat__val { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 500; color: var(--text-primary); line-height: 1; }
  .rep-stat__val--primary { color: var(--verdant-400); }
  .rep-stat__lbl { font-size: 10px; color: var(--text-muted); }

  /* Breakdown */
  .rep-breakdown { background: var(--bg-card); border: 0.5px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
  .rep-breakdown__title { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); padding: 10px 14px 8px; border-bottom: 0.5px solid var(--border-subtle); font-family: var(--font-mono); }
  .bdr { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 0.5px solid var(--border-subtle); }
  .bdr:last-child { border-bottom: none; }
  .bdr__label { font-size: 12px; color: var(--text-secondary); min-width: 120px; flex-shrink: 0; }
  .bdr__bar { flex: 1; height: 4px; background: var(--bg-elevated); border-radius: 99px; overflow: hidden; }
  .bdr__fill { height: 100%; border-radius: 99px; transition: width 500ms ease; }
  .bdr__score { font-family: var(--font-mono); font-size: 11px; min-width: 32px; text-align: right; flex-shrink: 0; }

  /* Actions */
  .rep-actions { display: flex; flex-direction: column; gap: 8px; }
`
