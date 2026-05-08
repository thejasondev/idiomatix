/* ──────────────────────────────────────────────────────────────
   PracticarClient v2 — Página de práctica
   Modo dual: Flashcards (SRS) ↔ Ejercicios activos
   Lang filter · Deck selector · Stats inline · Responsive
────────────────────────────────────────────────────────────── */

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpen, Zap, Play,
  FlipHorizontal, Brain,
} from 'lucide-react'
import StudySession from './flashcards/StudySession'
import ExerciseSession from './ExerciseSession'
import { SectionHeader, Badge, EmptyState, Button } from '@/components/ui'
import { useAppInit, useDeckStats } from '@/hooks'
import { db } from '@/db'
import { LANGUAGES, type LanguageCode, type Deck } from '@/types'

type StudyMode = 'flashcard' | 'exercise'
type View      = 'picker' | 'session'

export default function PracticarClient() {
  const { ready } = useAppInit()
  const [selectedLang, setSelectedLang] = useState<LanguageCode | 'all'>('all')
  const [studyMode, setStudyMode]       = useState<StudyMode>('flashcard')
  const [activeDeck, setActiveDeck]     = useState<Deck | null>(null)
  const [view, setView]                 = useState<View>('picker')

  const decks = useLiveQuery(
    () => selectedLang === 'all'
      ? db.decks.toArray()
      : db.decks.where('lang').equals(selectedLang).toArray(),
    [selectedLang]
  )

  const handleStartSession = useCallback((deck: Deck) => {
    setActiveDeck(deck); setView('session')
  }, [])

  const handleExitSession = useCallback(() => {
    setView('picker'); setActiveDeck(null)
  }, [])

  if (!ready || !decks) return <PageLoader />

  if (view === 'session' && activeDeck) {
    return (
      <div className="prac-page">
        <button className="prac-back" onClick={handleExitSession} type="button">← Salir de la sesión</button>
        {studyMode === 'flashcard'
          ? <StudySession deckId={activeDeck.id} lang={activeDeck.lang} onExit={handleExitSession} />
          : <ExerciseSession deckId={activeDeck.id} lang={activeDeck.lang} onExit={handleExitSession} />
        }
        <style>{STYLES}</style>
      </div>
    )
  }

  const langs: LanguageCode[] = ['ru', 'de', 'en']

  return (
    <div className="prac-page">
      <SectionHeader title="Practicar" description="Elige modo, idioma y mazo para comenzar" />

      <div className="mode-selector">
        <ModeBtn active={studyMode === 'flashcard'} onClick={() => setStudyMode('flashcard')}
          icon={<FlipHorizontal size={18} strokeWidth={1.5} />}
          iconClass="mode-btn__icon--flash"
          name="Flashcards" desc="SRS · Repetición espaciada" />
        <ModeBtn active={studyMode === 'exercise'} onClick={() => setStudyMode('exercise')}
          icon={<Brain size={18} strokeWidth={1.5} />}
          iconClass="mode-btn__icon--exercise"
          name="Ejercicios" desc="Opción múltiple · Completar · Ordenar" />
      </div>

      <div>
        <p className="prac-filter-label">Idioma</p>
        <div className="prac-tabs" role="tablist">
          <button role="tab" aria-selected={selectedLang === 'all'}
            className={`prac-tab ${selectedLang === 'all' ? 'prac-tab--active' : ''}`}
            onClick={() => setSelectedLang('all')} type="button">Todos</button>
          {langs.map(lang => (
            <button key={lang} role="tab" aria-selected={selectedLang === lang}
              className={`prac-tab ${selectedLang === lang ? `prac-tab--active prac-tab--active-${lang}` : ''}`}
              onClick={() => setSelectedLang(lang)} type="button">
              {LANGUAGES[lang].name}
            </button>
          ))}
        </div>
      </div>

      {decks.length === 0 ? (
        <EmptyState icon={<BookOpen size={32} strokeWidth={1} />} title="No hay mazos"
          description="Importa un mazo o espera a que se carguen los integrados."
          action={<Button variant="ghost" size="sm" onClick={() => (window.location.href = '/importar')}>Importar mazo</Button>} />
      ) : (
        <div className="prac-decks">
          {decks.map(deck => <DeckCard key={deck.id} deck={deck} mode={studyMode} onStart={handleStartSession} />)}
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  )
}

function ModeBtn({ active, onClick, icon, iconClass, name, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode
  iconClass: string; name: string; desc: string
}) {
  return (
    <button className={`mode-btn ${active ? 'mode-btn--active' : ''}`} onClick={onClick} type="button" aria-pressed={active}>
      <div className={`mode-btn__icon ${iconClass}`}>{icon}</div>
      <div className="mode-btn__text">
        <span className="mode-btn__name">{name}</span>
        <span className="mode-btn__desc">{desc}</span>
      </div>
      {active && <span className="mode-btn__check" aria-hidden>✓</span>}
    </button>
  )
}

function DeckCard({ deck, mode, onStart }: { deck: Deck; mode: StudyMode; onStart: (d: Deck) => void }) {
  const stats = useDeckStats(deck.id)
  const lang  = LANGUAGES[deck.lang]
  const isReady = stats
    ? mode === 'flashcard' ? (stats.due > 0 || stats.new > 0) : stats.total > 0
    : false
  const ctaLabel = mode === 'flashcard'
    ? (!isReady ? 'Al día ✓' : 'Estudiar')
    : 'Ejercitar'

  return (
    <div className={`deck-card deck-card--${deck.lang}`}>
      <div className="deck-card__body">
        <div className="deck-card__meta">
          <Badge variant={deck.lang}>{lang.name}</Badge>
          <Badge variant="level">{deck.level}</Badge>
          {deck.source === 'imported' && <Badge variant="neutral">importado</Badge>}
        </div>
        <h3 className="deck-card__name">{deck.name}</h3>
        {deck.description && <p className="deck-card__desc">{deck.description}</p>}
        {stats && (
          <div className="deck-card__stats">
            <span className="ds"><strong>{stats.total}</strong><em>total</em></span>
            <span className="ds ds--sep" aria-hidden>·</span>
            <span className={`ds ${stats.due > 0 ? 'ds--due' : ''}`}><strong>{stats.due}</strong><em>hoy</em></span>
            <span className="ds ds--sep" aria-hidden>·</span>
            <span className="ds ds--learned"><strong>{stats.learned}</strong><em>aprendidas</em></span>
            {stats.new > 0 && <><span className="ds ds--sep" aria-hidden>·</span><span className="ds ds--new"><strong>{stats.new}</strong><em>nuevas</em></span></>}
          </div>
        )}
      </div>
      <button
        className={`deck-card__cta deck-card__cta--${mode} ${!isReady && mode === 'flashcard' ? 'deck-card__cta--done' : ''}`}
        onClick={() => onStart(deck)} type="button"
        aria-label={`${ctaLabel} ${deck.name}`}
        disabled={mode === 'flashcard' && !isReady}
      >
        {mode === 'flashcard'
          ? <Play size={13} strokeWidth={2} fill={isReady ? 'currentColor' : 'none'} />
          : <Zap size={13} strokeWidth={2} />}
        {ctaLabel}
      </button>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="prac-loader">
      <span /><span /><span />
      <style>{`.prac-loader{display:flex;align-items:center;justify-content:center;gap:6px;padding-top:4rem}.prac-loader span{width:6px;height:6px;border-radius:50%;background:var(--verdant-600);animation:pdl 1.2s ease-in-out infinite}.prac-loader span:nth-child(2){animation-delay:.2s}.prac-loader span:nth-child(3){animation-delay:.4s}@keyframes pdl{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}

const STYLES = `
  .prac-page{display:flex;flex-direction:column;gap:1.25rem;animation:fadeIn 250ms ease;padding-bottom:1rem}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1}}
  .prac-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:0;transition:color 150ms;width:fit-content}
  .prac-back:hover{color:var(--text-primary)}
  .mode-selector{display:flex;flex-direction:column;gap:8px}
  .mode-btn{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-card);border:0.5px solid var(--border-default);border-radius:var(--radius-lg);text-align:left;cursor:pointer;width:100%;transition:border-color 150ms,background 150ms;-webkit-tap-highlight-color:transparent;position:relative}
  .mode-btn:hover{border-color:var(--border-strong);background:var(--bg-elevated)}
  .mode-btn--active{border-color:var(--verdant-700);background:rgba(13,148,136,0.05)}
  .mode-btn__icon{width:38px;height:38px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .mode-btn__icon--flash{background:rgba(45,212,191,0.12);color:var(--verdant-400)}
  .mode-btn__icon--exercise{background:rgba(129,140,248,0.12);color:var(--lucid-400)}
  .mode-btn__text{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
  .mode-btn__name{font-size:14px;font-weight:500;color:var(--text-primary)}
  .mode-btn__desc{font-size:11px;color:var(--text-muted)}
  .mode-btn__check{font-size:12px;font-weight:700;color:var(--verdant-400);flex-shrink:0}
  .prac-filter-label{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px}
  .prac-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
  .prac-tabs::-webkit-scrollbar{display:none}
  .prac-tab{flex-shrink:0;padding:6px 14px;border-radius:var(--radius-full);border:0.5px solid var(--border-default);background:transparent;font-family:var(--font-body);font-size:13px;color:var(--text-secondary);cursor:pointer;transition:all 150ms;-webkit-tap-highlight-color:transparent}
  .prac-tab:hover{color:var(--text-primary);border-color:var(--border-strong)}
  .prac-tab--active{background:var(--bg-elevated);color:var(--text-primary);border-color:var(--border-strong)}
  .prac-tab--active-ru{color:var(--lang-ru);border-color:var(--lang-ru-border);background:var(--lang-ru-bg)}
  .prac-tab--active-de{color:var(--lang-de);border-color:var(--lang-de-border);background:var(--lang-de-bg)}
  .prac-tab--active-en{color:var(--lang-en);border-color:var(--lang-en-border);background:var(--lang-en-bg)}
  .prac-decks{display:flex;flex-direction:column;gap:8px}
  .deck-card{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:1rem 1.25rem;background:var(--bg-card);border:0.5px solid var(--border-default);border-radius:var(--radius-lg);transition:border-color 150ms}
  .deck-card:hover{border-color:var(--border-strong)}
  .deck-card--ru{border-left:2px solid var(--ember-500)}
  .deck-card--de{border-left:2px solid var(--gold-500)}
  .deck-card--en{border-left:2px solid var(--lucid-500)}
  .deck-card__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
  .deck-card__meta{display:flex;gap:5px;flex-wrap:wrap}
  .deck-card__name{font-size:14px;font-weight:500;color:var(--text-primary);line-height:1.3}
  .deck-card__desc{font-size:12px;color:var(--text-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .deck-card__stats{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .ds{display:inline-flex;align-items:baseline;gap:3px;font-size:12px}
  .ds strong{font-family:var(--font-mono);font-weight:500;color:var(--text-primary)}
  .ds em{font-style:normal;font-size:10px;color:var(--text-muted)}
  .ds--sep{color:var(--border-strong);font-size:10px}
  .ds--due strong{color:var(--ember-400)}
  .ds--learned strong{color:var(--verdant-400)}
  .ds--new strong{color:var(--lucid-400)}
  .deck-card__cta{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 14px;border:none;border-radius:var(--radius-md);font-family:var(--font-body);font-size:12px;font-weight:500;cursor:pointer;transition:background 150ms,transform 100ms,opacity 150ms;white-space:nowrap;-webkit-tap-highlight-color:transparent}
  .deck-card__cta:active:not(:disabled){transform:scale(0.95)}
  .deck-card__cta--flashcard{background:var(--verdant-600);color:white}
  .deck-card__cta--flashcard:hover:not(:disabled){background:var(--verdant-500)}
  .deck-card__cta--exercise{background:rgba(99,102,241,0.15);color:var(--lucid-400);border:0.5px solid rgba(99,102,241,0.3)}
  .deck-card__cta--exercise:hover{background:rgba(99,102,241,0.22)}
  .deck-card__cta--done{background:var(--bg-elevated);color:var(--text-muted);cursor:default}
  .deck-card__cta:disabled{opacity:.55;cursor:not-allowed}
  @media(max-width:380px){.deck-card{flex-direction:column;align-items:flex-start}.deck-card__cta{width:100%;justify-content:center}}
`
