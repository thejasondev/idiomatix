/* ──────────────────────────────────────────────────────────────
   ImportClient — Importador de mazos con drag-and-drop
   Formatos: JSON · CSV · TSV/TXT
────────────────────────────────────────────────────────────── */

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react'
import { SectionHeader, Button, Badge } from '@/components/ui'
import { useImportDeck } from '@/hooks'
import { LANGUAGES, type LanguageCode } from '@/types'

type ImportPhase = 'idle' | 'dragging' | 'importing' | 'success' | 'error'

export default function ImportClient() {
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [defaultLang, setDefaultLang] = useState<LanguageCode>('ru')
  const [lastResult, setLastResult] = useState<{ count: number; name: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { importFile } = useImportDeck()

  const processFile = useCallback(async (file: File) => {
    setPhase('importing')
    setErrorMsg('')
    const ok = await importFile(file, defaultLang)
    if (ok) {
      // Extract count from success — hook already called showToast,
      // we just need to reflect in UI
      setLastResult({ count: 0, name: file.name.replace(/\.[^/.]+$/, '') })
      setPhase('success')
    } else {
      setErrorMsg('El archivo no pudo ser procesado. Verifica el formato.')
      setPhase('error')
    }
  }, [importFile, defaultLang])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setPhase('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  return (
    <div className="imp-page">
      <a href="/vocabulario" className="imp-back">
        <ChevronLeft size={14} /> Vocabulario
      </a>

      <SectionHeader
        title="Importar mazo"
        description="Añade tarjetas desde un archivo externo"
      />

      {/* Default language selector */}
      <div className="imp-lang-section">
        <p className="imp-lang-label">Idioma por defecto (si el archivo no lo especifica)</p>
        <div className="imp-lang-tabs">
          {(['ru', 'de', 'en'] as LanguageCode[]).map(lang => (
            <button
              key={lang}
              className={`imp-lang-btn ${defaultLang === lang ? 'imp-lang-btn--active imp-lang-btn--' + lang : ''}`}
              onClick={() => setDefaultLang(lang)}
              type="button"
            >
              {LANGUAGES[lang].name}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {(phase === 'idle' || phase === 'dragging') && (
        <div
          className={`imp-dropzone ${phase === 'dragging' ? 'imp-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setPhase('dragging') }}
          onDragLeave={() => setPhase('idle')}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Soltar archivo aquí o hacer clic para seleccionar"
          onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current?.click() }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.tsv,.txt"
            className="imp-file-input"
            onChange={handleFileInput}
            aria-hidden="true"
          />
          <Upload size={28} strokeWidth={1.5} className="imp-dropzone__icon" />
          <p className="imp-dropzone__title">
            {phase === 'dragging' ? 'Suelta el archivo' : 'Arrastra tu archivo aquí'}
          </p>
          <p className="imp-dropzone__sub">o haz clic para seleccionar</p>
          <div className="imp-formats">
            <Badge variant="neutral">JSON</Badge>
            <Badge variant="neutral">CSV</Badge>
            <Badge variant="neutral">TSV</Badge>
            <Badge variant="neutral">TXT</Badge>
          </div>
        </div>
      )}

      {/* Importing */}
      {phase === 'importing' && (
        <div className="imp-status imp-status--loading">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          <p>Procesando archivo…</p>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && (
        <div className="imp-status imp-status--success">
          <CheckCircle size={32} strokeWidth={1.5} />
          <div>
            <p className="imp-status__title">¡Importación exitosa!</p>
            <p className="imp-status__sub">El mazo se ha añadido a tu biblioteca.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <Button variant="ghost" onClick={() => setPhase('idle')} fullWidth>Importar otro</Button>
            <Button onClick={() => window.location.href = '/vocabulario'} fullWidth>Ver mazos</Button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="imp-status imp-status--error">
          <AlertCircle size={28} strokeWidth={1.5} />
          <div>
            <p className="imp-status__title">Error al importar</p>
            <p className="imp-status__sub">{errorMsg}</p>
          </div>
          <Button variant="ghost" onClick={() => setPhase('idle')} fullWidth>Intentar de nuevo</Button>
        </div>
      )}

      {/* Format guide */}
      <div className="imp-guide">
        <p className="imp-guide__title">Guía de formatos</p>

        <div className="imp-guide__format">
          <div className="imp-guide__format-header">
            <Badge variant="neutral">JSON</Badge>
            <span className="imp-guide__format-name">Idiomatix nativo</span>
          </div>
          <pre className="imp-guide__code">{`{
  "version": "1.0",
  "deck": { "name": "Mi mazo", "lang": "ru", "level": "A1" },
  "cards": [
    { "front": "привет", "back": "hola", "phonetic": "/pri·viét/" }
  ]
}`}</pre>
        </div>

        <div className="imp-guide__format">
          <div className="imp-guide__format-header">
            <Badge variant="neutral">CSV / TSV</Badge>
            <span className="imp-guide__format-name">Compatible con Excel, Google Sheets, Quizlet</span>
          </div>
          <pre className="imp-guide__code">{`front,back,phonetic,lang,level,tags
привет,hola,/pri·viét/,ru,A1,saludos
Hallo,hola,,de,A1,saludos`}</pre>
          <p className="imp-guide__note">Columnas requeridas: <code>front</code>, <code>back</code>. El resto son opcionales.</p>
        </div>
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
  .imp-page { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .imp-back {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 13px; color: var(--text-muted);
    text-decoration: none; transition: color 150ms; width: fit-content;
  }
  .imp-back:hover { color: var(--text-primary); }

  .imp-lang-section { display: flex; flex-direction: column; gap: 8px; }
  .imp-lang-label { font-size: 12px; color: var(--text-muted); }
  .imp-lang-tabs { display: flex; gap: 6px; }
  .imp-lang-btn {
    padding: 6px 14px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-default);
    background: transparent; font-family: var(--font-body);
    font-size: 13px; color: var(--text-secondary); cursor: pointer;
    transition: all 150ms; -webkit-tap-highlight-color: transparent;
  }
  .imp-lang-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .imp-lang-btn--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }
  .imp-lang-btn--ru.imp-lang-btn--active { color: var(--lang-ru); border-color: var(--lang-ru-border); background: var(--lang-ru-bg); }
  .imp-lang-btn--de.imp-lang-btn--active { color: var(--lang-de); border-color: var(--lang-de-border); background: var(--lang-de-bg); }
  .imp-lang-btn--en.imp-lang-btn--active { color: var(--lang-en); border-color: var(--lang-en-border); background: var(--lang-en-bg); }

  .imp-dropzone {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 2.5rem 1.5rem;
    background: var(--bg-card);
    border: 1.5px dashed var(--border-default);
    border-radius: var(--radius-xl);
    cursor: pointer; text-align: center;
    transition: border-color 200ms, background 200ms;
    user-select: none; -webkit-tap-highlight-color: transparent;
  }
  .imp-dropzone:hover { border-color: var(--verdant-600); background: rgba(13,148,136,0.04); }
  .imp-dropzone--active { border-color: var(--verdant-500); background: rgba(13,148,136,0.08); }
  .imp-dropzone__icon { color: var(--text-muted); }
  .imp-dropzone--active .imp-dropzone__icon { color: var(--verdant-400); }
  .imp-dropzone__title { font-size: 15px; font-weight: 500; color: var(--text-primary); }
  .imp-dropzone__sub { font-size: 13px; color: var(--text-muted); }
  .imp-file-input { display: none; }
  .imp-formats { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }

  .imp-status {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 2rem 1.5rem;
    background: var(--bg-card); border-radius: var(--radius-lg);
    text-align: center; animation: fadeIn 200ms ease;
  }
  .imp-status--loading { color: var(--text-muted); font-size: 14px; }
  .imp-status--success { color: var(--verdant-400); }
  .imp-status--error { color: var(--crimson-400); }
  .imp-status__title { font-size: 15px; font-weight: 500; color: var(--text-primary); margin-bottom: 3px; }
  .imp-status__sub { font-size: 13px; color: var(--text-muted); }

  .loading-dots { display: flex; gap: 6px; }
  .loading-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--verdant-600); animation: pd 1.2s ease-in-out infinite; }
  .loading-dots span:nth-child(2) { animation-delay: .2s; }
  .loading-dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes pd { 0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)} }

  .imp-guide { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
  .imp-guide__title { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
  .imp-guide__format {
    background: var(--bg-card); border: 0.5px solid var(--border-default);
    border-radius: var(--radius-md); overflow: hidden;
  }
  .imp-guide__format-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 0.5px solid var(--border-subtle); }
  .imp-guide__format-name { font-size: 12px; color: var(--text-muted); }
  .imp-guide__code {
    padding: 12px 14px; font-family: var(--font-mono); font-size: 11px;
    color: var(--verdant-400); background: var(--bg-elevated);
    overflow-x: auto; white-space: pre; line-height: 1.6;
  }
  .imp-guide__note { padding: 8px 14px; font-size: 11px; color: var(--text-muted); }
  .imp-guide__note code { font-family: var(--font-mono); color: var(--text-secondary); }
`
