// Trener hjelperens lille språkmodell og lagrer den i src/model.json. Kjør med `npm run train`.
// Treningsdataene lages av norske setningsmaler, oppgaver og datoer. Noen oppgaver og maler holdes helt
// utenfor treningen og brukes bare til å måle hvor godt modellen forstår setninger den ikke har sett.
import { writeFile } from 'node:fs/promises';
import { DIM, INTENTS, LABELS, tokenize, intentFeatures, tagFeatures, softmax, encodeLayer } from '../src/nlu.js';

let seed = 42;
const random = () => ((seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 | 0) >>> 0) / 2 ** 32;
const pick = list => list[Math.floor(random() * list.length)];
const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };

// Oppgaver som handlinger (til «legg til») og som korte navn (til «fullfør», «flytt» osv.).
const ACTIONS = ['ringe tannlegen','handle melk','betale strømregningen','hente pakken på posten','vaske bilen','kjøpe gave til mamma','bestille time hos legen','levere bøker på biblioteket','svare på e-post fra sjefen','klippe plenen','pante flasker','sende søknaden','rydde garasjen','skifte dekk','vanne blomstene','handle mat til helgen','betale husleie','ringe bestemor','booke flybilletter','fornye passet','trene','gå tur med hunden','kjøpe brød','hente barna i barnehagen','lage middag','vaske klær','tømme oppvaskmaskinen','sjekke posten','bestille pizza','reparere sykkelen','male gjerdet','kjøpe kaffe','sende regningen','lese rapporten','forberede møtet','ringe rørleggeren','kansellere abonnementet','levere selvangivelsen','kjøpe bursdagsgave','skrive handleliste','støvsuge stua','bytte lyspære','hente medisin på apoteket','ta med søppel','ringe forsikringsselskapet','betale parkeringsboten','planlegge ferien','oppdatere telefonen','lade elsykkelen','kjøpe blomster','gå på fotballtrening','dra til frisøren','være med på foreldremøtet','kjøre til hytta','ta med kake til jobben','sende gave til Kari','spise middag med Per','møte Ola på kafé'];
const NAMES = ['tannlegen','melka','strømregningen','pakken','bilvasken','gaven til mamma','legetimen','bøkene','e-posten til sjefen','plenen','flaskene','søknaden','garasjen','dekkskiftet','blomstene','husleia','bestemor','flybillettene','passet','treningen','hundeturen','brødet','barnehagen','middagen','klesvasken','oppvaskmaskinen','posten','pizzaen','sykkelen','gjerdet','kaffen','regningen','rapporten','møtet','rørleggeren','abonnementet','selvangivelsen','bursdagsgaven','handlelista','støvsugingen','lyspæra','medisinen','søppelet','forsikringen','parkeringsboten','ferien','telefonen','elsykkelen','blomstene til jubileet','kontrollen på verkstedet','fotballtreningen','frisøren','foreldremøtet','hytteturen','kaka til jobben','gaven til Kari','middagen med Per'];
const IMPERATIVES = ['ring tannlegen','handle melk','betal strømregningen','hent pakken på posten','vask bilen','kjøp gave til mamma','bestill time hos legen','lever bøkene','svar på e-posten','klipp plenen','pant flaskene','send søknaden','rydd garasjen','skift dekk','vann blomstene','betal husleia','ring bestemor','book flybilletter','forny passet','kjøp brød','hent barna','lag middag','tøm oppvaskmaskinen','bestill pizza','reparer sykkelen','ring mamma','kjøp melk','send regningen','les rapporten','ring rørleggeren','kjøp blomster','sjekk posten','bytt lyspære','ta med søppel'];
const PLACES = ['fotballtrening','foreldremøte','tannlegen','jobbintervju','legen','frisøren','kino','konsert','svømming','korøvelse','møte med banken','bursdagsfeiring','hytta','butikken'];
const DATES = ['i dag','i morgen','i overmorgen','på mandag','på tirsdag','på onsdag','på torsdag','på fredag','på lørdag','på søndag','mandag','onsdag','fredag','søndag','neste fredag','neste mandag','neste uke','om to dager','om tre dager','om 5 dager','om en uke','om to uker','til fredag','til i morgen','12.10','3.11','24.12','innen fredag'];
const PRIORITIES = ['høy prioritet','lav prioritet','middels prioritet'];

