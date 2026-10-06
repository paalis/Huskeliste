// Liten, egentrent språkmodell for hjelperen. Den kjører helt i nettleseren, uten nett og uten eksterne tjenester.
// Modellen har to deler, begge logistisk regresjon over hashede trekk:
//  - intensjon: hva brukeren vil (legge til, fullføre, flytte, slette, finne eller annet)
//  - merking: hvert ord merkes som oppgave (T), dato (D) eller fyllord (O)
// Datoer og prioritet tolkes deretter med de vanlige reglene. Trenes med scripts/train-model.js.
import { DATE_PATTERN, parseNorwegianDate } from './date.js';

export const DIM = 1 << 15;
export const INTENTS = ['add', 'complete', 'move', 'delete', 'find', 'other'];
export const LABELS = ['O', 'T', 'D'];

export function tokenize(text) {
  return (text.match(/\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) || []);
}

function hash(feature) {
  let h = 0x811c9dc5;
  for (let i = 0; i < feature.length; i++) { h ^= feature.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % DIM;
}

// Markerer ord som er del av et datouttrykk («på fredag», «om to dager»), et sterkt hint for merkingen.
function dateMask(words) {
  const mask = words.map(() => false);
  const re = new RegExp(`^(?:${DATE_PATTERN})$`);
  for (let i = 0; i < words.length; i++) for (let len = 4; len >= 1; len--) {
    if (i + len <= words.length && re.test(words.slice(i, i + len).join(' '))) { for (let k = i; k < i + len; k++) mask[k] = true; i += len - 1; break; }
  }
  return mask;
}

export function intentFeatures(words) {
  const f = ['bias', `f:${words[0] ?? ''}`, `f2:${words.slice(0, 2).join('_')}`, `l:${words.at(-1) ?? ''}`, `l2:${words.slice(-2).join('_')}`];
  words.forEach((w, i) => {
    f.push(`w:${w}`);
    if (i) f.push(`b:${words[i - 1]}_${w}`);
    const padded = `^${w}$`;
    for (let k = 0; k + 3 <= padded.length; k++) f.push(`c:${padded.slice(k, k + 3)}`);
  });
  return f.map(hash);
}

// prev er merket på forrige ord, slik at ord som hører sammen i en oppgave holdes samlet.
export function tagFeatures(words, i, intent, mask = dateMask(words), prev = '<s>') {
  const w = words[i], at = k => words[i + k] ?? (k < 0 ? '<s>' : '</s>');
  const f = ['bias', `w:${w}`, `p3:${w.slice(0, 3)}`, `s3:${w.slice(-3)}`, `-1:${at(-1)}`, `+1:${at(1)}`, `-2:${at(-2)}`, `+2:${at(2)}`,
    `-1w:${at(-1)}_${w}`, `w+1:${w}_${at(1)}`, `i:${intent}`, `iw:${intent}_${w}`, `i-1:${intent}_${at(-1)}`, `date:${mask[i]}`, `idate:${intent}_${mask[i]}`,
    `pos:${i === 0 ? 'first' : i === words.length - 1 ? 'last' : 'mid'}`, `num:${/\d/.test(w)}`,
    `pl:${prev}`, `plw:${prev}_${w}`, `pl+1:${prev}_${at(1)}`, `ipl:${intent}_${prev}`];
  return f.map(hash);
}

function scores(layer, features, classes) {
  const out = new Float64Array(classes);
  for (const index of features) { const row = layer.get(index); if (row) for (let c = 0; c < classes; c++) out[c] += row[c]; }
  return out;
}

export function softmax(values) {
  const max = Math.max(...values), exps = values.map(v => Math.exp(v - max)), sum = exps.reduce((a, b) => a + b, 0);
  return Array.from(exps, e => e / sum);
}

// Vektene lagres som 8-bits heltall i base64 for å holde filen liten.
export function encodeLayer(layer, classes) {
  const rows = [...layer.keys()].sort((a, b) => a - b);
  let max = 0;
  for (const row of layer.values()) for (const v of row) max = Math.max(max, Math.abs(v));
  const scale = max / 127 || 1, bytes = new Int8Array(rows.length * classes);
  rows.forEach((r, i) => layer.get(r).forEach((v, c) => { bytes[i * classes + c] = Math.round(v / scale); }));
  return { rows, scale, weights: Buffer.from(bytes.buffer).toString('base64') };
}

function decodeLayer({ rows, scale, weights }, classes) {
  const raw = atob(weights), layer = new Map();
  rows.forEach((r, i) => {
    const row = new Float32Array(classes);
    for (let c = 0; c < classes; c++) { const b = raw.charCodeAt(i * classes + c); row[c] = (b > 127 ? b - 256 : b) * scale; }
    layer.set(r, row);
  });
  return layer;
}

export function loadModel(json) {
  return { intent: decodeLayer(json.intent, INTENTS.length), tag: decodeLayer(json.tag, LABELS.length), frame: new Set(json.frame ?? []) };
}

export function predict(model, text) {
  const original = tokenize(text), words = original.map(w => w.toLocaleLowerCase('nb-NO'));
  if (!words.length) return { intent:'other', confidence:1, task:'', dateText:'' };
  const probs = softmax(scores(model.intent, intentFeatures(words), INTENTS.length));
  const best = probs.indexOf(Math.max(...probs)), intent = INTENTS[best], mask = dateMask(words);
  const labels = [];
  words.forEach((_, i) => { const s = scores(model.tag, tagFeatures(words, i, intent, mask, labels[i - 1] ?? '<s>'), LABELS.length); labels.push(LABELS[s.indexOf(Math.max(...s))]); });
  // Bare ord som faktisk inngår i et datouttrykk (pluss «på/til/innen» rett foran) kan være dato.
  const preposition = i => /^(på|til|innen|frist)$/.test(words[i]) && mask[i + 1];
  labels.forEach((label, i) => { if (label === 'D' && !mask[i] && !preposition(i)) labels[i] = labels[i - 1] === 'T' || labels[i + 1] === 'T' ? 'T' : 'O'; });
  // Finner merkingen ingen oppgave, brukes ordene som verken er fyllord eller dato.
  if (intent !== 'other' && !labels.includes('T')) words.forEach((w, i) => { if (labels[i] === 'O' && !model.frame.has(w)) labels[i] = 'T'; });
  const pick = label => original.filter((_, i) => labels[i] === label).join(' ');
  return { intent, confidence: probs[best], task: pick('T'), dateText: words.filter((_, i) => labels[i] === 'D').join(' ') };
}

// Gjør modellens tolkning om til samme kommandoformat som de faste reglene i commands.js.
export function interpret(model, text, now = new Date(), threshold = 0.55) {
  const p = predict(model, text);
  if (p.intent === 'other' || p.confidence < threshold) return { type:'unknown' };
  const interpreted = p.dateText ? parseNorwegianDate(p.dateText, now) : null;
  if (p.intent === 'add') {
    const priority = text.match(/\b(høy|middels|lav)\s+prioritet/i)?.[1].toLowerCase() ?? 'middels';
    return { type:'add', title:p.task, due:interpreted?.iso ?? null, interpreted, priority };
  }
  if (!p.task) return { type:'unknown' };
  if (p.intent === 'move') return interpreted ? { type:'move', query:p.task, due:interpreted.iso, interpreted } : { type:'unknownDate', value:p.dateText || text.trim() };
  return { type:p.intent, query:p.task };
}
