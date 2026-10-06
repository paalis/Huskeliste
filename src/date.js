const DAY = 86400000;
const WEEKDAYS = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
const NUMBERS = { en:1, ett:1, 'én':1, to:2, tre:3, fire:4, fem:5, seks:6, sju:7, syv:7, 'åtte':8, ni:9, ti:10 };
const COUNT = `\\d+|${Object.keys(NUMBERS).join('|')}`;

// Datouttrykk som både reglene og modellen kjenner igjen i en setning.
export const DATE_PATTERN = `i dag|i morgen|i overmorgen|neste uke|om (?:${COUNT}) (?:dager?|dag|uker?|uke)|(?:neste )?(?:${WEEKDAYS.join('|')})|\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?`;

export function localISO(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const count = word => /^\d+$/.test(word) ? Number(word) : NUMBERS[word];

export function parseNorwegianDate(text, now = new Date()) {
  const value = text.trim().toLowerCase().replace(/^(?:på|til|frist|innen)\s+/, '');
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const plusDays = n => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  let date, match;
  if (/^i dag$/.test(value)) date = base;
  else if (/^i morgen$/.test(value)) date = plusDays(1);
  else if (/^i overmorgen$/.test(value)) date = plusDays(2);
  // «Neste uke» betyr mandag neste uke.
  else if (/^neste uke$/.test(value)) date = plusDays(((8 - base.getDay()) % 7) || 7);
  else if ((match = value.match(new RegExp(`^om (${COUNT}) (dager?|dag|uker?|uke)$`)))) date = plusDays(count(match[1]) * (match[2].startsWith('uke') ? 7 : 1));
  // En ukedag betyr neste gang den dagen kommer, aldri i dag.
  else if ((match = value.match(new RegExp(`^(?:neste )?(${WEEKDAYS.join('|')})$`)))) date = plusDays(((WEEKDAYS.indexOf(match[1]) - base.getDay() + 7) % 7) || 7);
  else {
    match = value.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
    if (!match) return null;
    let year = match[3] ? Number(match[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    if (date.getDate() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) return null;
  }
  return { iso: localISO(date), label: new Intl.DateTimeFormat('nb-NO', { weekday:'long', day:'numeric', month:'long' }).format(date) };
}