// Maler: {t} = oppgave, {d} = dato. Maler merket test brukes bare til måling.
const TEMPLATES = {
  add: [['legg til {t}'],['legg til {t} {d}'],['husk å {t}'],['husk å {t} {d}'],['minn meg på å {t}'],['minn meg på å {t} {d}'],['ikke glem å {t}'],['ikke glem å {t} {d}'],['jeg må {t}'],['jeg må {t} {d}'],['jeg skal {t} {d}'],['noter at jeg må {t}'],['skriv opp {t}'],['ny oppgave {t}'],['kan du legge til {t}'],['kan du legge til {t} {d}'],['kan du minne meg på å {t} {d}'],['legg inn {t} {d}'],['lag en påminnelse om å {t}'],['jeg trenger å {t}'],['{d} må jeg {t}'],['{d} skal jeg {t}'],['husk at jeg skal {t} {d}'],['sett opp {t} {d}'],['legg til at jeg må {t}'],['må huske å {t}'],['jeg har glemt å {t}, legg det til'],['{i}'],['{i} {d}'],['{d} {i}'],['jeg skal på {p} {d}'],['husk at jeg skal på {p} {d}'],['jeg skal til {p} {d}'],['minn meg på {p} {d}'],['{d} er det {p}'],['legg inn {p} {d}'],
    ['minn meg om å {t} {d}', true],['få meg til å huske å {t}', true],['{d} burde jeg {t}', true],['skriv ned at jeg skal {t} {d}', true]],
  complete: [['fullfør {t}'],['{t} er gjort'],['{t} er ferdig'],['hak av {t}'],['kryss av {t}'],['marker {t} som ferdig'],['marker {t} som gjort'],['ferdig med {t}'],['jeg er ferdig med {t}'],['kan du hake av {t}'],['{t} er fikset'],['{t} er unnagjort'],['sett {t} som fullført'],['{t} kan hakes av'],['jeg har gjort {t}'],['{t} er klart'],['har fikset {t}'],['{t} er kjøpt'],['{t} er betalt'],['{t} er levert'],['{t} er sendt'],['{t} er handlet'],['{t} er ringt'],['{t} er hentet'],['{t} er vasket'],['{t} er ordnet'],
    ['{t} er i boks', true],['du kan krysse av {t}', true],['nå er {t} gjort', true]],
  move: [['flytt {t} til {d}'],['utsett {t} til {d}'],['endre {t} til {d}'],['{t} må flyttes til {d}'],['kan du flytte {t} til {d}'],['sett {t} til {d}'],['skyv {t} til {d}'],['{t} blir {d} i stedet'],['flytt {t} {d}'],['utsett {t}  {d}'],['jeg tar {t} {d} i stedet'],['endre datoen på {t} til {d}'],['{t} skal være {d}'],
    ['legg {t} på {d} i stedet', true],['{t} passer bedre {d}', true],['kan {t} vente til {d}', true]],
  delete: [['slett {t}'],['fjern {t}'],['ta bort {t}'],['dropp {t}'],['kan du slette {t}'],['jeg trenger ikke {t} lenger'],['{t} skal bort'],['stryk {t}'],['fjern {t} fra lista'],['slett oppgaven {t}'],['{t} er ikke aktuelt lenger'],['glem {t}'],
    ['bare kast {t}', true],['{t} kan slettes', true],['vi dropper {t}', true]],
  find: [['finn {t}'],['søk etter {t}'],['har jeg {t}'],['når skal jeg {t}'],['når er {t}'],['vis {t}'],['står {t} på lista'],['har jeg lagt inn {t}'],['hvor er {t}'],['finn oppgaven {t}'],['når var {t} igjen'],['hva med {t}'],
    ['sjekk om {t} ligger inne', true],['har jeg husket {t}', true],['leter etter {t}', true]],
  other: [['hei'],['hallo'],['takk'],['tusen takk'],['hva kan du'],['hvordan går det'],['god morgen'],['god natt'],['hjelp'],['hva er klokka'],['fortell en vits'],['ok'],['flott'],['hvem er du'],['hva gjør du'],['kult'],['nei'],['ja'],['hva heter du'],['hvordan virker dette'],['jeg er sliten'],['for et vær'],
    ['heisann', true],['hva skjer', true],['takk skal du ha', true]]
};
const PREFIXES = ['', '', '', '', 'hei, ', 'du, ', 'kjære hjelper, ', 'ok ', 'kan du '];
const SUFFIXES = ['', '', '', '', ' takk', ' er du snill', ' da', '!'];

function example(intent, [template], { tasks, names }, split) {
  // Oppgaver omtales både som navn («tannlegen») og slik de ble skrevet inn («ringe tannlegen», «ring mamma»).
  const imperatives = IMPERATIVES.filter((_, k) => (k % 5 === 0) === (split === 'test'));
  const r = random(), task = intent === 'add' ? pick(r < 0.25 ? names : tasks) : pick(r < 0.55 ? names : r < 0.8 ? tasks : imperatives), date = pick(DATES);
  const parts = [], labels = [];
  const push = (text, label) => tokenize(text).forEach(w => { parts.push(w); labels.push(label); });
  // Ordene i malen merkes som fyllord (O); prefiks og suffiks kommer i tillegg.
  const prefix = intent === 'other' || template.startsWith('kan du') ? '' : pick(PREFIXES);
  push(prefix, 'O');
  for (const piece of template.split(/(\{t\}|\{d\}|\{p\})/)) {
    if (piece === '{t}') push(task, 'T'); else if (piece === '{i}') push(pick(split === 'test' ? IMPERATIVES.filter((_, k) => k % 5 === 0) : IMPERATIVES.filter((_, k) => k % 5)), 'T'); else if (piece === '{p}') push(pick(PLACES), 'T'); else if (piece === '{d}') push(date, 'D'); else push(piece, 'O');
  }
  if (intent === 'add' && random() < 0.2) push(pick(PRIORITIES), 'O');
  push(pick(SUFFIXES), 'O');
  const words = parts.map(w => w.toLocaleLowerCase('nb-NO'));
  return { intent, words, labels };
}

