/**
 * Verifica locale del system prompt esclusivo Lavoro.
 * Uso: da cartella backend → node scripts/test-lavoro-prompt.mjs
 */
import { buildLavoroExclusiveFullPrompt, normalizeWorkSector } from '../oxyGuidedModes.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const p = buildLavoroExclusiveFullPrompt({
  language: 'it',
  userName: 'Marco',
  workSector: 'hr',
  memoryEssential: 'Obiettivi: colloquio team lead.',
  intentAnchor: '',
});

assert(p.startsWith('You are OXY, a focused work coach.'), 'header');
assert(p.includes('Always answer in Italian.'), 'language');
assert(p.includes('You are working with Marco.'), 'name');
assert(p.includes('Risorse Umane'), 'sector label IT');
assert(p.includes('(code: hr)'), 'sector code');
assert(p.includes('WORK MODE (Lavoro)'), 'OVERRIDE mode');
assert(p.includes('Qual è il tuo obiettivo lavorativo specifico?'), 'Q1');
assert(p.includes('Qual è la tua situazione attuale?'), 'Q2');
assert(p.includes('punti di forza e debolezza'), 'Q3');
assert(p.includes('MODE: WORK EXECUTION'), 'addon');
assert(!p.includes('COME UN AMICO'), 'no base prompt');

assert(normalizeWorkSector('nope') === 'unknown', 'normalize');
assert(normalizeWorkSector('finance') === 'finance', 'finance');

console.log('test-lavoro-prompt: all assertions passed.');
