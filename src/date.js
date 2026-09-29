const DAY = 86400000;

export function localISO(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function parseNorwegianDate(text, now = new Date()) {
  const value = text.trim().toLowerCase();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let date;
  if (/^i dag$/.test(value)) date = base;
  else if (/^i morgen$/.test(value)) date = new Date(base.getTime() + DAY);
  else if (/^om (\d+) dager?$/.test(value)) date = new Date(base.getTime() + Number(value.match(/\d+/)[0]) * DAY);
  else {
    const match = value.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
    if (!match) return null;
    let year = match[3] ? Number(match[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    if (date.getDate() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) return null;
  }
  return { iso: localISO(date), label: new Intl.DateTimeFormat('nb-NO', { weekday:'long', day:'numeric', month:'long' }).format(date) };
}
