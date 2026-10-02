import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTasks, toRow, fromRow } from '../src/sync.js';
import { configSource } from '../scripts/config.js';

const task = (id, updatedAt, extra={}) => ({ id, title:`Oppgave ${id}`, due:null, priority:'middels', completed:false, createdAt:'2026-10-01T10:00:00.000Z', updatedAt, ...extra });
const row = (t, extra={}) => ({ ...toRow(t), updated_at:t.updatedAt.replace('Z','+00:00'), ...extra });

test('konverterer mellom oppgave og databaserad', () => {
  const t = task('a', '2026-10-01T11:00:00.000Z', { due:'2026-10-03', completed:true });
  assert.deepEqual(fromRow(toRow(t)), t);
});
test('nyeste versjon vinner i begge retninger', () => {
  const local = [task('a','2026-10-01T12:00:00.000Z'), task('b','2026-10-01T09:00:00.000Z')];
  const remote = [row(task('a','2026-10-01T11:00:00.000Z')), row(task('b','2026-10-01T13:00:00.000Z',{title:'Ny tittel'}))];
  const result = mergeTasks(local, remote);
  assert.deepEqual(result.toRemote.map(r=>r.id), ['a']);
  assert.deepEqual(result.toLocal.map(t=>[t.id,t.title]), [['b','Ny tittel']]);
});
test('sender nye lokale oppgaver og henter nye eksterne', () => {
  const result = mergeTasks([task('lokal','2026-10-01T10:00:00.000Z')], [row(task('ekstern','2026-10-01T10:00:00.000Z'))]);
  assert.deepEqual(result.toRemote.map(r=>r.id), ['lokal']);
  assert.deepEqual(result.toLocal.map(t=>t.id), ['ekstern']);
});
test('sletting på en annen enhet fjerner oppgaven lokalt', () => {
  const t = task('a','2026-10-01T10:00:00.000Z');
  const result = mergeTasks([t], [row(t, { updated_at:'2026-10-01T12:00:00+00:00', deleted_at:'2026-10-01T12:00:00+00:00' }), row(task('b','2026-10-01T10:00:00.000Z'), { deleted_at:'2026-10-01T10:00:00+00:00' })]);
  assert.deepEqual(result, { toLocal:[], toRemove:['a'], toRemote:[] });
});
test('lager konfigurasjon fra miljøvariabler', () => {
  assert.equal(configSource({ SUPABASE_URL:'https://x.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abc' }),
    'export const SUPABASE_URL = "https://x.supabase.co";\nexport const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_abc";\n');
  assert.match(configSource({}), /SUPABASE_URL = ""/);
});
