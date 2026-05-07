/* ──────────────────────────────────────────────────────────────
   ProgresoClient — Dashboard de progreso
   Heatmap de actividad · stats por idioma · historial de sesiones
────────────────────────────────────────────────────────────── */

import { useState, useEffect } from 'react'
import { Flame, BookOpen, Clock, Target, TrendingUp } from 'lucide-react'
import { SectionHeader, ProgressBar, Badge } from '@/components/ui'
import { useAppInit } from '@/hooks'
import { db, getActivityHistory } from '@/db'
import { LANGUAGES, CEFR_LEVELS, type LanguageCode, type DailyActivity } from '@/types'

interface LangStats {
  lang: LanguageCode
  totalCards: number
  learnedCards: number
  totalReviews: number
  minutesStudied: number
}

interface SessionRecord {
  id: string
  lang: LanguageCode
  deckName: string
  cardsReviewed: number
  cardsCorrect: number
  durationSeconds: number
  startedAt: number
}

export default function ProgresoClient() {
  const { ready } = useAppInit()
  const [activity, setActivity]       = useState<DailyActivity[]>([])
  const [langStats, setLangStats]     = useState<LangStats[]>([])
  const [sessions, setSessions]       = useState<SessionRecord[]>([])
  const [streak, setStreak]           = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [isLoading, setIsLoading]     = useState(true)

  useEffect(() => {
    if (!ready) return
    loadStats()
  }, [ready])

  async function loadStats() {
    try {
      const [activityData, allReviews, allDecks, allCards, sessionData] = await Promise.all([
        getActivityHistory(90),
        db.reviews.toArray(),
        db.decks.toArray(),
        db.cards.toArray(),
        db.sessions.orderBy('startedAt').reverse().limit(10).toArray(),
      ])

      setActivity(activityData)

      // Streak
      const s = calcStreak(activityData)
      setStreak(s)

      // Totals
      const mins = activityData.reduce((acc, d) => acc + d.minutesStudied, 0)
      setTotalMinutes(mins)
      setTotalReviews(allReviews.length)

      // Per-lang stats
      const langs: LanguageCode[] = ['ru', 'de', 'en']
      const stats: LangStats[] = langs.map(lang => {
        const langCards    = allCards.filter(c => c.lang === lang)
        const langReviews  = allReviews.filter(r => r.lang === lang)
        const learned      = langReviews.filter(r => r.interval >= 21).length
        const langActivity = activityData.filter(a => a.langs.includes(lang))
        const minutes      = langActivity.reduce((acc, a) => acc + a.minutesStudied, 0)
        return {
          lang,
          totalCards: langCards.length,
          learnedCards: learned,
          totalReviews: langReviews.length,
          minutesStudied: minutes,
        }
      })
      setLangStats(stats)

      // Sessions with deck names
      const deckMap = new Map(allDecks.map(d => [d.id, d.name]))
      const sessionRecords: SessionRecord[] = sessionData.map(s => ({
        id: s.id,
        lang: s.lang,
        deckName: deckMap.get(s.deckId) ?? 'Mazo',
        cardsReviewed: s.cardsReviewed,
        cardsCorrect: s.cardsCorrect,
        durationSeconds: s.durationSeconds,
        startedAt: s.startedAt,
      }))
      setSessions(sessionRecords)

    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready || isLoading) return <PageLoader />

  return (
    <div className="prog-page">
      <SectionHeader title="Progreso" description="Tu historial de aprendizaje" />

      {/* Global stats */}
      <div className="prog-stats-grid">
        <StatTile icon={<Flame size={16} strokeWidth={1.5} />} value={streak} label="Racha" color="var(--ember-400)" />
        <StatTile icon={<BookOpen size={16} strokeWidth={1.5} />} value={totalReviews} label="Revisiones" color="var(--lucid-400)" />
        <StatTile icon={<Clock size={16} strokeWidth={1.5} />} value={totalMinutes} label="Minutos" color="var(--gold-400)" />
        <StatTile icon={<Target size={16} strokeWidth={1.5} />} value={langStats.reduce((a,l) => a + l.learnedCards, 0)} label="Aprendidas" color="var(--verdant-400)" />
      </div>

      {/* Activity heatmap */}
      <div className="prog-section">
        <p className="prog-section-label">Actividad — últimos 90 días</p>
        <ActivityHeatmap activity={activity} />
      </div>

      {/* Per-language breakdown */}
      <div className="prog-section">
        <p className="prog-section-label">Por idioma</p>
        <div className="prog-lang-cards">
          {langStats.map(stat => (
            <LangStatCard key={stat.lang} stat={stat} />
          ))}
        </div>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="prog-section">
          <p className="prog-section-label">Sesiones recientes</p>
          <div className="prog-sessions">
            {sessions.map(session => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  )
}

// ─── StatTile ─────────────────────────────────────────────────

function StatTile({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__icon" style={{ color }}>{icon}</span>
      <span className="stat-tile__val">{value.toLocaleString()}</span>
      <span className="stat-tile__label">{label}</span>
    </div>
  )
}

// ─── ActivityHeatmap ──────────────────────────────────────────

function ActivityHeatmap({ activity }: { activity: DailyActivity[] }) {
  const activityMap = new Map(activity.map(a => [a.date, a.cardsReviewed]))
  const maxCards = Math.max(1, ...activity.map(a => a.cardsReviewed))

  // Build last 90 days grid
  const today = new Date()
  const days: { date: string; count: number }[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0] as string
    days.push({ date: key, count: activityMap.get(key) ?? 0 })
  }

  const getIntensity = (count: number) => {
    if (count === 0) return 0
    const pct = count / maxCards
    if (pct < 0.25) return 1
    if (pct < 0.5)  return 2
    if (pct < 0.75) return 3
    return 4
  }

  return (
    <div className="heatmap">
      <div className="heatmap__grid">
        {days.map(({ date, count }) => (
          <div
            key={date}
            className={`heatmap__cell heatmap__cell--${getIntensity(count)}`}
            title={`${date}: ${count} tarjetas`}
            role="img"
            aria-label={`${date}: ${count} revisiones`}
          />
        ))}
      </div>
      <div className="heatmap__legend">
        <span className="heatmap__legend-label">Menos</span>
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`heatmap__cell heatmap__cell--${i}`} />
        ))}
        <span className="heatmap__legend-label">Más</span>
      </div>
    </div>
  )
}

