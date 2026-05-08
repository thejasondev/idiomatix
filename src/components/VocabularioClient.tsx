/* ──────────────────────────────────────────────────────────────
   VocabularioClient — Explorador de mazos y tarjetas
   Lista mazos → abre mazo → ve tarjetas → añade/borra
────────────────────────────────────────────────────────────── */

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, Download, BookOpen, ChevronRight, Search, X } from 'lucide-react'
import { SectionHeader, Badge, Button, Modal, EmptyState } from '@/components/ui'
import { useAppInit, useDeckStats } from '@/hooks'
import { db } from '@/db'
import { exportDeckAsJSON } from '@/lib/importer'
import { LANGUAGES, type VocabCard, type Deck } from '@/types'


type View = 'decks' | 'cards'

export default function VocabularioClient() {
  const { ready } = useAppInit()
  const [view, setView] = useState<View>('decks')
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const decks = useLiveQuery(() => db.decks.toArray(), [])

  const cards = useLiveQuery(
    () => activeDeck
      ? db.cards.where('deckId').equals(activeDeck.id).toArray()
      : Promise.resolve([] as VocabCard[]),
    [activeDeck?.id]
  )

  const filtered = (cards ?? []).filter(c =>
    !search || c.front.toLowerCase().includes(search.toLowerCase()) ||
    c.back.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenDeck = (deck: Deck) => {
    setActiveDeck(deck)
    setView('cards')
    setSearch('')
  }

  const handleBack = () => {
    setView('decks')
    setActiveDeck(null)
  }

  const handleDeleteDeck = useCallback(async (deck: Deck) => {
    if (!confirm(`¿Eliminar el mazo "${deck.name}" y todas sus tarjetas?`)) return
    await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
      await db.cards.where('deckId').equals(deck.id).delete()
      await db.reviews.where('deckId').equals(deck.id).delete()
      await db.decks.delete(deck.id)
    })
    setView('decks')
    setActiveDeck(null)
  }, [])

  const handleExport = useCallback(async (deck: Deck) => {
    const deckCards = await db.cards.where('deckId').equals(deck.id).toArray()
    const json = exportDeckAsJSON(deck, deckCards)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deck.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleDeleteCard = useCallback(async (cardId: string) => {
    await db.cards.delete(cardId)
    await db.reviews.where('cardId').equals(cardId).delete()
  }, [])

  if (!ready || !decks) return <PageLoader />

  // ── Cards view ─────────────────────────────────────────────
  if (view === 'cards' && activeDeck) {
    return (
      <div className="vocab-page">
        <button className="vocab-back" onClick={handleBack} type="button">← Mazos</button>

        <div className="vocab-deck-header">
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <Badge variant={activeDeck.lang}>{LANGUAGES[activeDeck.lang].name}</Badge>
              <Badge variant="level">{activeDeck.level}</Badge>
            </div>
            <h1 className="vocab-deck-title">{activeDeck.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vocab-icon-btn" onClick={() => handleExport(activeDeck)} title="Exportar" type="button">
              <Download size={15} />
            </button>
            <button
              className="vocab-icon-btn vocab-icon-btn--danger"
              onClick={() => handleDeleteDeck(activeDeck)}
              title="Eliminar mazo"
              type="button"
              disabled={activeDeck.source === 'builtin'}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="vocab-search">
          <Search size={14} className="vocab-search__icon" />
          <input
            className="vocab-search__input"
            placeholder="Buscar tarjeta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar tarjeta"
          />
          {search && (
            <button className="vocab-search__clear" onClick={() => setSearch('')} type="button" aria-label="Limpiar">
              <X size={12} />
            </button>
          )}
        </div>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={13} /> Nueva tarjeta
        </Button>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} strokeWidth={1} />}
            title={search ? 'Sin resultados' : 'Mazo vacío'}
            description={search ? `No hay tarjetas con "${search}"` : 'Añade tu primera tarjeta'}
            action={!search ? <Button size="sm" onClick={() => setAddOpen(true)}>Añadir tarjeta</Button> : undefined}
          />
        ) : (
          <div className="vocab-cards">
            {filtered.map(card => (
              <CardRow key={card.id} card={card} onDelete={handleDeleteCard} />
            ))}
          </div>
        )}

        {addOpen && activeDeck && (
          <AddCardModal deck={activeDeck} onClose={() => setAddOpen(false)} />
        )}

        <style>{STYLES}</style>
      </div>
    )
  }

  // ── Decks view ─────────────────────────────────────────────
  return (
    <div className="vocab-page">
      <SectionHeader
        title="Vocabulario"
        action={
          <a href="/importar">
            <Button size="sm" variant="ghost"><Plus size={13} /> Importar</Button>
          </a>
        }
      />

      {decks.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} strokeWidth={1} />}
          title="Sin mazos aún"
          description="Los mazos integrados se cargan automáticamente. También puedes importar los tuyos."
        />
      ) : (
        <div className="vocab-decks">
          {decks.map(deck => (
            <DeckRow key={deck.id} deck={deck} onClick={() => handleOpenDeck(deck)} />
          ))}
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  )
}

