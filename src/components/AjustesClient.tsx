/* ──────────────────────────────────────────────────────────────
   AjustesClient — Página de configuración
   Tema · SRS · Audio · Idiomas · Datos
────────────────────────────────────────────────────────────── */

import { useState } from 'react'
import { Moon, Sun, Monitor, Volume2, VolumeX, BookOpen, Download, Trash2, Info } from 'lucide-react'
import { SectionHeader, Button, Modal } from '@/components/ui'
import { useTheme } from '@/hooks'
import { useSettingsStore, useUIStore } from '@/stores'
import { db } from '@/db'
import { LANGUAGES, type LanguageCode, type Theme } from '@/types'

export default function AjustesClient() {
  const { theme, setTheme } = useTheme()
  const {
    newCardsPerDay, setNewCardsPerDay,
    reviewsPerDay, setReviewsPerDay,
    autoPlayAudio, setAutoPlayAudio,
    showPhonetic, setShowPhonetic,
  } = useSettingsStore()
  const { showToast } = useUIStore()

  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleExportData = async () => {
    try {
      const [decks, cards, reviews, sessions, activity] = await Promise.all([
        db.decks.toArray(),
        db.cards.toArray(),
        db.reviews.toArray(),
        db.sessions.toArray(),
        db.dailyActivity.toArray(),
      ])
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), decks, cards, reviews, sessions, activity }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `idiomatix-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Datos exportados correctamente', 'success')
    } catch {
      showToast('Error al exportar datos', 'error')
    }
  }

  const handleResetProgress = async () => {
    setResetting(true)
    try {
      await db.reviews.clear()
      await db.sessions.clear()
      await db.dailyActivity.clear()
      showToast('Progreso reiniciado', 'success')
    } catch {
      showToast('Error al reiniciar', 'error')
    } finally {
      setResetting(false)
      setResetOpen(false)
    }
  }

  return (
    <div className="aj-page">
      <SectionHeader title="Ajustes" />

      {/* Appearance */}
      <SettingsSection title="Apariencia">
        <SettingsRow label="Tema" description="Elige entre modo oscuro, claro o según el sistema">
          <div className="theme-picker">
            {([['dark','Oscuro',Moon], ['light','Claro',Sun], ['system','Sistema',Monitor]] as [Theme,string,React.ComponentType<{size?:number}>][]).map(([value, label, Icon]) => (
              <button
                key={value}
                className={`theme-btn ${theme === value ? 'theme-btn--active' : ''}`}
                onClick={() => setTheme(value)}
                type="button"
                aria-pressed={theme === value}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* SRS */}
      <SettingsSection title="Estudio">
        <SettingsRow label="Tarjetas nuevas por día" description="Cuántas tarjetas nuevas introduces cada día">
          <div className="num-input">
            <button className="num-btn" onClick={() => setNewCardsPerDay(Math.max(1, newCardsPerDay - 5))} type="button" aria-label="Reducir">−</button>
            <span className="num-val">{newCardsPerDay}</span>
            <button className="num-btn" onClick={() => setNewCardsPerDay(Math.min(100, newCardsPerDay + 5))} type="button" aria-label="Aumentar">+</button>
          </div>
        </SettingsRow>
        <SettingsRow label="Revisiones máximas por día" description="Límite de revisiones diarias (tarjetas ya estudiadas)">
          <div className="num-input">
            <button className="num-btn" onClick={() => setReviewsPerDay(Math.max(10, reviewsPerDay - 10))} type="button" aria-label="Reducir">−</button>
            <span className="num-val">{reviewsPerDay}</span>
            <button className="num-btn" onClick={() => setReviewsPerDay(Math.min(500, reviewsPerDay + 10))} type="button" aria-label="Aumentar">+</button>
          </div>
        </SettingsRow>
        <SettingsRow label="Mostrar fonética" description="Muestra la transcripción fonética en las tarjetas">
          <Toggle value={showPhonetic} onChange={setShowPhonetic} />
        </SettingsRow>
      </SettingsSection>

      {/* Audio */}
      <SettingsSection title="Audio">
        <SettingsRow
          label="Reproducción automática"
          description="Escucha la pronunciación automáticamente al abrir cada tarjeta"
          icon={autoPlayAudio ? <Volume2 size={15} /> : <VolumeX size={15} />}
        >
          <Toggle value={autoPlayAudio} onChange={setAutoPlayAudio} />
        </SettingsRow>
        <div className="aj-info-note">
          <Info size={13} />
          <p>La pronunciación usa la Web Speech API del navegador. Requiere voces instaladas en el sistema para Ruso y Alemán.</p>
        </div>
      </SettingsSection>

      {/* Data */}
      <SettingsSection title="Datos">
        <SettingsRow label="Exportar todos los datos" description="Descarga una copia de tus mazos y progreso en JSON">
          <Button variant="subtle" size="sm" onClick={handleExportData}>
            <Download size={13} /> Exportar
          </Button>
        </SettingsRow>
        <SettingsRow label="Reiniciar progreso" description="Elimina todo el historial de revisiones. Los mazos se conservan.">
          <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
            <Trash2 size={13} /> Reiniciar
          </Button>
        </SettingsRow>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="Acerca de">
        <div className="aj-about">
          <div className="aj-about__logo">
            <span className="aj-about__name">Idiom<em>atix</em></span>
            <span className="aj-about__version">v0.1.0 · offline-first PWA</span>
          </div>
          <p className="aj-about__desc">
            Plataforma personal de aprendizaje de idiomas. Todos tus datos se guardan localmente en tu dispositivo.
            Sin cuenta. Sin servidor. Sin costo.
          </p>
          <div className="aj-about__langs">
            {(['ru','de','en'] as LanguageCode[]).map(lang => (
              <span key={lang} className={`aj-lang-chip aj-lang-chip--${lang}`}>
                {LANGUAGES[lang].nativeName}
              </span>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Reset confirmation modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="¿Reiniciar progreso?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Esto eliminará todo tu historial de revisiones, sesiones y racha. Tus mazos y tarjetas se conservarán, pero empezarás desde cero con el algoritmo SM-2.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setResetOpen(false)} fullWidth>Cancelar</Button>
            <Button variant="danger" onClick={handleResetProgress} loading={resetting} fullWidth>Sí, reiniciar</Button>
          </div>
        </div>
      </Modal>

      <style>{STYLES}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="aj-section">
      <p className="aj-section-label">{title}</p>
      <div className="aj-section-content">{children}</div>
    </section>
  )
}

function SettingsRow({ label, description, icon, children }: {
  label: string; description?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="aj-row">
      <div className="aj-row__left">
        {icon && <span className="aj-row__icon">{icon}</span>}
        <div>
          <p className="aj-row__label">{label}</p>
          {description && <p className="aj-row__desc">{description}</p>}
        </div>
      </div>
      <div className="aj-row__right">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle ${value ? 'toggle--on' : ''}`}
      onClick={() => onChange(!value)}
      type="button"
      role="switch"
      aria-checked={value}
    >
      <span className="toggle__thumb" />
      <style>{`
        .toggle {
          width: 44px; height: 26px; border-radius: 13px;
          border: none; cursor: pointer; position: relative;
          background: var(--bg-elevated); border: 0.5px solid var(--border-default);
          transition: background 200ms, border-color 200ms;
          flex-shrink: 0;
        }
        .toggle--on { background: var(--verdant-600); border-color: var(--verdant-600); }
        .toggle__thumb {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--text-muted);
          transition: transform 200ms ease, background 200ms;
        }
        .toggle--on .toggle__thumb { transform: translateX(18px); background: white; }
      `}</style>
    </button>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .aj-page { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .aj-section { display: flex; flex-direction: column; gap: 8px; }
  .aj-section-label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-family: var(--font-mono); padding-left: 2px; }
  .aj-section-content { background: var(--bg-card); border: 0.5px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }

  .aj-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 13px 16px; border-bottom: 0.5px solid var(--border-subtle);
  }
  .aj-row:last-child { border-bottom: none; }
  .aj-row__left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .aj-row__icon { color: var(--text-muted); flex-shrink: 0; }
  .aj-row__label { font-size: 14px; color: var(--text-primary); }
  .aj-row__desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-top: 2px; }
  .aj-row__right { flex-shrink: 0; }

  .theme-picker { display: flex; gap: 4px; }
  .theme-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: var(--radius-md);
    border: 0.5px solid var(--border-default);
    background: transparent; color: var(--text-muted);
    font-family: var(--font-body); font-size: 12px;
    cursor: pointer; transition: all 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .theme-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .theme-btn--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }

  .num-input { display: flex; align-items: center; gap: 8px; }
  .num-btn {
    width: 28px; height: 28px; border-radius: 8px;
    border: 0.5px solid var(--border-default);
    background: var(--bg-elevated); color: var(--text-primary);
    font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 150ms;
  }
  .num-btn:hover { background: var(--border-strong); }
  .num-val { font-family: var(--font-mono); font-size: 14px; font-weight: 500; color: var(--text-primary); min-width: 32px; text-align: center; }

  .aj-info-note {
    display: flex; gap: 8px; align-items: flex-start;
    padding: 10px 16px;
    color: var(--text-muted); font-size: 12px; line-height: 1.5;
    border-top: 0.5px solid var(--border-subtle);
  }
  .aj-info-note svg { flex-shrink: 0; margin-top: 1px; }

  .aj-about { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .aj-about__logo { display: flex; flex-direction: column; gap: 3px; }
  .aj-about__name { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--text-primary); }
  .aj-about__name em { font-style: italic; color: var(--verdant-500); }
  .aj-about__version { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
  .aj-about__desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
  .aj-about__langs { display: flex; gap: 6px; flex-wrap: wrap; }
  .aj-lang-chip { font-size: 12px; padding: 3px 10px; border-radius: var(--radius-full); }
  .aj-lang-chip--ru { background: var(--lang-ru-bg); color: var(--lang-ru); }
  .aj-lang-chip--de { background: var(--lang-de-bg); color: var(--lang-de); }
  .aj-lang-chip--en { background: var(--lang-en-bg); color: var(--lang-en); }
`
