/**
 * Verifica locale del system prompt esclusivo Studio (nessun prompt base).
 * Uso: da cartella backend → node scripts/test-studio-prompt.mjs
 */
import { buildStudioExclusiveFullPrompt, normalizeStudyLevel } from '../oxyGuidedModes.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const p = buildStudioExclusiveFullPrompt({
  language: 'it',
  userName: 'Giulia',
  studyLevel: 'high',
  memoryEssential: 'Identità: studentessa. Obiettivi: ripasso analisi.',
  intentAnchor: '',
});

assert(p.startsWith('You are OXY, a focused study coach.'), 'must start with coach header');
assert(p.includes('Always answer in Italian.'), 'language line');
assert(p.includes('You are working with Giulia.'), 'user name');
assert(p.includes('Current study level: high.'), 'study level');
assert(p.includes('OVERRIDE:'), 'OVERRIDE block');
assert(p.includes('MANDATORY tutor behavior'), 'OVERRIDE mandatory block');
assert(p.includes('ONE question per assistant turn'), 'one question per turn');
assert(p.includes('(1) When is the exam?'), 'discovery order 1');
assert(p.includes('(2) Which topics'), 'discovery order 2');
assert(p.includes('(3) What do they feel least confident'), 'discovery order 3');
assert(p.includes('MODE: STUDY COACH'), 'guided addon');
assert(p.includes('——— MEMORY (essential context only'), 'memory section');
assert(!p.includes('COME UN AMICO'), 'must not include base OXY friend tone');
assert(!p.includes('Sei OXY'), 'must not include Italian base header');
assert(!p.includes('CONOSCENZA APP'), 'must not include app knowledge block');

assert(normalizeStudyLevel('bad') === 'unknown', 'normalize invalid');
assert(normalizeStudyLevel('vocational') === 'vocational', 'normalize valid');

const pEmpty = buildStudioExclusiveFullPrompt({
  language: 'it',
  userName: '',
  studyLevel: 'unknown',
  memoryEssential: '',
  intentAnchor: '',
});
assert(pEmpty.includes('You are working with the user.'), 'empty name → the user');
assert(!pEmpty.includes('——— MEMORY'), 'no memory section when empty');

console.log('test-studio-prompt: all assertions passed.');
console.log('--- preview (first 900 chars) ---\n');
console.log(p.slice(0, 900));
