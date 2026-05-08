/* ──────────────────────────────────────────────────────────────
   Idiomatix — Textos graduados para modo lectura
   Niveles: A1 · A2 · B1 · B2 por idioma
   Cada texto tiene: id, nivel, título, cuerpo y vocabulario clave
────────────────────────────────────────────────────────────── */

import type { LanguageCode, CEFRLevel } from '@/types'

export interface ReadingText {
  id: string
  lang: LanguageCode
  level: CEFRLevel
  title: string
  subtitle?: string
  body: string            // Texto completo con párrafos (\n\n)
  wordCount: number
  readingTimeMin: number
  keyWords: Array<{       // Vocabulario clave para el panel lateral
    word: string
    translation: string
    phonetic?: string
  }>
}

export const READING_TEXTS: ReadingText[] = [

  // ── RUSO ─────────────────────────────────────────────────────

  {
    id: 'ru-a1-familia',
    lang: 'ru', level: 'A1',
    title: 'Моя семья',
    subtitle: 'Mi familia',
    wordCount: 85,
    readingTimeMin: 1,
    body: `Меня зовут Иван. Мне двадцать пять лет. Я живу в Москве.

У меня есть семья. Моя мама зовут Анна. Мой папа зовут Сергей. У меня есть сестра. Её зовут Мария. Ей семнадцать лет.

Мы живём в большом доме. Дома у нас есть кошка. Её зовут Мурка. Мурка — белая и маленькая.

Я люблю свою семью. Мы вместе едим, смотрим телевизор и гуляем в парке.`,
    keyWords: [
      { word: 'семья', translation: 'familia', phonetic: '/sim·yá/' },
      { word: 'мама', translation: 'mamá', phonetic: '/má·ma/' },
      { word: 'папа', translation: 'papá', phonetic: '/pá·pa/' },
      { word: 'сестра', translation: 'hermana', phonetic: '/sist·rá/' },
      { word: 'кошка', translation: 'gata', phonetic: '/kósh·ka/' },
      { word: 'вместе', translation: 'juntos', phonetic: '/vmés·ti/' },
    ],
  },

  {
    id: 'ru-a2-город',
    lang: 'ru', level: 'A2',
    title: 'Мой любимый город',
    subtitle: 'Mi ciudad favorita',
    wordCount: 120,
    readingTimeMin: 2,
    body: `Я живу в Санкт-Петербурге. Это очень красивый город на севере России. Город стоит на реке Нева.

В Санкт-Петербурге есть много интересных мест. Эрмитаж — это знаменитый музей. Там можно увидеть картины и скульптуры из разных стран мира. Я хожу туда иногда.

Летом в Петербурге бывают белые ночи. Это значит, что ночью светло почти как днём. Туристы приезжают специально, чтобы увидеть это явление.

Зимой здесь холодно, но красиво. Я люблю гулять по набережной реки в снегопад.`,
    keyWords: [
      { word: 'знаменитый', translation: 'famoso', phonetic: '/zna·mi·ní·tyj/' },
      { word: 'картина', translation: 'cuadro/pintura', phonetic: '/kar·tí·na/' },
      { word: 'белые ночи', translation: 'noches blancas' },
      { word: 'набережная', translation: 'paseo fluvial/malecón', phonetic: '/ná·bi·rizh·na·ya/' },
      { word: 'снегопад', translation: 'nevada', phonetic: '/sni·ga·pát/' },
    ],
  },

  {
    id: 'ru-b1-технологии',
    lang: 'ru', level: 'B1',
    title: 'Технологии в нашей жизни',
    subtitle: 'La tecnología en nuestra vida',
    wordCount: 160,
    readingTimeMin: 2,
    body: `Современные технологии изменили нашу жизнь до неузнаваемости. Сегодня трудно представить день без смартфона или интернета.

С одной стороны, технологии приносят огромную пользу. Мы можем общаться с людьми на другом конце света, мгновенно находить нужную информацию и работать из любого места. Медицина, образование, транспорт — все эти сферы стали более эффективными благодаря цифровым инновациям.

С другой стороны, существуют и серьёзные проблемы. Многие люди проводят слишком много времени в социальных сетях. Это влияет на их психологическое здоровье и реальные отношения.

Поэтому важно найти баланс. Технологии должны помогать нам, а не управлять нами.`,
    keyWords: [
      { word: 'до неузнаваемости', translation: 'de forma irreconocible' },
      { word: 'с одной стороны', translation: 'por un lado' },
      { word: 'с другой стороны', translation: 'por otro lado' },
      { word: 'благодаря', translation: 'gracias a', phonetic: '/bla·ga·da·ryá/' },
      { word: 'баланс', translation: 'equilibrio', phonetic: '/ba·láns/' },
    ],
  },

  {
    id: 'ru-b2-окружающая',
    lang: 'ru', level: 'B2',
    title: 'Экологические проблемы современности',
    subtitle: 'Los problemas ecológicos de la actualidad',
    wordCount: 200,
    readingTimeMin: 3,
    body: `Изменение климата стало одной из наиболее острых проблем нашего времени. Учёные фиксируют повышение средней температуры на планете, таяние ледников и участившиеся экстремальные природные явления.

Основной причиной этих изменений считается деятельность человека, прежде всего промышленные выбросы углекислого газа. Следовательно, решение проблемы требует кардинального пересмотра нашего отношения к природным ресурсам.

На международном уровне предпринимаются попытки скоординировать усилия различных стран. Такие соглашения, как Парижское, ставят конкретные цели по сокращению выбросов. Тем не менее, эффективность этих мер вызывает споры.

Что касается индивидуального вклада, каждый из нас способен изменить потребительские привычки. Переход на возобновляемые источники энергии, сокращение использования пластика и осознанное потребление — всё это, в совокупности, может дать весомый результат.`,
    keyWords: [
      { word: 'таяние ледников', translation: 'derretimiento de glaciares' },
      { word: 'прежде всего', translation: 'ante todo / principalmente' },
      { word: 'кардинальный', translation: 'radical / fundamental' },
      { word: 'скоординировать', translation: 'coordinar' },
      { word: 'возобновляемые источники', translation: 'fuentes renovables' },
      { word: 'осознанное потребление', translation: 'consumo consciente' },
    ],
  },

  // ── ALEMÁN ───────────────────────────────────────────────────

  {
    id: 'de-a1-schule',
    lang: 'de', level: 'A1',
    title: 'Mein Schultag',
    subtitle: 'Mi día escolar',
    wordCount: 90,
    readingTimeMin: 1,
    body: `Ich heiße Felix. Ich bin zwölf Jahre alt. Ich gehe in die Schule.

Die Schule beginnt um acht Uhr. Ich stehe um sieben auf. Ich frühstücke mit meiner Familie.

Mein Lieblungsfach ist Mathematik. Mein Lehrer heißt Herr Schmidt. Er ist sehr nett.

Um ein Uhr ist die Schule zu Ende. Dann gehe ich nach Hause. Ich mache meine Hausaufgaben und spiele mit meinem Freund.`,
    keyWords: [
      { word: 'Schule', translation: 'escuela', phonetic: '/shú·le/' },
      { word: 'Lieblungsfach', translation: 'asignatura favorita' },
      { word: 'Hausaufgaben', translation: 'deberes / tareas' },
      { word: 'frühstücken', translation: 'desayunar', phonetic: '/früh·stü·ken/' },
    ],
  },

  {
    id: 'de-a2-wohnung',
    lang: 'de', level: 'A2',
    title: 'Meine neue Wohnung',
    subtitle: 'Mi nuevo apartamento',
    wordCount: 115,
    readingTimeMin: 2,
    body: `Ich habe eine neue Wohnung. Sie liegt im dritten Stock. Es gibt drei Zimmer: ein Wohnzimmer, ein Schlafzimmer und eine Küche. Das Badezimmer ist klein, aber modern.

Das Wohnzimmer gefällt mir am besten. Dort habe ich ein großes Sofa und einen Fernseher. Manchmal lade ich Freunde ein, und wir schauen Filme zusammen.

Die Wohnung ist nicht weit vom Stadtzentrum. Mit der U-Bahn brauche ich nur zehn Minuten. Das ist sehr praktisch, weil ich in der Innenstadt arbeite.

Ich bezahle achthundert Euro Miete pro Monat. Das ist teuer, aber die Lage ist gut.`,
    keyWords: [
      { word: 'Wohnzimmer', translation: 'salón / sala de estar' },
      { word: 'Schlafzimmer', translation: 'dormitorio' },
      { word: 'einladen', translation: 'invitar (verbo separable)' },
      { word: 'Miete', translation: 'alquiler', phonetic: '/mí·te/' },
      { word: 'Innenstadt', translation: 'centro de la ciudad' },
    ],
  },

  {
    id: 'de-b1-umwelt',
    lang: 'de', level: 'B1',
    title: 'Technologie im Alltag',
    subtitle: 'La tecnología en el día a día',
    wordCount: 155,
    readingTimeMin: 2,
    body: `Die moderne Technologie hat unser Leben stark verändert. Heutzutage ist es schwer, sich einen Tag ohne Smartphone oder Internet vorzustellen.

Einerseits bringt die Technologie viele Vorteile. Wir können mit Menschen auf der ganzen Welt kommunizieren, schnell Informationen finden und von überall arbeiten. Medizin, Bildung und Verkehr sind dank digitaler Neuerungen effizienter geworden.

Andererseits gibt es auch ernsthafte Probleme. Viele Menschen verbringen zu viel Zeit in sozialen Netzwerken, was sich auf ihre psychische Gesundheit auswirkt.

Deshalb ist es wichtig, eine Balance zu finden. Technologie sollte uns helfen, nicht uns kontrollieren.`,
    keyWords: [
      { word: 'einerseits … andererseits', translation: 'por un lado … por otro lado' },
      { word: 'heutzutage', translation: 'hoy en día' },
      { word: 'dank', translation: 'gracias a (+ Genitiv)' },
      { word: 'sich auswirken auf', translation: 'repercutir en / afectar a' },
      { word: 'Balance', translation: 'equilibrio' },
    ],
  },

  {
    id: 'de-b2-klimawandel',
    lang: 'de', level: 'B2',
    title: 'Der Klimawandel — Ursachen und Folgen',
    subtitle: 'El cambio climático — causas y consecuencias',
    wordCount: 195,
    readingTimeMin: 3,
    body: `Der Klimawandel gilt als eine der dringlichsten Herausforderungen unserer Zeit. Wissenschaftler dokumentieren einen stetigen Anstieg der globalen Durchschnittstemperatur, das Abschmelzen der Polkappen und eine Zunahme extremer Wetterereignisse.

Als Hauptursache gilt menschliches Handeln, insbesondere industrielle Treibhausgasemissionen. Infolgedessen erfordert die Lösung dieses Problems ein grundlegendes Umdenken im Umgang mit natürlichen Ressourcen.

Auf internationaler Ebene werden Anstrengungen unternommen, die Bemühungen verschiedener Länder zu koordinieren. Abkommen wie das Pariser Abkommen setzen konkrete Ziele zur Emissionsreduzierung. Nichtsdestotrotz wird die Wirksamkeit dieser Maßnahmen kontrovers diskutiert.

Was den individuellen Beitrag betrifft, kann jeder Einzelne seine Konsumgewohnheiten ändern. Der Umstieg auf erneuerbare Energiequellen, die Reduzierung von Plastik und ein bewusster Konsum können zusammen einen wesentlichen Beitrag leisten.`,
    keyWords: [
      { word: 'dringlich', translation: 'urgente / apremiante' },
      { word: 'Treibhausgasemissionen', translation: 'emisiones de gases de efecto invernadero' },
      { word: 'Umdenken', translation: 'cambio de mentalidad' },
      { word: 'erneuerbare Energiequellen', translation: 'fuentes de energía renovables' },
      { word: 'bewusster Konsum', translation: 'consumo consciente' },
    ],
  },

  // ── INGLÉS ───────────────────────────────────────────────────

  {
    id: 'en-a1-family',
    lang: 'en', level: 'A1',
    title: 'My Family',
    subtitle: 'Mi familia',
    wordCount: 88,
    readingTimeMin: 1,
    body: `My name is Maria. I am twenty years old. I live in a small town.

I have a big family. My mother's name is Elena. My father's name is Carlos. I have two brothers. Their names are Luis and Pablo.

We live in a house with a garden. We have a dog. His name is Max. Max is big and brown.

I love my family. We eat dinner together every evening. We talk and laugh a lot.`,
    keyWords: [
      { word: 'family', translation: 'familia' },
      { word: 'garden', translation: 'jardín' },
      { word: 'together', translation: 'juntos' },
      { word: 'evening', translation: 'noche / tarde' },
    ],
  },

  {
    id: 'en-a2-city',
    lang: 'en', level: 'A2',
    title: 'Life in the City',
    subtitle: 'La vida en la ciudad',
    wordCount: 118,
    readingTimeMin: 2,
    body: `I live in London. It is a very big and exciting city. There are millions of people from all over the world.

London has many famous places. Buckingham Palace, the Tower of London, and the British Museum are some of the most popular. I visit them sometimes with tourists from other countries.

The city has great public transport. I usually take the underground, which locals call the Tube. It is fast and convenient, although it gets very crowded during rush hour.

In the evenings, I like to walk by the Thames. The view of the bridges at night is beautiful. I never get tired of this city.`,
    keyWords: [
      { word: 'exciting', translation: 'emocionante' },
      { word: 'convenient', translation: 'cómodo / práctico' },
      { word: 'crowded', translation: 'concurrido / lleno de gente' },
      { word: 'rush hour', translation: 'hora punta' },
      { word: 'get tired of', translation: 'cansarse de' },
    ],
  },

  {
    id: 'en-b1-technology',
    lang: 'en', level: 'B1',
    title: 'Technology in Our Lives',
    subtitle: 'La tecnología en nuestras vidas',
    wordCount: 158,
    readingTimeMin: 2,
    body: `Modern technology has transformed our lives dramatically. Today, it is hard to imagine a single day without a smartphone or internet access.

On one hand, technology brings enormous benefits. We can communicate with people across the globe, find information instantly, and work from anywhere. Medicine, education, and transport have all become more efficient thanks to digital innovation.

On the other hand, there are serious drawbacks. Many people spend too much time on social media, which affects their mental health and face-to-face relationships.

Therefore, it is important to find a balance. Technology should serve us, not control us. Being mindful of how and why we use our devices can make a real difference.`,
    keyWords: [
      { word: 'dramatically', translation: 'drásticamente / de forma notable' },
      { word: 'on one hand … on the other hand', translation: 'por un lado … por otro lado' },
      { word: 'drawback', translation: 'inconveniente / desventaja' },
      { word: 'mindful', translation: 'consciente / atento' },
    ],
  },

  {
    id: 'en-b2-climate',
    lang: 'en', level: 'B2',
    title: 'Climate Change: Causes and Solutions',
    subtitle: 'Cambio climático: causas y soluciones',
    wordCount: 198,
    readingTimeMin: 3,
    body: `Climate change has emerged as one of the most pressing challenges of our time. Scientists are documenting a steady rise in global average temperatures, the melting of polar ice caps, and an increase in extreme weather events.

Human activity is widely considered the primary cause, particularly industrial greenhouse gas emissions. Consequently, addressing this crisis demands a fundamental rethinking of our relationship with natural resources.

At the international level, efforts are being made to coordinate action across nations. Agreements such as the Paris Agreement set concrete targets for reducing emissions. Nevertheless, the effectiveness of these measures remains a subject of debate.

With regard to individual contribution, each of us has the power to change our consumption habits. Switching to renewable energy, reducing plastic use, and adopting a more conscious approach to consumption can, taken together, make a significant difference. The question is no longer whether we can afford to act — it is whether we can afford not to.`,
    keyWords: [
      { word: 'pressing', translation: 'urgente / apremiante' },
      { word: 'greenhouse gas emissions', translation: 'emisiones de gases de efecto invernadero' },
      { word: 'rethinking', translation: 'replanteamiento' },
      { word: 'renewable energy', translation: 'energía renovable' },
      { word: 'conscious', translation: 'consciente / responsable' },
    ],
  },
]

/** Filtra textos por idioma y/o nivel */
export function getReadingTexts(
  lang?: LanguageCode,
  level?: CEFRLevel
): ReadingText[] {
  return READING_TEXTS.filter(t =>
    (!lang  || t.lang  === lang) &&
    (!level || t.level === level)
  )
}
