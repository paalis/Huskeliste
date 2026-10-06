import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModel, predict, interpret } from '../src/nlu.js';
import { parseNorwegianDate } from '../src/date.js';
import { findMatches, parseCommand } from '../src/commands.js';

const model = loadModel(JSON.parse(readFileSync(new URL('../src/model.json', import.meta.url), 'utf8')));
const now = new Date(2026, 9, 6, 12); // tirsdag 6. oktober 2026

test('modellen forstår hva brukeren vil med egne ord', () => {
  const cases = [
    ['Minn meg på å ringe tannlegen på fredag', 'add', 'ringe tannlegen'],
    ['ikke glem å betale regningen i morgen', 'add', 'betale regningen'],
    ['ring mamma i morgen', 'add', 'ring mamma'],
    ['Jeg må huske å kjøpe gave til Kari', 'add', 'kjøpe gave til Kari'],
    ['Husk at jeg skal på fotballtrening onsdag', 'add', 'fotballtrening'],
    ['Melka er kjøpt', 'complete', 'Melka'],
    ['Tannlegen er gjort', 'complete', 'Tannlegen'],
    ['Strømregningen er betalt', 'complete', 'Strømregningen'],
    ['kan du hake av melk', 'complete', 'melk'],
    ['Utsett klippe plenen til neste uke', 'move', 'klippe plenen'],
    ['sett fotballtreningen til fredag', 'move', 'fotballtreningen'],
    ['Jeg trenger ikke gaven lenger', 'delete', 'gaven'],
    ['Dropp fotballtreningen', 'delete', 'fotballtreningen'],
    ['har jeg lagt inn passet', 'find', 'passet'],
    ['hei hvordan går det', 'other', ''],
    ['takk for hjelpen', 'other', '']
  ];
  for (const [text, intent, task] of cases) {
    const p = predict(model, text);
    assert.equal(p.intent, intent, text);
    assert.equal(p.task, task, text);
  }
});
test('modellens tolkning får dato og prioritet fra reglene', () => {
  assert.deepEqual(interpret(model, 'Minn meg på å ringe tannlegen på fredag høy prioritet', now),
    { type:'add', title:'ringe tannlegen', due:'2026-10-09', interpreted:{ iso:'2026-10-09', label:'fredag 9. oktober' }, priority:'høy' });
  assert.equal(interpret(model, 'Utsett klippe plenen til neste uke', now).due, '2026-10-12');
  assert.deepEqual(interpret(model, 'hei hvordan går det', now), { type:'unknown' });
});
test('«til» i en oppgave tolkes ikke som dato', () => {
  assert.equal(predict(model, 'Jeg må huske å kjøpe gave til Kari').dateText, '');
});
test('tolker ukedager, overmorgen og tall i ord', () => {
  assert.equal(parseNorwegianDate('på fredag', now).iso, '2026-10-09');
  assert.equal(parseNorwegianDate('tirsdag', now).iso, '2026-10-13');
  assert.equal(parseNorwegianDate('neste uke', now).iso, '2026-10-12');
  assert.equal(parseNorwegianDate('i overmorgen', now).iso, '2026-10-08');
  assert.equal(parseNorwegianDate('om to dager', now).iso, '2026-10-08');
  assert.equal(parseNorwegianDate('om en uke', now).iso, '2026-10-13');
});
test('reglene forstår også ukedager', () => {
  assert.equal(parseCommand('Legg til trening på torsdag', now).due, '2026-10-08');
  assert.equal(parseCommand('Legg til kjøpe fredagstaco', now).title, 'kjøpe fredagstaco');
  assert.equal(parseCommand('flytt tannlege til fredag', now).due, '2026-10-09');
});
test('finner oppgaver også med bøyde ord', () => {
  const tasks = [{ title:'handle melk' }, { title:'betale strøm' }, { title:'ringe tannlegen' }];
  assert.deepEqual(findMatches(tasks, 'Melka'), [tasks[0]]);
  assert.deepEqual(findMatches(tasks, 'strømregningen'), [tasks[1]]);
  assert.deepEqual(findMatches(tasks, 'til tannlegen'), [tasks[2]]);
  assert.deepEqual(findMatches(tasks, 'bilen'), []);
  // Et felles vanlig verb alene er ikke nok til å treffe en oppgave.
  assert.deepEqual(findMatches(tasks, 'ringe veterinæren'), []);
  assert.deepEqual(findMatches(tasks, 'ring tannlegen'), [tasks[2]]);
});
