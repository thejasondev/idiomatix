/* ──────────────────────────────────────────────────────────────
   LecturaClient — Modo lectura con textos graduados
   · Selección por idioma + nivel
   · Toca cualquier palabra → añadir al mazo personalizado
   · TTS por párrafo completo
   · Panel de vocabulario clave
   · Input comprensible i+1 (Krashen)
────────────────────────────────────────────────────────────── */

import { useState, useCallback, useRef } from 'react'
import {
  BookOpen, Volume2, Plus, Check,
  ChevronLeft, Clock, Hash,
} from 'lucide-react'
import { SectionHeader, Badge, Button, Modal } from '@/components/ui'
import { speak, isTTSSupported } from '@/lib/tts'
import { getReadingTexts, type ReadingText } from '@/data/reading-texts'
import { db } from '@/db'
import { generateId } from '@/utils'
import { useUIStore } from '@/stores'
import { LANGUAGES, CEFR_LEVELS, type LanguageCode, type CEFRLevel } from '@/types'

type View = 'browser' | 'reading'

export default function LecturaClient() {
  const [selectedLang,  setSelectedLang]  = useState<LanguageCode>('ru')
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all')
  const [activeText,    setActiveText]    = useState<ReadingText | null>(null)
  const [view,          setView]          = useState<View>('browser')

  const texts = getReadingTexts(
    selectedLang,
    selectedLevel === 'all' ? undefined : selectedLevel
  )

  const handleOpen = (text: ReadingText) => {
    setActiveText(text)
    setView('reading')
  }

  if (view === 'reading' && activeText) {
    return (
      <ReadingView
        text={activeText}
        onBack={() => { setView('browser'); setActiveText(null) }}
      />
    )
  }

  return (
    <div className="lec-page">
      <SectionHeader
        title="Lectura"
        description="Input comprensible · Toca palabras para añadirlas a tu mazo"
      />

      {/* Language tabs */}
      <div className="lec-lang-tabs">
        {(['ru', 'de', 'en'] as LanguageCode[]).map(lang => (
          <button
            key={lang}
            className={`lec-lang-tab ${selectedLang === lang ? `lec-lang-tab--active lec-lang-tab--${lang}` : ''}`}
            onClick={() => setSelectedLang(lang)}
            type="button"
          >
            {LANGUAGES[lang].name}
          </button>
        ))}
      </div>

      {/* Level filter */}
      <div className="lec-level-tabs">
        <button
          className={`lec-lvl-tab ${selectedLevel === 'all' ? 'lec-lvl-tab--active' : ''}`}
          onClick={() => setSelectedLevel('all')} type="button">
          Todos
        </button>
        {CEFR_LEVELS.map(lvl => (
          <button
            key={lvl}
            className={`lec-lvl-tab ${selectedLevel === lvl ? 'lec-lvl-tab--active' : ''}`}
            onClick={() => setSelectedLevel(lvl)} type="button">
            {lvl}
          </button>
        ))}
      </div>

      {/* Text cards */}
      {texts.length === 0 ? (
        <div className="lec-empty">
          <BookOpen size={32} strokeWidth={1} />
          <p>No hay textos para esta selección todavía.</p>
        </div>
      ) : (
        <div className="lec-grid">
          {texts.map(text => (
            <button
              key={text.id}
              className={`lec-card lec-card--${text.lang}`}
              onClick={() => handleOpen(text)}
              type="button"
            >
              <div className="lec-card__meta">
                <Badge variant={text.lang}>{LANGUAGES[text.lang].name}</Badge>
                <Badge variant="level">{text.level}</Badge>
              </div>
              <h3 className="lec-card__title">{text.title}</h3>
              {text.subtitle && <p className="lec-card__subtitle">{text.subtitle}</p>}
              <div className="lec-card__stats">
                <span><Hash size={11} />{text.wordCount} palabras</span>
                <span><Clock size={11} />{text.readingTimeMin} min</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  )
}

// ─── Reading view ─────────────────────────────────────────────

function ReadingView({ text, onBack }: { text: ReadingText; onBack: () => void }) {
  const [addedWords,  setAddedWords]  = useState<Set<string>>(new Set())
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [addModal,    setAddModal]    = useState(false)
  const { showToast } = useUIStore()
  const ttsSupported = isTTSSupported()

  const paragraphs = text.body.split('\n\n').filter(Boolean)

  const handleWordTap = useCallback((word: string) => {
    const clean = word.replace(/[.,;:!?«»"']/g, '').trim()
    if (!clean) return
    setSelectedWord(clean)
    setAddModal(true)
  }, [])

  const handleAddWord = useCallback(async (word: string) => {
    try {
      // Find or create a "Lectura" deck for this language
      let deck = await db.decks
        .where('lang').equals(text.lang)
        .filter(d => d.source === 'custom' && d.name === `Lectura — ${LANGUAGES[text.lang].name}`)
        .first()

      if (!deck) {
        const now = Date.now()
        const deckId = generateId()
        deck = {
          id: deckId,
          name: `Lectura — ${LANGUAGES[text.lang].name}`,
          description: `Palabras recogidas del modo lectura.`,
          lang: text.lang,
          level: text.level,
          source: 'custom',
          cardCount: 0,
          tags: ['lectura'],
          createdAt: now,
          updatedAt: now,
        }
        await db.decks.add(deck)
      }

      const now = Date.now()
      await db.cards.add({
        id: generateId(),
        deckId: deck.id,
        lang: text.lang,
        level: text.level,
        front: word,
        back: '—',  // User fills in translation later
        tags: ['lectura', text.id],
        createdAt: now,
        updatedAt: now,
      })

      setAddedWords(prev => new Set([...prev, word]))
      showToast(`"${word}" añadida al mazo de Lectura`, 'success')
    } catch (err) {
      showToast('Error al añadir la palabra', 'error')
    } finally {
      setAddModal(false)
      setSelectedWord(null)
    }
  }, [text.lang, text.level, text.id, showToast])

  const handleSpeakParagraph = useCallback((para: string) => {
    speak(para, text.lang)
  }, [text.lang])

  return (
    <div className="rv-page">
      <button className="rv-back" onClick={onBack} type="button">
        <ChevronLeft size={14} /> Textos
      </button>

      {/* Header */}
      <div className="rv-header">
        <div className="rv-header__badges">
          <Badge variant={text.lang}>{LANGUAGES[text.lang].name}</Badge>
          <Badge variant="level">{text.level}</Badge>
          <span className="rv-read-time"><Clock size={11} />{text.readingTimeMin} min</span>
        </div>
        <h1 className="rv-title">{text.title}</h1>
        {text.subtitle && <p className="rv-subtitle">{text.subtitle}</p>}
        <p className="rv-hint">Toca cualquier palabra para añadirla a tu mazo</p>
      </div>

      {/* Paragraphs */}
      <div className="rv-body">
        {paragraphs.map((para, pi) => (
          <div key={pi} className="rv-para">
            <p className="rv-para__text">
              {para.split(/(\s+)/).map((chunk, ci) => {
                if (/^\s+$/.test(chunk)) return chunk
                const clean = chunk.replace(/[.,;:!?«»"']/g, '')
                const added = addedWords.has(clean)
                return (
                  <span
                    key={ci}
                    className={`rv-word ${added ? 'rv-word--added' : ''}`}
                    onClick={() => handleWordTap(chunk)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') handleWordTap(chunk) }}
                    aria-label={`Añadir "${clean}" al mazo`}
                  >
                    {chunk}
                    {added && <span className="rv-word__check" aria-hidden>✓</span>}
                  </span>
                )
              })}
            </p>
            {ttsSupported && (
              <button
                className="rv-para__tts"
                onClick={() => handleSpeakParagraph(para)}
                type="button"
                aria-label="Escuchar este párrafo"
              >
                <Volume2 size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Key vocabulary panel */}
      {text.keyWords.length > 0 && (
        <div className="rv-vocab">
          <p className="rv-vocab__title">Vocabulario clave</p>
          <div className="rv-vocab__list">
            {text.keyWords.map((kw, i) => (
              <div key={i} className="rv-vocab__item">
                <span className={`rv-vocab__word rv-vocab__word--${text.lang}`}>{kw.word}</span>
                {kw.phonetic && (
                  <span className="rv-vocab__phonetic">{kw.phonetic}</span>
                )}
                <span className="rv-vocab__trans">{kw.translation}</span>
                <button
                  className={`rv-vocab__add ${addedWords.has(kw.word) ? 'rv-vocab__add--done' : ''}`}
                  onClick={() => handleAddWord(kw.word)}
                  disabled={addedWords.has(kw.word)}
                  type="button"
                  aria-label={`Añadir ${kw.word}`}
                >
                  {addedWords.has(kw.word)
                    ? <Check size={12} strokeWidth={2.5} />
                    : <Plus  size={12} strokeWidth={2} />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add word modal */}
      <Modal
        open={addModal}
        onClose={() => { setAddModal(false); setSelectedWord(null) }}
        title="Añadir al mazo"
      >
        <div className="rv-modal">
          <p className="rv-modal__word">{selectedWord}</p>
          <p className="rv-modal__hint">
            Esta palabra se añadirá al mazo "<strong>Lectura — {LANGUAGES[text.lang].name}</strong>".
            Puedes editar la traducción después en Vocabulario.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => { setAddModal(false); setSelectedWord(null) }} fullWidth>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedWord && handleAddWord(selectedWord)}
              fullWidth
              disabled={addedWords.has(selectedWord ?? '')}
            >
              <Plus size={14} /> Añadir
            </Button>
          </div>
        </div>
      </Modal>

      <style>{STYLES}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .lec-page, .rv-page { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 250ms ease; padding-bottom: 1rem; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .lec-lang-tabs, .lec-level-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .lec-lang-tabs::-webkit-scrollbar, .lec-level-tabs::-webkit-scrollbar { display: none; }

  .lec-lang-tab {
    flex-shrink: 0; padding: 7px 16px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-default);
    background: transparent; font-family: var(--font-body); font-size: 13px;
    color: var(--text-secondary); cursor: pointer; transition: all 150ms;
  }
  .lec-lang-tab:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .lec-lang-tab--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }
  .lec-lang-tab--ru.lec-lang-tab--active { color: var(--lang-ru); border-color: var(--lang-ru-border); background: var(--lang-ru-bg); }
  .lec-lang-tab--de.lec-lang-tab--active { color: var(--lang-de); border-color: var(--lang-de-border); background: var(--lang-de-bg); }
  .lec-lang-tab--en.lec-lang-tab--active { color: var(--lang-en); border-color: var(--lang-en-border); background: var(--lang-en-bg); }

  .lec-lvl-tab {
    flex-shrink: 0; padding: 5px 12px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-subtle);
    background: transparent; font-family: var(--font-mono); font-size: 11px;
    color: var(--text-muted); cursor: pointer; transition: all 150ms;
  }
  .lec-lvl-tab:hover { color: var(--text-secondary); border-color: var(--border-default); }
  .lec-lvl-tab--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }

  .lec-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 3rem 1rem; color: var(--text-muted); text-align: center; }

  .lec-grid { display: flex; flex-direction: column; gap: 8px; }

  .lec-card {
    display: flex; flex-direction: column; gap: 6px; text-align: left;
    padding: 1rem 1.25rem;
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg); cursor: pointer; width: 100%;
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .lec-card:hover { border-color: var(--border-strong); background: var(--bg-elevated); }
  .lec-card--ru { border-left: 2px solid var(--ember-500); }
  .lec-card--de { border-left: 2px solid var(--gold-500); }
  .lec-card--en { border-left: 2px solid var(--lucid-500); }
  .lec-card__meta { display: flex; gap: 5px; flex-wrap: wrap; }
  .lec-card__title { font-size: 15px; font-weight: 500; color: var(--text-primary); }
  .lec-card__subtitle { font-size: 12px; color: var(--text-muted); font-style: italic; }
  .lec-card__stats { display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px; }
  .lec-card__stats span { display: flex; align-items: center; gap: 3px; }

  /* Reading view */
  .rv-back { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; transition: color 150ms; width: fit-content; }
  .rv-back:hover { color: var(--text-primary); }

  .rv-header { display: flex; flex-direction: column; gap: 6px; padding-bottom: 1rem; border-bottom: 0.5px solid var(--border-subtle); }
  .rv-header__badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .rv-read-time { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
  .rv-title { font-size: 1.3rem; font-weight: 600; color: var(--text-primary); }
  .rv-subtitle { font-size: 13px; color: var(--text-muted); font-style: italic; }
  .rv-hint { font-size: 11px; color: var(--text-muted); background: var(--bg-elevated); padding: 5px 10px; border-radius: var(--radius-md); border-left: 2px solid var(--verdant-700); display: inline-block; margin-top: 2px; }

  .rv-body { display: flex; flex-direction: column; gap: 1.25rem; }
  .rv-para { position: relative; }
  .rv-para__text { font-size: 1rem; color: var(--text-primary) !important; line-height: 1.85; padding-right: 2rem; }
  .rv-para__tts {
    position: absolute; top: 0; right: 0;
    width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
    border-radius: 7px; border: 0.5px solid var(--border-default);
    background: var(--bg-elevated); color: var(--text-muted); cursor: pointer;
    transition: color 150ms, background 150ms;
  }
  .rv-para__tts:hover { color: var(--verdant-400); background: rgba(45,212,191,0.08); }

  /* Interactive words */
  .rv-word {
    cursor: pointer; position: relative; display: inline;
    border-radius: 3px; padding: 0 1px;
    transition: background 150ms, color 150ms;
  }
  .rv-word:hover { background: rgba(45,212,191,0.12); color: var(--verdant-300); }
  .rv-word--added { color: var(--verdant-400); background: rgba(45,212,191,0.08); }
  .rv-word__check { font-size: 9px; vertical-align: super; color: var(--verdant-500); margin-left: 1px; }

  /* Key vocab panel */
  .rv-vocab { background: var(--bg-card); border: 0.5px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
  .rv-vocab__title { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); padding: 10px 14px 8px; border-bottom: 0.5px solid var(--border-subtle); font-family: var(--font-mono); }
  .rv-vocab__list { display: flex; flex-direction: column; }
  .rv-vocab__item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-bottom: 0.5px solid var(--border-subtle); }
  .rv-vocab__item:last-child { border-bottom: none; }
  .rv-vocab__word { font-size: 13px; font-weight: 500; min-width: 100px; flex-shrink: 0; }
  .rv-vocab__word--ru { color: var(--lang-ru); }
  .rv-vocab__word--de { color: var(--lang-de); }
  .rv-vocab__word--en { color: var(--lang-en); }
  .rv-vocab__phonetic { font-family: var(--font-mono); font-size: 10px; color: var(--verdant-400); flex-shrink: 0; }
  .rv-vocab__trans { font-size: 12px; color: var(--text-muted); flex: 1; }
  .rv-vocab__add {
    width: 26px; height: 26px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 7px; border: 0.5px solid var(--border-default);
    background: transparent; color: var(--text-muted); cursor: pointer;
    transition: all 150ms;
  }
  .rv-vocab__add:hover:not(:disabled) { background: rgba(45,212,191,0.1); color: var(--verdant-400); border-color: rgba(45,212,191,0.3); }
  .rv-vocab__add--done { background: rgba(45,212,191,0.08); color: var(--verdant-400); border-color: rgba(45,212,191,0.25); cursor: default; }

  /* Add modal */
  .rv-modal { display: flex; flex-direction: column; gap: 14px; }
  .rv-modal__word { font-family: var(--font-display); font-size: 1.5rem; color: var(--text-primary); text-align: center; padding: 8px 0; }
  .rv-modal__hint { font-size: 13px; color: var(--text-muted); line-height: 1.5; text-align: center; }
`
