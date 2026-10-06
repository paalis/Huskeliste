import { DATE_PATTERN, parseNorwegianDate } from './date.js';

const DATE_IN_TEXT = new RegExp(`(?<![\\p{L}\\p{N}])(?:frist |til |på |innen )?(${DATE_PATTERN})(?![\\p{L}\\p{N}])`, 'iu');

function extractDate(text, now) {
  const match = text.match(DATE_IN_TEXT);
  if (!match) return { text: text.trim(), due: null, interpreted: null };
  const interpreted = parseNorwegianDate(match[1], now);
  return { text: text.replace(match[0], '').trim(), due: interpreted?.iso ?? null, interpreted };
}

export function parseCommand(input, now = new Date()) {
  const raw = input.trim();
  let match;
  if ((match = raw.match(/^(?:legg til|ny oppgave|husk(?: å)?)\s+(.+)$/i))) {
    const dated = extractDate(match[1], now);
    const priorityMatch = dated.text.match(/\s+(høy|middels|lav)\s+prioritet$/i);
    return { type:'add', title:(priorityMatch ? dated.text.replace(priorityMatch[0], '') : dated.text).trim(), due:dated.due, interpreted:dated.interpreted, priority:priorityMatch?.[1].toLowerCase() ?? 'middels' };
  }
  if ((match = raw.match(/^(?:finn|søk etter|vis)\s+(.+)$/i))) return { type:'find', query:match[1].trim() };
  if ((match = raw.match(/^(?:fullfør|ferdig med)\s+(.+)$/i))) return { type:'complete', query:match[1].trim() };
  if ((match = raw.match(/^(?:flytt|endre)\s+(.+?)\s+til\s+(.+)$/i))) {
    const interpreted = parseNorwegianDate(match[2], now);
    return interpreted ? { type:'move', query:match[1].trim(), due:interpreted.iso, interpreted } : { type:'unknownDate', value:match[2] };
  }
  if ((match = raw.match(/^(?:slett|fjern)\s+(.+)$/i))) return { type:'delete', query:match[1].trim() };
  return { type:'unknown' };
}

const STOPWORDS = new Set(['på','til','med','for','og','å','i','en','et','ei','den','det','de','min','mitt','mine','som','av','om']);
const words = text => text.toLocaleLowerCase('nb-NO').match(/[\p{L}\p{N}]+/gu)?.filter(w => !STOPWORDS.has(w)) ?? [];
// To ord regnes som like når det korteste (minst fire tegn) og starten av det lengste stemmer, så «melka» finner «melk».
function sameWord(a, b) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length < 4 ? short === long : long.startsWith(short.slice(0, Math.max(4, short.length - 2)));
}

export function findMatches(tasks, query) {
  const needle = query.toLocaleLowerCase('nb-NO');
  const exact = tasks.filter(t => t.title.toLocaleLowerCase('nb-NO').includes(needle));
  if (exact.length) return exact;
  // Ingen direkte treff: velg oppgavene som deler flest ord (også bøyde former) med søket.
  const wanted = words(query);
  if (!wanted.length) return [];
  const scored = tasks.map(t => { const have = words(t.title); return { t, score: wanted.filter(w => have.some(h => sameWord(w, h))).length / wanted.length }; });
  const best = Math.max(0, ...scored.map(s => s.score));
  return best >= 0.5 ? scored.filter(s => s.score === best).map(s => s.t) : [];
}
