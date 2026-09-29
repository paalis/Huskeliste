import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNorwegianDate } from '../src/date.js';
const now = new Date(2026, 8, 29, 12);
test('tolker i dag og i morgen',()=>{assert.equal(parseNorwegianDate('i dag',now).iso,'2026-09-29');assert.equal(parseNorwegianDate('i morgen',now).iso,'2026-09-30');});
test('tolker norsk kortdato og avviser ugyldig dato',()=>{assert.equal(parseNorwegianDate('4.10',now).iso,'2026-10-04');assert.equal(parseNorwegianDate('31.02',now),null);});
test('tolker dager frem i tid',()=>assert.equal(parseNorwegianDate('om 3 dager',now).iso,'2026-10-02'));
