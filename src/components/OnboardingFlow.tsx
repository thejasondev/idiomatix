/* ──────────────────────────────────────────────────────────────
   OnboardingFlow — Primera experiencia del usuario
   Aparece solo si nunca se ha completado el onboarding.
   Selección de idiomas + nivel CEFR → personaliza el dashboard.
────────────────────────────────────────────────────────────── */

import { useState, useCallback } from 'react'
import { Globe, ChevronRight, Check, Sparkles } from 'lucide-react'
import { LANGUAGES, CEFR_LEVELS, CEFR_LABELS, type LanguageCode, type CEFRLevel } from '@/types'
import { useSettingsStore } from '@/stores'
import { Button } from '@/components/ui'

interface Props {
  onComplete: () => void
}

const LANG_ENTRIES = Object.values(LANGUAGES)

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<'welcome' | 'langs' | 'level'>('welcome')
  const [selectedLangs, setSelectedLangs] = useState<LanguageCode[]>([])
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1')
  const { toggleLanguage, setDefaultLang } = useSettingsStore()

  const handleToggleLang = useCallback((lang: LanguageCode) => {
    setSelectedLangs(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    )
  }, [])

  const handleFinish = useCallback(() => {
    // Apply selections to store
    selectedLangs.forEach(lang => toggleLanguage(lang))
    if (selectedLangs.length > 0) setDefaultLang(selectedLangs[0]!)

    // Mark onboarding as complete
    localStorage.setItem('idiomatix-onboarded', 'true')
    onComplete()
  }, [selectedLangs, selectedLevel, toggleLanguage, setDefaultLang, onComplete])

  return (
    <>
      <div className="ob-overlay">
        <div className="ob-card">
          {/* ── Step 1: Welcome ── */}
          {step === 'welcome' && (
            <div className="ob-step ob-step--welcome">
              <div className="ob-icon-wrap">
                <Sparkles size={32} strokeWidth={1.5} />
              </div>
              <h1 className="ob-heading">
                Bienvenido a <em>Idiomatix</em>
              </h1>
              <p className="ob-desc">
                Tu plataforma personal de aprendizaje de idiomas. Offline-first, 
                con repetición espaciada y ejercicios interactivos.
              </p>
              <Button onClick={() => setStep('langs')} fullWidth>
                Comenzar <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* ── Step 2: Language selection ── */}
          {step === 'langs' && (
            <div className="ob-step">
              <Globe size={24} strokeWidth={1.5} className="ob-step-icon" />
              <h2 className="ob-heading-sm">¿Qué idiomas quieres aprender?</h2>
              <p className="ob-hint">Selecciona uno o más</p>

              <div className="ob-lang-grid">
                {LANG_ENTRIES.map(lang => {
                  const active = selectedLangs.includes(lang.code)
                  return (
                    <button
                      key={lang.code}
                      className={`ob-lang-card ${active ? 'ob-lang-card--active' : ''}`}
                      onClick={() => handleToggleLang(lang.code)}
                      type="button"
                    >
                      <span className="ob-lang-flag">{lang.flag}</span>
                      <span className="ob-lang-name">{lang.name}</span>
                      <span className="ob-lang-native">{lang.nativeName}</span>
                      {active && (
                        <span className="ob-lang-check">
                          <Check size={14} strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <Button
                onClick={() => setStep('level')}
                disabled={selectedLangs.length === 0}
                fullWidth
              >
                Continuar <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* ── Step 3: Level selection ── */}
          {step === 'level' && (
            <div className="ob-step">
              <h2 className="ob-heading-sm">¿Cuál es tu nivel actual?</h2>
              <p className="ob-hint">Puedes cambiar esto después en Ajustes</p>

              <div className="ob-level-grid">
                {CEFR_LEVELS.map(level => (
                  <button
                    key={level}
                    className={`ob-level-btn ${selectedLevel === level ? 'ob-level-btn--active' : ''}`}
                    onClick={() => setSelectedLevel(level)}
                    type="button"
                  >
                    <span className="ob-level-code">{level}</span>
                    <span className="ob-level-label">{CEFR_LABELS[level]}</span>
                  </button>
                ))}
              </div>

              <Button onClick={handleFinish} fullWidth>
                Empezar a aprender <Sparkles size={16} />
              </Button>
            </div>
          )}

          {/* Step indicator dots */}
          <div className="ob-dots">
            {(['welcome', 'langs', 'level'] as const).map(s => (
              <span
                key={s}
                className={`ob-dot ${step === s ? 'ob-dot--active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ob-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(13, 15, 18, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.5rem;
          animation: obFadeIn 400ms ease;
        }

        @keyframes obFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .ob-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-surface);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: 2rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: obSlideUp 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes obSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ob-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .ob-step--welcome { gap: 16px; }

        .ob-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(45, 212, 191, 0.12);
          border: 0.5px solid rgba(45, 212, 191, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--verdant-400);
        }

        .ob-step-icon { color: var(--verdant-400); }

        .ob-heading {
          font-family: var(--font-display);
          font-size: 1.6rem;
          line-height: 1.2;
          color: var(--text-primary);
        }
        .ob-heading em {
          font-style: italic;
          color: var(--verdant-500);
        }

        .ob-heading-sm {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ob-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 320px;
        }

        .ob-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* ── Language cards ── */
        .ob-lang-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          margin: 4px 0;
        }

        .ob-lang-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 6px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color 200ms, background 200ms, transform 150ms;
          -webkit-tap-highlight-color: transparent;
        }

        .ob-lang-card:hover {
          background: var(--bg-elevated);
        }

        .ob-lang-card--active {
          border-color: var(--verdant-500);
          background: rgba(45, 212, 191, 0.08);
        }

        .ob-lang-flag { font-size: 1.6rem; line-height: 1; }
        .ob-lang-name { font-size: 12px; font-weight: 500; color: var(--text-primary); }
        .ob-lang-native { font-size: 10px; color: var(--text-muted); }

        .ob-lang-check {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--verdant-500);
          color: var(--bg-base);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: obPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes obPop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        /* ── Level buttons ── */
        .ob-level-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          margin: 4px 0;
        }

        .ob-level-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 12px 6px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color 200ms, background 200ms;
          -webkit-tap-highlight-color: transparent;
        }

        .ob-level-btn:hover { background: var(--bg-elevated); }

        .ob-level-btn--active {
          border-color: var(--verdant-500);
          background: rgba(45, 212, 191, 0.08);
        }

        .ob-level-code {
          font-family: var(--font-mono);
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .ob-level-btn--active .ob-level-code { color: var(--verdant-400); }

        .ob-level-label {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* ── Step dots ── */
        .ob-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding-top: 4px;
        }

        .ob-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--border-strong);
          transition: background 200ms, width 200ms;
        }

        .ob-dot--active {
          width: 18px;
          border-radius: 3px;
          background: var(--verdant-500);
        }
      `}</style>
    </>
  )
}