// ─── LangStatCard ─────────────────────────────────────────────

function LangStatCard({ stat }: { stat: LangStats }) {
  const pct = stat.totalCards > 0
    ? Math.round((stat.learnedCards / stat.totalCards) * 100)
    : 0

  return (
    <div className={`lang-stat-card lang-stat-card--${stat.lang}`}>
      <div className="lang-stat-card__header">
        <div>
          <Badge variant={stat.lang}>{LANGUAGES[stat.lang].name}</Badge>
        </div>
        <span className="lang-stat-card__pct">{pct}%</span>
      </div>
      <ProgressBar value={stat.learnedCards} max={Math.max(1, stat.totalCards)} lang={stat.lang} size="sm" />
      <div className="lang-stat-card__numbers">
        <span>{stat.learnedCards} <em>aprendidas</em></span>
        <span>{stat.totalReviews} <em>revisiones</em></span>
        <span>{stat.minutesStudied} <em>min</em></span>
      </div>
    </div>
  )
}

// ─── SessionRow ───────────────────────────────────────────────

function SessionRow({ session }: { session: SessionRecord }) {
  const accuracy = session.cardsReviewed > 0
    ? Math.round((session.cardsCorrect / session.cardsReviewed) * 100)
    : 0
  const mins = Math.ceil(session.durationSeconds / 60)
  const date = new Date(session.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  return (
    <div className="session-row">
      <div className="session-row__left">
        <Badge variant={session.lang}>{LANGUAGES[session.lang].name}</Badge>
        <div>
          <p className="session-row__deck">{session.deckName}</p>
          <p className="session-row__meta">{date} · {mins} min · {session.cardsReviewed} tarjetas</p>
        </div>
      </div>
      <span className="session-row__accuracy" style={{ color: accuracy >= 80 ? 'var(--verdant-400)' : accuracy >= 50 ? 'var(--gold-400)' : 'var(--crimson-400)' }}>
        {accuracy}%
      </span>
    </div>
  )
}

// ─── PageLoader ───────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="loading-dots">
        <span /><span /><span />
      </div>
      <style>{`.loading-dots{display:flex;gap:6px}.loading-dots span{width:6px;height:6px;border-radius:50%;background:var(--verdant-600);animation:pd 1.2s ease-in-out infinite}.loading-dots span:nth-child(2){animation-delay:.2s}.loading-dots span:nth-child(3){animation-delay:.4s}@keyframes pd{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}

// ─── Streak util ──────────────────────────────────────────────

function calcStreak(activity: DailyActivity[]): number {
  if (!activity.length) return 0
  const today = new Date()
  today.setHours(0,0,0,0)
  const sorted = [...activity].sort((a,b) => b.date.localeCompare(a.date))
  let streak = 0
  const check = new Date(today)
  for (const day of sorted) {
    const d = new Date(day.date + 'T00:00:00')
    const diff = Math.round((check.getTime() - d.getTime()) / 86400000)
    if (diff > 1) break
    if (day.cardsReviewed > 0) { streak++; check.setDate(check.getDate() - 1) }
  }
  return streak
}

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .prog-page { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .prog-stats-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  }
  .stat-tile {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: 14px; padding: 12px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
  }
  .stat-tile__icon { margin-bottom: 2px; }
  .stat-tile__val { font-family: var(--font-mono); font-size: 1.15rem; font-weight: 500; color: var(--text-primary); line-height: 1; }
  .stat-tile__label { font-size: 10px; color: var(--text-muted); }

  .prog-section { display: flex; flex-direction: column; gap: 10px; }
  .prog-section-label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-family: var(--font-mono); }

  /* Heatmap */
  .heatmap { display: flex; flex-direction: column; gap: 8px; }
  .heatmap__grid {
    display: grid;
    grid-template-columns: repeat(18, 1fr);
    gap: 3px;
  }
  .heatmap__cell {
    aspect-ratio: 1; border-radius: 2px;
    transition: transform 100ms;
  }
  .heatmap__cell:hover { transform: scale(1.3); }
  .heatmap__cell--0 { background: var(--bg-elevated); }
  .heatmap__cell--1 { background: rgba(13,148,136,0.25); }
  .heatmap__cell--2 { background: rgba(13,148,136,0.45); }
  .heatmap__cell--3 { background: rgba(45,212,191,0.65); }
  .heatmap__cell--4 { background: var(--verdant-400); }
  .heatmap__legend { display: flex; align-items: center; gap: 4px; }
  .heatmap__legend-label { font-size: 10px; color: var(--text-muted); }
  .heatmap__legend .heatmap__cell { width: 12px; height: 12px; aspect-ratio: unset; }

  /* Lang stat cards */
  .prog-lang-cards { display: flex; flex-direction: column; gap: 8px; }
  .lang-stat-card {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 10px;
  }
  .lang-stat-card--ru { border-left: 2px solid var(--ember-500); }
  .lang-stat-card--de { border-left: 2px solid var(--gold-500); }
  .lang-stat-card--en { border-left: 2px solid var(--lucid-500); }
  .lang-stat-card__header { display: flex; justify-content: space-between; align-items: center; }
  .lang-stat-card__pct { font-family: var(--font-mono); font-size: 1.2rem; font-weight: 500; color: var(--text-primary); }
  .lang-stat-card__numbers { display: flex; gap: 16px; }
  .lang-stat-card__numbers span { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); }
  .lang-stat-card__numbers em { font-style: normal; font-size: 10px; color: var(--text-muted); margin-left: 2px; }

  /* Sessions */
  .prog-sessions { display: flex; flex-direction: column; }
  .session-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 0; border-bottom: 0.5px solid var(--border-subtle);
  }
  .session-row:last-child { border-bottom: none; }
  .session-row__left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .session-row__deck { font-size: 13px; font-weight: 500; color: var(--text-primary); }
  .session-row__meta { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
  .session-row__accuracy { font-family: var(--font-mono); font-size: 14px; font-weight: 500; flex-shrink: 0; }
`