function dataset(count, split) {
  const pool = { tasks: ACTIONS.filter((_, i) => (i % 5 === 0) === (split === 'test')), names: NAMES.filter((_, i) => (i % 5 === 0) === (split === 'test')) };
  const out = [];
  for (let n = 0; n < count; n++) {
    const intent = INTENTS[n % INTENTS.length];
    const templates = TEMPLATES[intent].filter(t => split === 'test' || !t[1]);
    out.push(example(intent, pick(templates), pool, split));
  }
  return shuffle(out);
}

// Softmax-regresjon trent med AdaGrad og L2-regularisering.
function train(samples, classes, toFeatures, toTarget, epochs = 12, rate = 0.3, l2 = 1e-5) {
  const layer = new Map(), grad2 = new Map();
  const row = (map, i) => { let r = map.get(i); if (!r) map.set(i, r = new Float64Array(classes)); return r; };
  for (let epoch = 0; epoch < epochs; epoch++) for (const s of shuffle(samples)) {
    const feats = toFeatures(s), target = toTarget(s), z = new Float64Array(classes);
    for (const i of feats) { const r = layer.get(i); if (r) for (let c = 0; c < classes; c++) z[c] += r[c]; }
    const p = softmax(z);
    for (const i of feats) {
      const w = row(layer, i), g2 = row(grad2, i);
      for (let c = 0; c < classes; c++) { const g = p[c] - (c === target ? 1 : 0) + l2 * w[c]; g2[c] += g * g; w[c] -= rate * g / Math.sqrt(g2[c] + 1e-8); }
    }
  }
  return layer;
}

const argmax = (layer, feats, classes) => { const z = new Float64Array(classes); for (const i of feats) { const r = layer.get(i); if (r) for (let c = 0; c < classes; c++) z[c] += r[c]; } return z.indexOf(Math.max(...z)); };

const trainSet = dataset(18000, 'train'), testSet = dataset(3000, 'test');
const tokens = set => set.flatMap(s => s.words.map((_, i) => ({ s, i })));

const intentLayer = train(trainSet, INTENTS.length, s => intentFeatures(s.words), s => INTENTS.indexOf(s.intent));
const tagLayer = train(tokens(trainSet), LABELS.length, ({ s, i }) => tagFeatures(s.words, i, s.intent, undefined, s.labels[i - 1] ?? '<s>'), ({ s, i }) => LABELS.indexOf(s.labels[i]), 4);

const intentAcc = testSet.filter(s => INTENTS[argmax(intentLayer, intentFeatures(s.words), INTENTS.length)] === s.intent).length / testSet.length;
const tagSentence = s => { const out = []; s.words.forEach((_, i) => out.push(LABELS[argmax(tagLayer, tagFeatures(s.words, i, s.intent, undefined, out[i - 1] ?? '<s>'), LABELS.length)])); return out; };
const spanAcc = testSet.filter(s => tagSentence(s).every((l, i) => l === s.labels[i])).length / testSet.length;
console.log(`Testsett (${testSet.length} setninger med nye oppgaver og nye formuleringer):`);
console.log(`  riktig intensjon: ${(intentAcc * 100).toFixed(1)} %`);
console.log(`  hele setningen riktig merket: ${(spanAcc * 100).toFixed(1)} %`);

// Fyllord: ord som nesten alltid er en del av formuleringen og nesten aldri av selve oppgaven.
const counts = new Map();
for (const s of trainSet) s.words.forEach((w, i) => { const c = counts.get(w) ?? { O:0, T:0 }; if (s.labels[i] !== 'D') c[s.labels[i]]++; counts.set(w, c); });
const frame = [...counts].filter(([, c]) => c.O >= 5 && c.O > 10 * c.T).map(([w]) => w).sort();
const model = { version: 1, dim: DIM, intents: INTENTS, labels: LABELS, frame, intent: encodeLayer(intentLayer, INTENTS.length), tag: encodeLayer(tagLayer, LABELS.length) };
await writeFile(new URL('../src/model.json', import.meta.url), JSON.stringify(model));
if (process.env.DEBUG) for (const s of testSet.filter(s => INTENTS[argmax(intentLayer, intentFeatures(s.words), INTENTS.length)] !== s.intent).slice(0, 25)) console.log('  feil:', s.intent, '→', INTENTS[argmax(intentLayer, intentFeatures(s.words), INTENTS.length)], '|', s.words.join(' '));
console.log(`Lagret src/model.json (${(JSON.stringify(model).length / 1024).toFixed(0)} kB)`);
