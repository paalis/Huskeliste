import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTranscript, createVoice } from '../src/voice.js';
import { parseCommand } from '../src/commands.js';

test('fjerner tegnsetting som talegjenkjenningen legger til', () => {
  assert.equal(cleanTranscript(' Legg til handle melk i morgen. '), 'Legg til handle melk i morgen');
  const now = new Date(2026, 8, 29, 12);
  assert.equal(parseCommand(cleanTranscript('Legg til handle melk i morgen.'), now).title, 'handle melk');
});
test('mangler talegjenkjenning gir ingen mikrofon', () => {
  assert.equal(createVoice({}, {}), null);
});
test('sender ferdig tolket tale videre på norsk', () => {
  let instance;
  class FakeRecognition { constructor(){ instance = this; } start(){} stop(){ this.onend(); } }
  const finals = [], states = [];
  const voice = createVoice({ onText(){}, onFinal:t => finals.push(t), onState:s => states.push(s), onError(){} }, { webkitSpeechRecognition:FakeRecognition });
  voice.start();
  assert.equal(instance.lang, 'nb-NO');
  instance.onresult({ results:[Object.assign([{ transcript:'Fullfør tannlege.' }], { isFinal:true })] });
  voice.stop();
  assert.deepEqual(finals, ['Fullfør tannlege']);
  assert.deepEqual(states, [true, false]);
  assert.equal(voice.listening, false);
});
