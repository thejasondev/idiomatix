/* ──────────────────────────────────────────────────────────────
   GramaticaClient — Referencia gramatical interactiva
   Casos rusos · Artículos alemanes · Conjugaciones básicas
────────────────────────────────────────────────────────────── */

import { useState } from 'react'
import { SectionHeader, Badge } from '@/components/ui'
import { LANGUAGES, type LanguageCode } from '@/types'

type LangTab = LanguageCode

// ─── Data ─────────────────────────────────────────────────────

const RU_CASES = [
  { caso: 'Nominativo', pregunta: '¿Quién? ¿Qué?', uso: 'Sujeto de la oración', ejemplo: 'студент (el estudiante)', ending_m: '-', ending_f: 'а/я', ending_n: 'о/е' },
  { caso: 'Genitivo',   pregunta: '¿De quién? ¿De qué?', uso: 'Posesión, ausencia, cantidad', ejemplo: 'нет студента (no hay estudiante)', ending_m: 'а/я', ending_f: 'ы/и', ending_n: 'а/я' },
  { caso: 'Dativo',     pregunta: '¿A quién? ¿Para qué?', uso: 'Objeto indirecto', ejemplo: 'дать студенту (dar al estudiante)', ending_m: 'у/ю', ending_f: 'е/и', ending_n: 'у/ю' },
  { caso: 'Acusativo',  pregunta: '¿A quién? ¿Qué?', uso: 'Objeto directo', ejemplo: 'вижу студента (veo al estudiante)', ending_m: 'а/я', ending_f: 'у/ю', ending_n: '=' },
  { caso: 'Instrumental', pregunta: '¿Con quién? ¿Cómo?', uso: 'Instrumento, compañía', ejemplo: 'с другом (con el amigo)', ending_m: 'ом/ем', ending_f: 'ой/ей', ending_n: 'ом/ем' },
  { caso: 'Preposicional', pregunta: '¿Sobre quién?', uso: 'Con preposiciones о, в, на', ejemplo: 'о студенте (sobre el estudiante)', ending_m: 'е/и', ending_f: 'е/и', ending_n: 'е/и' },
]

const DE_ARTICLES = [
  { kasus: 'Nominativ',  der: 'der',  die: 'die',  das: 'das',  plural: 'die',  indef_m: 'ein',    indef_f: 'eine',   indef_n: 'ein'    },
  { kasus: 'Akkusativ',  der: 'den',  die: 'die',  das: 'das',  plural: 'die',  indef_m: 'einen',  indef_f: 'eine',   indef_n: 'ein'    },
  { kasus: 'Dativ',      der: 'dem',  die: 'der',  das: 'dem',  plural: 'den',  indef_m: 'einem',  indef_f: 'einer',  indef_n: 'einem'  },
  { kasus: 'Genitiv',    der: 'des',  die: 'der',  das: 'des',  plural: 'der',  indef_m: 'eines',  indef_f: 'einer',  indef_n: 'eines'  },
]

const EN_TENSES = [
  { tense: 'Present Simple',      form: 'I work / She works',          uso: 'Hábitos, hechos generales, verdades' },
  { tense: 'Present Continuous',  form: 'I am working',                uso: 'Acciones en progreso ahora mismo' },
  { tense: 'Past Simple',         form: 'I worked / I went',           uso: 'Acciones completadas en el pasado' },
  { tense: 'Past Continuous',     form: 'I was working',               uso: 'Acción en progreso en el pasado' },
  { tense: 'Present Perfect',     form: 'I have worked',               uso: 'Experiencias, resultados del pasado' },
  { tense: 'Future Simple',       form: 'I will work',                 uso: 'Predicciones, decisiones espontáneas' },
  { tense: 'Going to',            form: 'I am going to work',          uso: 'Planes e intenciones futuras' },
  { tense: 'Conditional',         form: 'I would work',                uso: 'Condiciones hipotéticas' },
]

// ─── Component ────────────────────────────────────────────────

