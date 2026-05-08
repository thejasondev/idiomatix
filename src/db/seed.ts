/* ──────────────────────────────────────────────────────────────
   Idiomatix — DB Seed v3 · Cobertura A1→C2 × RU/DE/EN
   Idempotente: no duplica si el deck ya existe por nombre+lang
────────────────────────────────────────────────────────────── */

import { db } from "@/db";
import { generateId } from "@/utils";
import type {
  Deck,
  VocabCard,
  CEFRLevel,
  LanguageCode,
  PartOfSpeech,
} from "@/types";

// ── A1 ────────────────────────────────────────────────────────
import ruA1 from "@/data/ru/a1-esencial.json";
import deA1 from "@/data/de/a1-esencial.json";
import enA1 from "@/data/en/a1-esencial.json";
// ── A2 ────────────────────────────────────────────────────────
import ruA2 from "@/data/ru/a2-elemental.json";
import deA2 from "@/data/de/a2-elemental.json";
import enA2 from "@/data/en/a2-elemental.json";
// ── B1 ────────────────────────────────────────────────────────
import ruB1 from "@/data/ru/b1-intermedio.json";
import deB1 from "@/data/de/b1-intermedio.json";
import enB1 from "@/data/en/b1-intermedio.json";
// ── B2 ────────────────────────────────────────────────────────
import ruB2 from "@/data/ru/b2-intermedio-alto.json";
import deB2 from "@/data/de/b2-intermedio-alto.json";
import enB2 from "@/data/en/b2-intermedio-alto.json";
// ── C1 ────────────────────────────────────────────────────────
import ruC1 from "@/data/ru/c1-avanzado.json";
import deC1 from "@/data/de/c1-avanzado.json";
import enC1 from "@/data/en/c1-avanzado.json";
// ── C2 ────────────────────────────────────────────────────────
import ruC2 from "@/data/ru/c2-maestria.json";
import deC2 from "@/data/de/c2-maestria.json";
import enC2 from "@/data/en/c2-maestria.json";

interface RawCard {
  front: string;
  back: string;
  phonetic?: string;
  example?: string;
  exampleTranslation?: string;
  partOfSpeech?: string;
  gender?: "M" | "F" | "N";
  tags: string[];
}
interface RawDeckFile {
  version: "1.0";
  deck: {
    name: string;
    description?: string;
    lang: LanguageCode;
    level: CEFRLevel;
    source: "builtin";
    tags: string[];
  };
  cards: RawCard[];
}

// Order: A1→C2 per language group for clean UX ordering
const BUILTIN_DECKS: RawDeckFile[] = [
  ruA1 as RawDeckFile,
  ruA2 as RawDeckFile,
  ruB1 as RawDeckFile,
  ruB2 as RawDeckFile,
  ruC1 as RawDeckFile,
  ruC2 as RawDeckFile,
  deA1 as RawDeckFile,
  deA2 as RawDeckFile,
  deB1 as RawDeckFile,
  deB2 as RawDeckFile,
  deC1 as RawDeckFile,
  deC2 as RawDeckFile,
  enA1 as RawDeckFile,
  enA2 as RawDeckFile,
  enB1 as RawDeckFile,
  enB2 as RawDeckFile,
  enC1 as RawDeckFile,
  enC2 as RawDeckFile,
];

let seeded = false;

export async function seedBuiltinDecks(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    for (const raw of BUILTIN_DECKS) {
      const existing = await db.decks
        .where("lang")
        .equals(raw.deck.lang)
        .filter((d) => d.name === raw.deck.name && d.source === "builtin")
        .first();

      if (existing) continue;

      const now = Date.now();
      const deckId = generateId();

      const deck: Deck = {
        id: deckId,
        name: raw.deck.name,
        description: raw.deck.description,
        lang: raw.deck.lang,
        level: raw.deck.level,
        source: "builtin",
        cardCount: raw.cards.length,
        tags: raw.deck.tags,
        createdAt: now,
        updatedAt: now,
      };

      const cards: VocabCard[] = raw.cards.map((c) => ({
        id: generateId(),
        deckId,
        lang: raw.deck.lang,
        level: raw.deck.level,
        front: c.front,
        back: c.back,
        phonetic: c.phonetic,
        example: c.example,
        exampleTranslation: c.exampleTranslation,
        partOfSpeech: c.partOfSpeech as PartOfSpeech | undefined,
        gender: c.gender,
        tags: c.tags ?? [],
        createdAt: now,
        updatedAt: now,
      }));

      await db.transaction("rw", db.decks, db.cards, async () => {
        await db.decks.add(deck);
        await db.cards.bulkAdd(cards);
      });

      console.info(
        `[Idiomatix] ✓ ${deck.lang.toUpperCase()} ${deck.level} — ${deck.name} (${cards.length})`,
      );
    }
  } catch (err) {
    console.error("[Idiomatix] Seed error:", err);
  }
}
