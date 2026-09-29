import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, findMatches } from '../src/commands.js';

const now = new Date(2026, 8, 29, 12);
test('tolker en oppgave med norsk relativ dato og prioritet', () => {
  assert.deepEqual(parseCommand('Legg til kjøpe melk i morgen høy prioritet', now), {
    type:'add', title:'kjøpe melk', due:'2026-09-30',
    interpreted:{iso:'2026-09-30',label:'onsdag 30. september'}, priority:'høy'
  });
});
test('tolker flytting og fullføring', () => {
  assert.equal(parseCommand('flytt tannlege til i dag', now).due, '2026-09-29');
  assert.deepEqual(parseCommand('fullfør bestill time', now), {type:'complete',query:'bestill time'});
});
test('finner alle delvise treff uten å skille store og små bokstaver', () => {
  const tasks=[{title:'Kjøp Melk'},{title:'Ring tannlegen'}];
  assert.deepEqual(findMatches(tasks,'melk'),[tasks[0]]);
});
