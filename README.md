# Idiomatix

> PWA de aprendizaje de idiomas · Offline-first · Dark-first · Free forever

## Stack
- **Astro 5** — framework principal (SSG + islands)
- **React 19** — islands interactivos (flashcards, ejercicios, nav)
- **TypeScript** — strict mode
- **Tailwind CSS v4** — estilos
- **Dexie.js** — IndexedDB (vocabulario, progreso, sessions)
- **Zustand** — estado global de UI
- **Vite PWA** — service worker, manifest, offline
- **Web Speech API** — TTS para pronunciación (gratis, nativo)

## Idiomas soportados
| Código | Idioma   | Script  | Color token |
|--------|----------|---------|-------------|
| `ru`   | Ruso     | Cyrillic | `ember`    |
| `de`   | Alemán   | Latin    | `gold`     |
| `en`   | Inglés   | Latin    | `lucid`    |

## Estructura del proyecto
```
src/
├── components/
│   ├── ui/           # Design system: Button, Badge, Card, Progress, Modal
│   ├── flashcard/    # FlashCard, FlashCardDeck, RatingBar
│   ├── nav/          # BottomNav, Sidebar, LanguageSelector
│   └── exercises/    # FillBlank, WordOrder, Matching, Translation
├── layouts/
│   ├── BaseLayout.astro
│   └── AppLayout.astro
├── pages/            # Astro pages (file-based routing)
├── stores/           # Zustand stores
├── db/               # Dexie schema & queries
├── types/            # TypeScript interfaces
├── data/             # JSON vocabulario A1-C2 por idioma
│   ├── ru/
│   ├── de/
│   └── en/
├── hooks/            # Custom React hooks
├── lib/              # SM-2, importers (CSV/JSON/Anki)
├── styles/           # CSS variables, global styles
└── utils/            # helpers generales
```

## Niveles de contenido
A1 → A2 → B1 → B2 → C1 → C2 (CEFR)

## Formatos de import de decks
- JSON nativo (Idiomatix format)
- CSV (frente, reverso, idioma, nivel, etiquetas)
- Anki `.apkg` (via anki-apkg-export parser)
- TSV (Quizlet export)

## Comandos
```bash
npm install
npm run dev        # localhost:4321
npm run build      # dist/ optimizado
npm run preview    # preview del build
```
