import { parseNorwegianDate } from './date.js';

function extractDate(text, now) {
  const match = text.match(/(?:frist |til |på )?(i dag|i morgen|om \d+ dager?|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/i);
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

export function findMatches(tasks, query) {
  const needle = query.toLocaleLowerCase('nb-NO');
  return tasks.filter(t => t.title.toLocaleLowerCase('nb-NO').includes(needle));
}
