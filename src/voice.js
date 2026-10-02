// Talegjenkjenning via nettleserens Web Speech API (Safari og Chrome). Returnerer null der den mangler.
export function cleanTranscript(text) {
  return text.trim().replace(/[.!?…]+$/, '').trim();
}

export function createVoice({ onText, onFinal, onState, onError }, scope = globalThis) {
  const Recognition = scope.SpeechRecognition || scope.webkitSpeechRecognition;
  if (!Recognition) return null;
  let recognition = null;
  return {
    get listening() { return Boolean(recognition); },
    start() {
      if (recognition) return;
      recognition = new Recognition();
      recognition.lang = 'nb-NO'; recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1;
      let finalText = '';
      recognition.onresult = e => {
        const text = [...e.results].map(r => r[0].transcript).join('');
        onText(cleanTranscript(text));
        if (e.results[e.results.length - 1].isFinal) finalText = cleanTranscript(text);
      };
      recognition.onerror = e => onError(e.error);
      recognition.onend = () => { recognition = null; onState(false); if (finalText) onFinal(finalText); };
      recognition.start(); onState(true);
    },
    stop() { recognition?.stop(); }
  };
}

export function speak(text, scope = globalThis) {
  const synth = scope.speechSynthesis;
  if (!synth || !scope.SpeechSynthesisUtterance) return;
  const utterance = new scope.SpeechSynthesisUtterance(text);
  utterance.lang = 'nb-NO';
  const voice = synth.getVoices().find(v => /^(nb|no|nn)\b/i.test(v.lang));
  if (voice) utterance.voice = voice;
  synth.cancel(); synth.speak(utterance);
}
