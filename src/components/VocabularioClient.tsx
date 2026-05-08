/* ──────────────────────────────────────────────────────────────
   VocabularioClient — Explorador de mazos y tarjetas
   Lista mazos → abre mazo → ve tarjetas → añade/borra
────────────────────────────────────────────────────────────── */

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, Download, BookOpen, ChevronRight, Search, X, GripVertical, Edit2 } from 'lucide-react'
import { SectionHeader, Badge, Button, Modal, EmptyState } from '@/components/ui'
import { useAppInit, useDeckStats } from '@/hooks'
import { db } from '@/db'
import { exportDeckAsJSON } from '@/lib/importer'
import { LANGUAGES, type VocabCard, type Deck } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'


type View = 'decks' | 'cards'

export default function VocabularioClient() {
  const { ready } = useAppInit()
  const [view, setView] = useState<View>('decks')
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [renameDeckModal, setRenameDeckModal] = useState<{ open: boolean; deck: Deck | null; currentName: string }>({
    open: false, deck: null, currentName: ''
  })

  const decksRaw = useLiveQuery(() => db.decks.toArray(), [])
  const decks = (decksRaw ?? []).sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order
    return a.createdAt - b.createdAt
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = decks.findIndex(d => d.id === active.id)
    const newIndex = decks.findIndex(d => d.id === over.id)

    const newDecks = arrayMove(decks, oldIndex, newIndex)
    
    // Optimistic-like UI happens automatically via Dexie if we update fast,
    // but Dexie update is async. We just fire the updates.
    await Promise.all(
      newDecks.map((deck, index) => db.decks.update(deck.id, { order: index }))
    )
  }

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

  const [deleteDeckModal, setDeleteDeckModal] = useState<{ open: boolean; deck: Deck | null }>({
    open: false, deck: null
  })

  const handleDeleteDeck = useCallback((deck: Deck) => {
    setDeleteDeckModal({ open: true, deck })
  }, [])

  const confirmDeleteDeck = useCallback(async () => {
    const { deck } = deleteDeckModal
    setDeleteDeckModal(prev => ({ ...prev, open: false }))
    if (!deck) return

    await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
      await db.cards.where('deckId').equals(deck.id).delete()
      await db.reviews.where('deckId').equals(deck.id).delete()
      await db.decks.delete(deck.id)
    })
    setView('decks')
    setActiveDeck(null)
  }, [deleteDeckModal])

  const handleRenameDeck = useCallback((deck: Deck) => {
    setRenameDeckModal({ open: true, deck, currentName: deck.name })
  }, [])

  const submitRenameDeck = useCallback(async () => {
    const { deck, currentName } = renameDeckModal
    setRenameDeckModal(prev => ({ ...prev, open: false }))
    if (!deck) return

    const trimmed = currentName.trim()
    if (trimmed && trimmed !== deck.name) {
      await db.decks.update(deck.id, { name: trimmed })
      setActiveDeck(prev => prev && prev.id === deck.id ? { ...prev, name: trimmed } : prev)
    }
  }, [renameDeckModal])

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

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="vocab-page">
      {view === 'cards' && activeDeck ? (
        <>
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
              <button className="vocab-icon-btn" onClick={() => handleRenameDeck(activeDeck)} title="Renombrar mazo" type="button">
                <Edit2 size={15} />
              </button>
              <button className="vocab-icon-btn" onClick={() => handleExport(activeDeck)} title="Exportar" type="button">
                <Download size={15} />
              </button>
              <button
                className="vocab-icon-btn vocab-icon-btn--danger"
                onClick={() => handleDeleteDeck(activeDeck)}
                title="Eliminar mazo"
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

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

          {addOpen && <AddCardModal deck={activeDeck} onClose={() => setAddOpen(false)} />}
        </>
      ) : (
        <>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={decks.map(d => d.id)} strategy={verticalListSortingStrategy}>
                <div className="vocab-decks">
                  {decks.map(deck => (
                    <SortableDeckRow key={deck.id} deck={deck} onClick={() => handleOpenDeck(deck)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* Shared Modals */}
      <Modal open={renameDeckModal.open} onClose={() => setRenameDeckModal(prev => ({ ...prev, open: false }))} title="Renombrar mazo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            value={renameDeckModal.currentName}
            onChange={e => setRenameDeckModal(prev => ({ ...prev, currentName: e.target.value }))}
            className="rename-input"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') submitRenameDeck() }}
            placeholder="Ej: Verbos esenciales"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setRenameDeckModal(prev => ({ ...prev, open: false }))} fullWidth>Cancelar</Button>
            <Button onClick={submitRenameDeck} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteDeckModal.open} onClose={() => setDeleteDeckModal(prev => ({ ...prev, open: false }))} title="Eliminar mazo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            ¿Estás seguro de eliminar el mazo <strong>"{deleteDeckModal.deck?.name}"</strong> y todas sus tarjetas? Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setDeleteDeckModal(prev => ({ ...prev, open: false }))} fullWidth>Cancelar</Button>
            <Button onClick={confirmDeleteDeck} fullWidth style={{ background: 'var(--crimson-500)', borderColor: 'var(--crimson-500)', color: 'white' }}>Eliminar</Button>
          </div>
        </div>
      </Modal>

      <style>{STYLES}</style>
    </div>
  )
}

function SortableDeckRow({ deck, onClick }: { deck: Deck; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deck.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className={`deck-row-wrapper ${isDragging ? 'deck-row-wrapper--dragging' : ''}`}>
      <DeckRow deck={deck} onClick={onClick} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function DeckRow({ deck, onClick, dragHandleProps }: { deck: Deck; onClick: () => void; dragHandleProps?: any }) {
  const stats = useDeckStats(deck.id)

  return (
    <div className={`deck-row deck-row--${deck.lang}`}>
      <div className="deck-row__drag-handle" {...dragHandleProps} aria-label="Reordenar mazo" tabIndex={0}>
        <GripVertical size={16} strokeWidth={1.5} />
      </div>
      <button className="deck-row__btn" onClick={onClick} type="button">
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
    </div>
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

  .rename-input {
    width: 100%; padding: 10px 12px;
    background: var(--bg-elevated); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); color: var(--text-primary);
    font-family: var(--font-body); font-size: 14px;
    transition: border-color 150ms; outline: none;
  }
  .rename-input:focus { border-color: var(--verdant-500); }

  .vocab-decks { display: flex; flex-direction: column; gap: 8px; }
  
  .deck-row-wrapper { border-radius: var(--radius-lg); }
  .deck-row-wrapper--dragging { opacity: 0.9; }

  .deck-row {
    display: flex; align-items: stretch;
    background: var(--bg-card);
    border: 0.5px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .deck-row:hover { border-color: var(--border-strong); }
  .deck-row-wrapper--dragging .deck-row { border-color: var(--verdant-500); box-shadow: 0 0 0 1px var(--verdant-500); }

  .deck-row--ru { border-left: 2px solid var(--ember-500); }
  .deck-row--de { border-left: 2px solid var(--gold-500); }
  .deck-row--en { border-left: 2px solid var(--lucid-500); }

  .deck-row__drag-handle {
    display: flex; align-items: center; justify-content: center;
    padding: 0 10px; color: var(--text-muted);
    cursor: grab; border-right: 0.5px solid var(--border-subtle);
    background: rgba(255, 255, 255, 0.015);
    touch-action: none;
    transition: color 150ms, background 150ms;
  }
  .deck-row__drag-handle:active { cursor: grabbing; }
  .deck-row__drag-handle:hover, .deck-row__drag-handle:focus-visible { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); outline: none; }

  .deck-row__btn {
    flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 1rem 1.25rem; background: transparent; border: none; text-align: left;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background 150ms;
  }
  .deck-row__btn:hover { background: var(--bg-elevated); }

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
