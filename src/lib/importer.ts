/* ──────────────────────────────────────────────────────────────
   Idiomatix — Deck Importer
   Soporta: idiomatix-json | csv | tsv | anki (txt export)
────────────────────────────────────────────────────────────── */


import type { VocabCard, Deck, LanguageCode, CEFRLevel, ImportResult } from '@/types'
import { CEFR_LEVELS } from '@/types'

// ─── Idiomatix JSON format ────────────────────────────────────

interface IdiomatixExport {
  version: '1.0'
  deck: Omit<Deck, 'id' | 'cardCount' | 'createdAt' | 'updatedAt'>
  cards: Omit<VocabCard, 'id' | 'deckId' | 'createdAt' | 'updatedAt'>[]
}

export function importIdiomatixJSON(raw: string): { deck: Deck; cards: VocabCard[] } | null {
  try {
    const data = JSON.parse(raw) as IdiomatixExport
    if (data.version !== '1.0' || !data.deck || !Array.isArray(data.cards)) {
      throw new Error('Formato inválido')
    }
    const now = Date.now()
    const deckId = crypto.randomUUID()
    const deck: Deck = {
      id: deckId,
      ...data.deck,
      source: 'imported',
      cardCount: data.cards.length,
      createdAt: now,
      updatedAt: now,
    }
    const cards: VocabCard[] = data.cards.map(c => ({
      id: crypto.randomUUID(),
      deckId,
      ...c,
      tags: c.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }))
    return { deck, cards }
  } catch {
    return null
  }
}

// ─── CSV / TSV parser ──────────────────────────────────────────
// Columnas esperadas (header obligatorio):
// front, back, phonetic?, example?, lang?, level?, tags?, partOfSpeech?

function parseDelimited(
  raw: string,
  delimiter: ',' | '\t',
  deckName: string,
  defaultLang: LanguageCode = 'en'
): { deck: Deck; cards: VocabCard[] } | null {
  try {
    const lines = raw.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('El archivo está vacío')

    const headerLine = lines[0]
    if (!headerLine) throw new Error('Sin cabecera')
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase())

    const idx = (col: string) => headers.indexOf(col)

    const frontIdx = idx('front')
    const backIdx = idx('back')
    if (frontIdx === -1 || backIdx === -1) {
      throw new Error('Se requieren columnas "front" y "back"')
    }

    const now = Date.now()
    const deckId = crypto.randomUUID()

    const cards: VocabCard[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const cols = line.split(delimiter)

      const front = cols[frontIdx]?.trim() ?? ''
      const back  = cols[backIdx]?.trim() ?? ''
      if (!front || !back) continue

      const rawLang  = cols[idx('lang')]?.trim().toLowerCase() ?? defaultLang
      const lang = (['ru', 'de', 'en'].includes(rawLang) ? rawLang : defaultLang) as LanguageCode

      const rawLevel = cols[idx('level')]?.trim().toUpperCase() ?? 'A1'
      const level = (CEFR_LEVELS.includes(rawLevel as CEFRLevel) ? rawLevel : 'A1') as CEFRLevel

      const tagsRaw = cols[idx('tags')]?.trim() ?? ''
      const tags = tagsRaw ? tagsRaw.split('|').map(t => t.trim()) : []

      cards.push({
        id: crypto.randomUUID(),
        deckId,
        lang,
        level,
        front,
        back,
        phonetic: cols[idx('phonetic')]?.trim() || undefined,
        example: cols[idx('example')]?.trim() || undefined,
        exampleTranslation: cols[idx('exampletranslation')]?.trim() || undefined,
        partOfSpeech: (cols[idx('partofspeech')]?.trim() as VocabCard['partOfSpeech']) || undefined,
        tags,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (cards.length === 0) throw new Error('No se encontraron tarjetas válidas')

    // Detect dominant lang for deck
    const langCount: Record<string, number> = {}
    cards.forEach(c => { langCount[c.lang] = (langCount[c.lang] ?? 0) + 1 })
    const dominantLang = (Object.entries(langCount)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? defaultLang) as LanguageCode

    const deck: Deck = {
      id: deckId,
      name: deckName,
      lang: dominantLang,
      level: (cards[0]?.level ?? 'A1'),
      source: 'imported',
      cardCount: cards.length,
      tags: [],
      createdAt: now,
      updatedAt: now,
    }

    return { deck, cards }
  } catch {
    return null
  }
}

export function importCSV(raw: string, deckName: string, defaultLang?: LanguageCode) {
  return parseDelimited(raw, ',', deckName, defaultLang)
}

export function importTSV(raw: string, deckName: string, defaultLang?: LanguageCode) {
  return parseDelimited(raw, '\t', deckName, defaultLang)
}

// ─── Main entry point ─────────────────────────────────────────

export type SupportedFormat = 'idiomatix-json' | 'csv' | 'tsv'

export async function importDeck(
  file: File,
  options: { defaultLang?: LanguageCode } = {}
): Promise<{ result: ImportResult; deck?: Deck; cards?: VocabCard[] }> {
  const raw = await file.text()
  const name = file.name.replace(/\.[^/.]+$/, '') // strip extension

  let parsed: { deck: Deck; cards: VocabCard[] } | null = null

  if (file.name.endsWith('.json')) {
    parsed = importIdiomatixJSON(raw)
  } else if (file.name.endsWith('.csv')) {
    parsed = importCSV(raw, name, options.defaultLang)
  } else if (file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
    parsed = importTSV(raw, name, options.defaultLang)
  } else {
    return {
      result: {
        success: false,
        cardsImported: 0,
        deckName: name,
        errors: [`Formato no soportado: ${file.name.split('.').pop()}`],
      },
    }
  }

  if (!parsed) {
    return {
      result: {
        success: false,
        cardsImported: 0,
        deckName: name,
        errors: ['No se pudo parsear el archivo. Verifica el formato.'],
      },
    }
  }

  return {
    result: {
      success: true,
      cardsImported: parsed.cards.length,
      deckName: parsed.deck.name,
      errors: [],
    },
    deck: parsed.deck,
    cards: parsed.cards,
  }
}

// ─── Export (Idiomatix JSON) ───────────────────────────────────

export function exportDeckAsJSON(deck: Deck, cards: VocabCard[]): string {
  const exportData: IdiomatixExport = {
    version: '1.0',
    deck: {
      name: deck.name,
      description: deck.description,
      lang: deck.lang,
      level: deck.level,
      source: deck.source,
      tags: deck.tags,
    },
    cards: cards.map(({ id: _id, deckId: _deckId, createdAt: _c, updatedAt: _u, ...rest }) => rest),
  }
  return JSON.stringify(exportData, null, 2)
}