export default function GramaticaClient() {
  const [activeLang, setActiveLang] = useState<LangTab>('ru')

  return (
    <div className="gram-page">
      <SectionHeader
        title="Gramática"
        description="Referencia rápida de estructuras gramaticales"
      />

      {/* Language tabs */}
      <div className="gram-tabs">
        {(['ru', 'de', 'en'] as LanguageCode[]).map(lang => (
          <button
            key={lang}
            className={`gram-tab gram-tab--${lang} ${activeLang === lang ? 'gram-tab--active gram-tab--active-' + lang : ''}`}
            onClick={() => setActiveLang(lang)}
            type="button"
          >
            {LANGUAGES[lang].name}
          </button>
        ))}
      </div>

      {activeLang === 'ru' && <RussianGrammar />}
      {activeLang === 'de' && <GermanGrammar />}
      {activeLang === 'en' && <EnglishGrammar />}

      <style>{STYLES}</style>
    </div>
  )
}

// ─── Russian Grammar ──────────────────────────────────────────

function RussianGrammar() {
  return (
    <div className="gram-content">
      <div className="gram-section">
        <div className="gram-section-header">
          <Badge variant="ru">RU</Badge>
          <h2 className="gram-section-title">Los 6 Casos del Ruso</h2>
        </div>
        <p className="gram-intro">
          El ruso es una lengua flexiva: las palabras cambian su terminación según su función en la oración.
          Dominar los casos es la clave del ruso.
        </p>

        <div className="cases-table-wrapper">
          <table className="cases-table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Pregunta</th>
                <th>Uso</th>
                <th className="th-m">M</th>
                <th className="th-f">F</th>
                <th className="th-n">N</th>
              </tr>
            </thead>
            <tbody>
              {RU_CASES.map(c => (
                <tr key={c.caso}>
                  <td className="td-caso">{c.caso}</td>
                  <td className="td-pregunta">{c.pregunta}</td>
                  <td className="td-uso">{c.uso}</td>
                  <td className="td-ending td-m">{c.ending_m}</td>
                  <td className="td-ending td-f">{c.ending_f}</td>
                  <td className="td-ending td-n">{c.ending_n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gram-section">
        <h3 className="gram-subsection-title">Verbos de aspecto — imperfectivo vs perfectivo</h3>
        <div className="aspect-pairs">
          {[
            { imp: 'читать', perf: 'прочитать', es: 'leer' },
            { imp: 'писать', perf: 'написать', es: 'escribir' },
            { imp: 'говорить', perf: 'сказать', es: 'hablar/decir' },
            { imp: 'делать', perf: 'сделать', es: 'hacer' },
            { imp: 'идти', perf: 'прийти', es: 'ir/llegar' },
          ].map(pair => (
            <div key={pair.es} className="aspect-pair">
              <span className="aspect-imp">{pair.imp}</span>
              <span className="aspect-arrow">→</span>
              <span className="aspect-perf">{pair.perf}</span>
              <span className="aspect-es">{pair.es}</span>
            </div>
          ))}
        </div>
        <p className="gram-note">Imperfectivo = proceso/repetición. Perfectivo = acción completa/resultado.</p>
      </div>
    </div>
  )
}

// ─── German Grammar ───────────────────────────────────────────

function GermanGrammar() {
  return (
    <div className="gram-content">
      <div className="gram-section">
        <div className="gram-section-header">
          <Badge variant="de">DE</Badge>
          <h2 className="gram-section-title">Artículos Definidos e Indefinidos</h2>
        </div>
        <p className="gram-intro">
          El alemán tiene 4 casos y 3 géneros (der/die/das). Los artículos cambian según el caso.
        </p>

        <div className="cases-table-wrapper">
          <table className="cases-table">
            <thead>
              <tr>
                <th>Kasus</th>
                <th className="th-m">der (M)</th>
                <th className="th-f">die (F)</th>
                <th className="th-n">das (N)</th>
                <th>Plural</th>
                <th className="th-m">ein (M)</th>
                <th className="th-f">eine (F)</th>
                <th className="th-n">ein (N)</th>
              </tr>
            </thead>
            <tbody>
              {DE_ARTICLES.map(r => (
                <tr key={r.kasus}>
                  <td className="td-caso">{r.kasus}</td>
                  <td className="td-ending td-m">{r.der}</td>
                  <td className="td-ending td-f">{r.die}</td>
                  <td className="td-ending td-n">{r.das}</td>
                  <td className="td-ending">{r.plural}</td>
                  <td className="td-ending td-m">{r.indef_m}</td>
                  <td className="td-ending td-f">{r.indef_f}</td>
                  <td className="td-ending td-n">{r.indef_n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gram-section">
        <h3 className="gram-subsection-title">Verbos modales</h3>
        <div className="modal-grid">
          {[
            { verb: 'können', es: 'poder (capacidad)', ex: 'Ich kann Deutsch.' },
            { verb: 'müssen', es: 'deber (obligación)', ex: 'Ich muss arbeiten.' },
            { verb: 'wollen', es: 'querer (voluntad)', ex: 'Ich will schlafen.' },
            { verb: 'sollen', es: 'deber (mandato externo)', ex: 'Du sollst kommen.' },
            { verb: 'dürfen', es: 'poder (permiso)', ex: 'Darf ich...?' },
            { verb: 'mögen',  es: 'gustar / querer', ex: 'Ich mag Kaffee.' },
          ].map(m => (
            <div key={m.verb} className="modal-card">
              <span className="modal-verb">{m.verb}</span>
              <span className="modal-es">{m.es}</span>
              <span className="modal-ex">{m.ex}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── English Grammar ──────────────────────────────────────────

function EnglishGrammar() {
  return (
    <div className="gram-content">
      <div className="gram-section">
        <div className="gram-section-header">
          <Badge variant="en">EN</Badge>
          <h2 className="gram-section-title">Tiempos Verbales del Inglés</h2>
        </div>
        <p className="gram-intro">
          El inglés tiene 12 tiempos verbales principales. Los más usados en comunicación cotidiana son los 8 primeros.
        </p>

        <div className="tenses-list">
          {EN_TENSES.map(t => (
            <div key={t.tense} className="tense-row">
              <div className="tense-left">
                <span className="tense-name">{t.tense}</span>
                <span className="tense-form">{t.form}</span>
              </div>
              <p className="tense-uso">{t.uso}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="gram-section">
        <h3 className="gram-subsection-title">Phrasal verbs esenciales</h3>
        <div className="phrasal-list">
          {[
            { pv: 'give up',    es: 'rendirse, abandonar' },
            { pv: 'find out',   es: 'descubrir, averiguar' },
            { pv: 'look up',    es: 'buscar (en diccionario)' },
            { pv: 'get on with',es: 'llevarse bien con' },
            { pv: 'put off',    es: 'posponer, aplazar' },
            { pv: 'bring up',   es: 'mencionar, criar' },
            { pv: 'turn down',  es: 'rechazar, bajar (volumen)' },
            { pv: 'carry out',  es: 'llevar a cabo, realizar' },
          ].map(p => (
            <div key={p.pv} className="phrasal-row">
              <span className="phrasal-en">{p.pv}</span>
              <span className="phrasal-es">{p.es}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const STYLES = `
  .gram-page { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 250ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

  .gram-tabs { display: flex; gap: 6px; }
  .gram-tab {
    flex: 1; padding: 8px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-default);
    background: transparent; font-family: var(--font-body); font-size: 13px;
    color: var(--text-secondary); cursor: pointer; transition: all 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .gram-tab:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .gram-tab--active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }
  .gram-tab--active-ru { color: var(--lang-ru); border-color: var(--lang-ru-border); background: var(--lang-ru-bg); }
  .gram-tab--active-de { color: var(--lang-de); border-color: var(--lang-de-border); background: var(--lang-de-bg); }
  .gram-tab--active-en { color: var(--lang-en); border-color: var(--lang-en-border); background: var(--lang-en-bg); }

  .gram-content { display: flex; flex-direction: column; gap: 1.25rem; }
  .gram-section { display: flex; flex-direction: column; gap: 12px; }
  .gram-section-header { display: flex; align-items: center; gap: 8px; }
  .gram-section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
  .gram-subsection-title { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
  .gram-intro { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
  .gram-note { font-size: 12px; color: var(--text-muted); font-style: italic; padding: 8px 12px; background: var(--bg-elevated); border-radius: var(--radius-md); border-left: 2px solid var(--verdant-700); }

  /* Cases table */
  .cases-table-wrapper { overflow-x: auto; border-radius: var(--radius-md); border: 0.5px solid var(--border-default); }
  .cases-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 480px; }
  .cases-table th {
    padding: 8px 10px; background: var(--bg-elevated);
    color: var(--text-muted); font-weight: 500; text-align: left;
    border-bottom: 0.5px solid var(--border-default);
    white-space: nowrap;
  }
  .cases-table td { padding: 9px 10px; border-bottom: 0.5px solid var(--border-subtle); }
  .cases-table tr:last-child td { border-bottom: none; }
  .cases-table tr:hover td { background: var(--bg-elevated); }
  .td-caso { font-weight: 500; color: var(--text-primary); white-space: nowrap; }
  .td-pregunta { color: var(--text-muted); font-style: italic; font-size: 11px; }
  .td-uso { color: var(--text-secondary); font-size: 11px; }
  .td-ending { font-family: var(--font-mono); font-size: 12px; text-align: center; }
  .td-m { color: var(--lucid-400); }
  .td-f { color: var(--ember-400); }
  .td-n { color: var(--verdant-400); }
  .th-m { color: var(--lucid-400) !important; }
  .th-f { color: var(--ember-400) !important; }
  .th-n { color: var(--verdant-400) !important; }

  /* Aspect pairs */
  .aspect-pairs { display: flex; flex-direction: column; gap: 6px; }
  .aspect-pair {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; background: var(--bg-card);
    border: 0.5px solid var(--border-default); border-radius: var(--radius-md);
    flex-wrap: wrap;
  }
  .aspect-imp { font-size: 14px; color: var(--text-secondary); min-width: 100px; }
  .aspect-arrow { color: var(--text-muted); }
  .aspect-perf { font-size: 14px; font-weight: 500; color: var(--verdant-400); min-width: 100px; }
  .aspect-es { font-size: 12px; color: var(--text-muted); margin-left: auto; }

  /* Modal verbs */
  .modal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .modal-card {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 12px; background: var(--bg-card);
    border: 0.5px solid var(--border-default); border-left: 2px solid var(--gold-600);
    border-radius: var(--radius-md);
  }
  .modal-verb { font-size: 14px; font-weight: 500; color: var(--gold-400); }
  .modal-es { font-size: 12px; color: var(--text-secondary); }
  .modal-ex { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px; }

  /* Tenses */
  .tenses-list { display: flex; flex-direction: column; }
  .tense-row {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 0; border-bottom: 0.5px solid var(--border-subtle);
  }
  .tense-row:last-child { border-bottom: none; }
  .tense-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .tense-name { font-size: 14px; font-weight: 500; color: var(--text-primary); min-width: 160px; }
  .tense-form { font-family: var(--font-mono); font-size: 12px; color: var(--lucid-400); }
  .tense-uso { font-size: 12px; color: var(--text-muted); padding-left: 2px; }

  /* Phrasal verbs */
  .phrasal-list { display: flex; flex-direction: column; }
  .phrasal-row {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 0; border-bottom: 0.5px solid var(--border-subtle);
  }
  .phrasal-row:last-child { border-bottom: none; }
  .phrasal-en { font-size: 14px; font-weight: 500; color: var(--lucid-400); min-width: 120px; font-family: var(--font-mono); }
  .phrasal-es { font-size: 13px; color: var(--text-secondary); }

  @media (max-width: 360px) {
    .modal-grid { grid-template-columns: 1fr; }
  }
`
