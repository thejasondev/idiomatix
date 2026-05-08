/* ──────────────────────────────────────────────────────────────
   HomeClient — Dashboard principal de la app
────────────────────────────────────────────────────────────── */

import { useEffect, useState, lazy, Suspense } from 'react'
import { BookOpen, Flame, Target, Clock, ChevronRight, Plus } from 'lucide-react'
import { LANGUAGES, type LanguageCode } from '@/types'
import { db, getDeckStats, getActivityHistory } from '@/db'
import type { DailyActivity, Deck } from '@/types'

const OnboardingFlow = lazy(() => import('@/components/OnboardingFlow'))

interface LangSummary {
  lang: LanguageCode
  dueCount: number
  totalLearned: number
  decks: Deck[]
}

export default function HomeClient() {
  const [langSummaries, setLangSummaries] = useState<LangSummary[]>([])
  const [streak, setStreak] = useState(0)
  const [todayCards, setTodayCards] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 19) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')

    // Check if onboarding was completed
    if (!localStorage.getItem('idiomatix-onboarded')) {
      setShowOnboarding(true)
    }

    loadData()
  }, [])

  async function loadData() {
    try {
      const langs: LanguageCode[] = ['ru', 'de', 'en']
      const now = Date.now()

      // Load summaries per language
      const summaries = await Promise.all(langs.map(async (lang) => {
        const decks = await db.decks.where('lang').equals(lang).toArray()
        const dueReviews = await db.reviews
          .where('lang').equals(lang)
          .filter(r => r.nextReview <= now)
          .count()
        const learnedReviews = await db.reviews
          .where('lang').equals(lang)
          .filter(r => r.interval >= 21)
          .count()
        return { lang, dueCount: dueReviews, totalLearned: learnedReviews, decks }
      }))

      setLangSummaries(summaries)

      // Activity stats
      const today = new Date().toISOString().split('T')[0]
      const activity = await getActivityHistory(30)
      const todayActivity = activity.find(a => a.date === today)
      setTodayCards(todayActivity?.cardsReviewed ?? 0)
      setTotalMinutes(todayActivity?.minutesStudied ?? 0)

      // Streak calculation
      const calculatedStreak = calculateStreak(activity)
      setStreak(calculatedStreak)

    } catch (err) {
      console.error('Error loading home data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalDue = langSummaries.reduce((sum, l) => sum + l.dueCount, 0)

  if (isLoading) {
    return (
      <div className="home-loading">
        <div className="home-loading__dots">
          <span /><span /><span />
        </div>
      </div>
    )
  }

  return (
    <div className="home">
      {/* Onboarding — first-time experience */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}

      {/* Header */}
      <header className="home-header">
        <div>
          <p className="home-greeting">{greeting}</p>
          <h1 className="home-title">
            <span className="home-title__display">Idiom</span>
            <span className="home-title__display home-title__display--accent">atix</span>
          </h1>
        </div>
        <a href="/ajustes" className="home-settings-btn" aria-label="Ajustes">
          <span style={{ fontSize: 20 }}>⚙</span>
        </a>
      </header>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card">
          <Flame size={16} strokeWidth={1.5} className="stat-card__icon stat-card__icon--flame" />
          <div className="stat-card__value">{streak}</div>
          <div className="stat-card__label">días racha</div>
        </div>
        <div className="stat-card">
          <BookOpen size={16} strokeWidth={1.5} className="stat-card__icon stat-card__icon--book" />
          <div className="stat-card__value">{todayCards}</div>
          <div className="stat-card__label">hoy</div>
        </div>
        <div className="stat-card">
          <Target size={16} strokeWidth={1.5} className="stat-card__icon stat-card__icon--target" />
          <div className="stat-card__value">{totalDue}</div>
          <div className="stat-card__label">pendientes</div>
        </div>
        <div className="stat-card">
          <Clock size={16} strokeWidth={1.5} className="stat-card__icon stat-card__icon--clock" />
          <div className="stat-card__value">{totalMinutes}</div>
          <div className="stat-card__label">minutos</div>
        </div>
      </div>

      {/* CTA — if there are due cards */}
      {totalDue > 0 && (
        <a href="/practicar" className="cta-banner">
          <div>
            <p className="cta-banner__title">¡Tienes {totalDue} tarjetas pendientes!</p>
            <p className="cta-banner__sub">Mantén tu racha. Sesión estimada: {Math.ceil(totalDue * 0.5)} min</p>
          </div>
          <ChevronRight size={20} strokeWidth={1.5} />
        </a>
      )}

      {/* Language cards */}
      <section className="lang-section">
        <div className="section-header">
          <h2 className="section-title">Tus idiomas</h2>
          <a href="/vocabulario" className="section-link">Ver todo</a>
        </div>

        <div className="lang-cards">
          {langSummaries.map(({ lang, dueCount, totalLearned, decks }) => {
            const langInfo = LANGUAGES[lang]
            return (
              <a
                key={lang}
                href={`/practicar?lang=${lang}`}
                className={`lang-card lang-card--${lang}`}
              >
                <div className="lang-card__header">
                  <div className="lang-card__name-row">
                    <span className="lang-card__name">{langInfo.name}</span>
                    <span className={`lang-card__badge lang-card__badge--${lang}`}>
                      {langInfo.nativeName}
                    </span>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="lang-card__stats">
                  <div className="lang-card__stat">
                    <span className="lang-card__stat-val">{totalLearned}</span>
                    <span className="lang-card__stat-lbl">aprendidas</span>
                  </div>
                  <div className="lang-card__stat">
                    <span
                      className="lang-card__stat-val"
                      style={{ color: dueCount > 0 ? 'var(--crimson-400)' : 'var(--verdant-400)' }}
                    >
                      {dueCount}
                    </span>
                    <span className="lang-card__stat-lbl">pendientes</span>
                  </div>
                  <div className="lang-card__stat">
                    <span className="lang-card__stat-val">{decks.length}</span>
                    <span className="lang-card__stat-lbl">mazos</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section className="quick-actions">
        <div className="section-header">
          <h2 className="section-title">Acciones rápidas</h2>
        </div>
        <div className="quick-grid">
          <a href="/lectura" className="quick-btn">
            <BookOpen size={18} strokeWidth={1.5} />
            <span>Lectura</span>
          </a>
          <a href="/examen" className="quick-btn">
            <Target size={18} strokeWidth={1.5} />
            <span>Examen CEFR</span>
          </a>
          <a href="/importar" className="quick-btn">
            <Plus size={18} strokeWidth={1.5} />
            <span>Importar mazo</span>
          </a>
          <a href="/gramatica" className="quick-btn">
            <Clock size={18} strokeWidth={1.5} />
            <span>Gramática</span>
          </a>
        </div>
      </section>

      <style>{`
        .home {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          padding-bottom: 1rem;
          animation: fadeIn 300ms ease both;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .home-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }

        .home-loading__dots {
          display: flex;
          gap: 6px;
        }

        .home-loading__dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--verdant-600);
          animation: pulseDot 1.2s ease-in-out infinite;
        }

        .home-loading__dots span:nth-child(2) { animation-delay: 0.2s; }
        .home-loading__dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }

        /* Header */
        .home-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-top: 0.5rem;
        }

        .home-greeting {
          font-size: 13px;
          color: var(--text-muted) !important;
          margin-bottom: 2px;
        }

        .home-title {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 400;
          line-height: 1;
          letter-spacing: -0.01em;
        }

        .home-title__display { color: var(--text-primary); }
        .home-title__display--accent { color: var(--verdant-500); font-style: italic; }

        .home-settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 0.5px solid var(--border-default);
          color: var(--text-muted);
          text-decoration: none;
          transition: color 150ms, background 150ms;
          margin-top: 4px;
        }

        .home-settings-btn:hover { color: var(--text-primary); background: var(--bg-card); }

        /* Stats */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .stat-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: 14px;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }

        .stat-card__icon { margin-bottom: 2px; }
        .stat-card__icon--flame { color: var(--ember-400); }
        .stat-card__icon--book { color: var(--lucid-400); }
        .stat-card__icon--target { color: var(--verdant-400); }
        .stat-card__icon--clock { color: var(--gold-400); }

        .stat-card__value {
          font-family: var(--font-mono);
          font-size: 1.2rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-card__label {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1;
        }

        /* CTA Banner */
        .cta-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(13,148,136,0.18), rgba(45,212,191,0.08));
          border: 0.5px solid rgba(45,212,191,0.25);
          border-radius: 16px;
          text-decoration: none;
          transition: background 200ms;
          color: inherit;
        }

        .cta-banner:hover {
          background: linear-gradient(135deg, rgba(13,148,136,0.25), rgba(45,212,191,0.12));
        }

        .cta-banner__title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary) !important;
          margin-bottom: 2px;
        }

        .cta-banner__sub {
          font-size: 12px;
          color: var(--text-muted) !important;
        }

        /* Section */
        .section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .section-link {
          font-size: 12px;
          color: var(--verdant-500);
          text-decoration: none;
          transition: color 150ms;
        }

        .section-link:hover { color: var(--verdant-400); }

        /* Lang cards */
        .lang-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lang-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 1rem 1.25rem;
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          transition: border-color 150ms, background 150ms;
        }

        .lang-card:hover { border-color: var(--border-strong); background: var(--bg-elevated); }

        .lang-card--ru { border-left: 2px solid var(--ember-500); }
        .lang-card--de { border-left: 2px solid var(--gold-500); }
        .lang-card--en { border-left: 2px solid var(--lucid-500); }

        .lang-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lang-card__name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lang-card__name {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .lang-card__badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 400;
        }

        .lang-card__badge--ru {
          background: var(--lang-ru-bg);
          color: var(--lang-ru);
          border: 0.5px solid var(--lang-ru-border);
        }

        .lang-card__badge--de {
          background: var(--lang-de-bg);
          color: var(--lang-de);
          border: 0.5px solid var(--lang-de-border);
        }

        .lang-card__badge--en {
          background: var(--lang-en-bg);
          color: var(--lang-en);
          border: 0.5px solid var(--lang-en-border);
        }

        .lang-card__stats {
          display: flex;
          gap: 1.5rem;
        }

        .lang-card__stat {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .lang-card__stat-val {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1;
        }

        .lang-card__stat-lbl {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Quick actions */
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 8px;
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: 14px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 11px;
          text-align: center;
          transition: color 150ms, background 150ms, border-color 150ms;
          -webkit-tap-highlight-color: transparent;
        }

        .quick-btn:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
          border-color: var(--border-strong);
        }

        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          .lang-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  )
}

function calculateStreak(activity: DailyActivity[]): number {
  if (activity.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sorted = [...activity]
    .sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  const check = new Date(today)

  for (const day of sorted) {
    const dayDate = new Date(day.date + 'T00:00:00')
    const diff = Math.round((check.getTime() - dayDate.getTime()) / 86400000)

    if (diff > 1) break
    if (day.cardsReviewed > 0) {
      streak++
      check.setDate(check.getDate() - 1)
    }
  }

  return streak
}