// ─── DeckRow ──────────────────────────────────────────────────

function DeckRow({ deck, onClick }: { deck: Deck; onClick: () => void }) {
  const stats = useDeckStats(deck.id)

  return (
    <button className={`deck-row deck-row--${deck.lang}`} onClick={onClick} type="button">
      <div className="deck-row__left">
        <div className="deck-row__badges">
          <Badge variant={deck.lang}>{LANGUAGES[deck.lang].name}</Badge>
          <Badge variant="level">{deck.level}</Badge>
        </div>
        <span className="deck-row__name">{deck.name}</span>
        {stats && (
          <span className="deck-row__stats">
            {stats.total} tarjetas · {stats.due} pendientes hoy
          </span>
        )}
      </div>
      <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  )
}

// ─── CardRow ──────────────────────────────────────────────────

function CardRow({ card, onDelete }: { card: VocabCard; onDelete: (id: string) => void }) {
  return (
    <div className="card-row">
      <div className="card-row__content">
        <span className="card-row__front">{card.front}</span>
        {card.phonetic && <span className="card-row__phonetic">{card.phonetic}</span>}
        <span className="card-row__back">{card.back}</span>
      </div>
      <button
        className="card-row__delete"
        onClick={() => onDelete(card.id)}
        type="button"
        aria-label="Eliminar tarjeta"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── AddCardModal ─────────────────────────────────────────────

function AddCardModal({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [phonetic, setPhonetic] = useState('')
  const [example, setExample] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) return
    setSaving(true)
    try {
      const now = Date.now()
      await db.cards.add({
        id: crypto.randomUUID(),
        deckId: deck.id,
        lang: deck.lang,
        level: deck.level,
        front: front.trim(),
        back: back.trim(),
        phonetic: phonetic.trim() || undefined,
        example: example.trim() || undefined,
        tags: [],
        createdAt: now,
        updatedAt: now,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Nueva tarjeta">
      <div className="add-card-form">
        <div className="add-card-field">
          <label className="add-card-label">
            Frente <span className="add-card-lang">({LANGUAGES[deck.lang].name})</span>
          </label>
          <input className="add-card-input" value={front} onChange={e => setFront(e.target.value)} placeholder="Palabra o frase" autoFocus />
        </div>
        <div className="add-card-field">
          <label className="add-card-label">Traducción (español)</label>
          <input className="add-card-input" value={back} onChange={e => setBack(e.target.value)} placeholder="Significado en español" />
        </div>
        <div className="add-card-field">
          <label className="add-card-label">Fonética <span className="add-card-optional">opcional</span></label>
          <input className="add-card-input" value={phonetic} onChange={e => setPhonetic(e.target.value)} placeholder="/trans·krip·ción/" />
        </div>
        <div className="add-card-field">
          <label className="add-card-label">Ejemplo <span className="add-card-optional">opcional</span></label>
          <input className="add-card-input" value={example} onChange={e => setExample(e.target.value)} placeholder="Frase de ejemplo" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button variant="ghost" onClick={onClose} fullWidth>Cancelar</Button>
          <Button onClick={handleSave} loading={saving} fullWidth disabled={!front.trim() || !back.trim()}>Guardar</Button>
        </div>
      </div>
      <style>{`
        .add-card-form { display: flex; flex-direction: column; gap: 14px; }
        .add-card-field { display: flex; flex-direction: column; gap: 5px; }
        .add-card-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
        .add-card-lang { color: var(--text-muted); font-weight: 400; }
        .add-card-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .add-card-input {
          padding: 9px 12px;
          background: var(--bg-elevated);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-body); font-size: 14px;
          outline: none; transition: border-color 150ms;
        }
        .add-card-input:focus { border-color: var(--border-focus); }
        .add-card-input::placeholder { color: var(--text-muted); }
      `}</style>
    </Modal>
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

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .vocab-page { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .vocab-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--text-muted);
    background: none; border: none; cursor: pointer; padding: 0;
    transition: color 150ms; width: fit-content;
  }
  .vocab-back:hover { color: var(--text-primary); }

  .vocab-deck-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .vocab-deck-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }

  .vocab-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: var(--radius-md);
    border: 0.5px solid var(--border-default);
    background: transparent; color: var(--text-muted);
    cursor: pointer; transition: all 150ms;
  }
  .vocab-icon-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-elevated); }
  .vocab-icon-btn--danger:hover:not(:disabled) { color: var(--crimson-400); border-color: rgba(248,113,113,0.3); }
  .vocab-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .vocab-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 0 12px;
    transition: border-color 150ms;
  }
  .vocab-search:focus-within { border-color: var(--border-focus); }
  .vocab-search__icon { color: var(--text-muted); flex-shrink: 0; }
  .vocab-search__input {
    flex: 1; padding: 9px 0;
    background: transparent; border: none;
    color: var(--text-primary); font-family: var(--font-body); font-size: 14px;
    outline: none;
  }
  .vocab-search__input::placeholder { color: var(--text-muted); }
  .vocab-search__clear {
    display: flex; align-items: center; color: var(--text-muted);
    background: none; border: none; cursor: pointer; padding: 2px;
    transition: color 150ms;
  }
  .vocab-search__clear:hover { color: var(--text-primary); }

  .vocab-decks { display: flex; flex-direction: column; gap: 8px; }
  .deck-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 1rem 1.25rem;
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg);
    text-align: left; cursor: pointer; width: 100%;
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .deck-row:hover { border-color: var(--border-strong); background: var(--bg-elevated); }
  .deck-row--ru { border-left: 2px solid var(--ember-500); }
  .deck-row--de { border-left: 2px solid var(--gold-500); }
  .deck-row--en { border-left: 2px solid var(--lucid-500); }
  .deck-row__left { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .deck-row__badges { display: flex; gap: 5px; flex-wrap: wrap; }
  .deck-row__name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
  .deck-row__stats { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }

  .vocab-cards { display: flex; flex-direction: column; gap: 0; }
  .card-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border-subtle);
  }
  .card-row:last-child { border-bottom: none; }
  .card-row__content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .card-row__front { font-size: 14px; font-weight: 500; color: var(--text-primary); min-width: 80px; }
  .card-row__phonetic { font-family: var(--font-mono); font-size: 11px; color: var(--verdant-400); flex-shrink: 0; }
  .card-row__back { font-size: 13px; color: var(--text-muted); truncate; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-row__delete {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; flex-shrink: 0;
    border: none; background: transparent;
    color: var(--text-muted); cursor: pointer; border-radius: 6px;
    transition: color 150ms, background 150ms;
  }
  .card-row__delete:hover { color: var(--crimson-400); background: rgba(248,113,113,0.08); }
`
