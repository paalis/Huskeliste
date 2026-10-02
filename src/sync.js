const time = value => Date.parse(value ?? 0) || 0;
const changed = task => time(task.updatedAt ?? task.createdAt);

export function toRow(task) {
  return { id:task.id, title:task.title, due:task.due ?? null, priority:task.priority ?? 'middels', completed:Boolean(task.completed),
    created_at:task.createdAt ?? new Date().toISOString(), updated_at:task.updatedAt ?? task.createdAt ?? new Date().toISOString(), deleted_at:null };
}

export function fromRow(row) {
  return { id:row.id, title:row.title, due:row.due, priority:row.priority, completed:row.completed, createdAt:row.created_at, updatedAt:row.updated_at };
}

// Den nyeste versjonen vinner. Slettede rader i Supabase har deleted_at satt, slik at slettingen når alle enheter.
export function mergeTasks(local, remote) {
  const mine = new Map(local.map(t => [t.id, t]));
  const toLocal = [], toRemove = [], toRemote = [];
  for (const row of remote) {
    const task = mine.get(row.id);
    mine.delete(row.id);
    if (task && changed(task) > time(row.updated_at)) toRemote.push(toRow(task));
    else if (row.deleted_at) { if (task) toRemove.push(row.id); }
    else if (!task || time(row.updated_at) > changed(task)) toLocal.push(fromRow(row));
  }
  for (const task of mine.values()) toRemote.push(toRow(task));
  return { toLocal, toRemove, toRemote };
}
