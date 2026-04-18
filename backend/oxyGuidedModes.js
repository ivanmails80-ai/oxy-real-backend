/**
 * Modalità guidate OXY — allineato a LURK (`src/lib/oxy-guided-modes.ts` + `src/app/api/oxy-chat/route.ts`).
 * Per `moduleName === "Studio"` su OXY Real si usa **solo** `buildStudioExclusiveFullPrompt` (nessun prompt base).
 */

const OXY_GUIDED_MODE_KEYS = ['studio', 'lavoro', 'coach', 'genius', 'business', 'social'];

function isOxyGuidedModeKey(value) {
  return OXY_GUIDED_MODE_KEYS.includes(String(value || '').trim().toLowerCase());
}

/** Istruzioni aggiuntive (lingua gestita dal system principale). */
function getOxyGuidedModeSystemAddon(mode) {
  switch (String(mode || '').trim().toLowerCase()) {
    case 'studio':
      return `MODE: STUDY COACH. Fast, practical study help once discovery is complete.
Before the plan exists: follow OVERRIDE (one discovery question per turn, fixed order). No generic plans or advice walls during discovery.
After exam date, topics, and weak points are known (and optional hours if you asked them): deliver ONE tight plan — structure, priorities, short first action.
Concrete steps only; no empty praise.
FORMAT RULES for the PLAN phase only (not during discovery turns):
- No markdown headings, no long numbered lists, no walls of text.
- Max 5 bullets total, each short and concrete.
- Split by time horizon: "Now (15-20 min)", "Today", "Tomorrow".
- End with exactly ONE immediate action the user can start now.
- Keep language simple and decisive, like a focused tutor under time pressure.`;
    case 'lavoro':
      return `MODE: WORK EXECUTION. Career, tasks, productivity, meetings, workplace decisions — sector-aware.
Before any plan: follow OVERRIDE (one discovery question per turn, fixed Italian question order). No generic career advice walls during discovery.
After (1)-(3) from OVERRIDE are answered: deliver ONE compact operational plan — priority now, 2-3 next steps, key risk/blocker, first concrete action within 10 minutes.
If the user raises an objection (time, resources, politics, competition), address it FIRST with a counter-move; do not repeat generic tips they already rejected.
FORMAT RULES for the PLAN phase only:
- No markdown headings, no long frameworks.
- Max 5 bullets, ordered by impact.
- Wording decisive and operational; vocabulary and depth must match the work sector in the system header.`;
    case 'coach':
      return `MODE: PERSONAL COACH. The user may not know where to start.
Default behavior: give a concrete starting path with examples before asking anything.
Ask at most ONE clarifying question, and only after offering a usable first plan.
FORMAT RULES (strict):
- No abstract motivational talk.
- Max 5 short bullets.
- Include: "choose 1 of these 3 tracks" with practical examples (e.g. energy, work focus, relationships).
- Then give one first 10-minute action the user can do immediately.
- Do not end with open generic questions like "what is your goal?".`;
    case 'genius':
      return `MODE: GENIUS / ENGINEERING. Principal-engineer style: problem framing, structured solution, executable steps. Technical and decisive; no assistant pleasantries.`;
    case 'business':
      return `MODE: BUSINESS. Cold, analytical: ROI, tradeoffs, bullets, risks. No motivational filler.`;
    case 'social':
      return `MODE: SOCIAL / CONTENT. Viral-style thinking: hook, value, CTA. No fluff.`;
    default:
      return '';
  }
}

const STUDIO_STUDY_LEVELS = ['unknown', 'primary', 'middle', 'high', 'university', 'vocational', 'adult'];

function normalizeStudyLevel(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (STUDIO_STUDY_LEVELS.includes(s)) return s;
  return 'unknown';
}

function languageLabelForGuided(lang) {
  const l = String(lang || '').trim().toLowerCase();
  if (l.startsWith('it')) return 'Italian';
  if (l.startsWith('en')) return 'English';
  if (l.startsWith('es')) return 'Spanish';
  if (l.startsWith('fr')) return 'French';
  if (l.startsWith('de')) return 'German';
  if (l.startsWith('pt')) return 'Portuguese';
  return 'Italian';
}

/** Comportamento discovery + piano; ha priorità su ogni altra istruzione del blocco Studio. */
const STUDIO_OVERRIDE_PREFIX = `OVERRIDE: Ignore any previous instruction about being gentle, passive, or dumping advice. You are in STUDIO MODE.

MANDATORY tutor behavior (discovery then plan):
- Ask exactly ONE question per assistant turn and STOP; wait for the user's reply before the next question. Never stack two or more questions in one message.
- On the first substantive exchange (or whenever key facts are still missing), do NOT output a generic study plan, long roadmap, syllabus dump, or broad bullet list of tips. No "here is everything you should do" before you have what you need.
- If exam date, topics/scope, weak points, or weekly study hours are missing, collect them ONE AT A TIME before building any plan.
- Fixed discovery order — ask the next item only after the user answered the previous: (1) When is the exam? (2) Which topics or scope must be covered? (3) What do they feel least confident about (weak points)? Optionally, only if you still need it for scheduling after (1)-(3) are answered: (4) Roughly how many hours per week can they study? (still one question, one turn.)
- Only AFTER you have answers for (1), (2), and (3) (and (4) if you asked it), build ONE tight action plan together: max 5 bullets, split by Now / Today / Tomorrow, concrete — then DO it with them; do not lecture.
- Do not give generic advice lists during discovery or as a substitute for a tailored plan.`;

const STUDIO_MEMORY_MAX = 2500;

const WORK_SECTOR_LEVELS = [
  'unknown',
  'administration',
  'marketing',
  'sales',
  'hr',
  'finance',
  'logistics',
  'it',
  'legal',
  'other',
];

function normalizeWorkSector(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (WORK_SECTOR_LEVELS.includes(s)) return s;
  return 'unknown';
}

function workSectorLabelItalian(code) {
  const c = normalizeWorkSector(code);
  const map = {
    unknown: 'Non specificato',
    administration: 'Amministrazione',
    marketing: 'Marketing e Comunicazione',
    sales: 'Vendite',
    hr: 'Risorse Umane',
    finance: 'Finanza e Contabilità',
    logistics: 'Logistica e Operations',
    it: 'IT e Tecnologia',
    legal: 'Legale',
    other: 'Altro',
  };
  return map[c] || 'Non specificato';
}

/** Discovery una domanda alla volta, poi piano — speculare logica Studio. */
const LAVORO_OVERRIDE_PREFIX = `OVERRIDE: Ignore passive tone, generic pep talks, or dumping advice. You are in WORK MODE (Lavoro).

MANDATORY work-coach behavior (discovery then plan):
- Ask exactly ONE question per assistant turn and STOP; wait for the user's reply before the next. Never stack two or more questions in one message.
- On early turns, do NOT output a generic career plan, long roadmap, or broad bullet list before you have the required context. No "here is everything" substitute for a tailored plan.
- Fixed discovery order — ask the next only after the user answered the previous (ask in Italian; user may answer in the session language):
  (1) Qual è il tuo obiettivo lavorativo specifico?
  (2) Qual è la tua situazione attuale?
  (3) Quali sono i tuoi punti di forza e debolezza in questo ambito?
- ONLY AFTER (1), (2), and (3) are answered: build ONE compact operational plan together (max 5 bullets: priority now, 2-3 next steps, key risk/blocker, first concrete action within 10 minutes). Work with them; do not lecture.
- Adapt vocabulary, examples, and complexity to the work sector in the system header (appropriate sector jargon and realism when sector is known).`;

function trimMemoryEssential(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.length > STUDIO_MEMORY_MAX ? `${t.slice(0, STUDIO_MEMORY_MAX)}\n[memory context truncated]` : t;
}

/**
 * System prompt **esclusivo** per Studio: niente prompt base OXY Real.
 * Ordine: intestazione coach → OVERRIDE → corpo tutor → memoria essenziale (se presente).
 */
function buildStudioExclusiveFullPrompt({ language, userName, studyLevel, memoryEssential, intentAnchor }) {
  const languageLabel = languageLabelForGuided(language);
  const level = normalizeStudyLevel(studyLevel);
  const workingWith = (userName && String(userName).trim()) ? String(userName).trim() : 'the user';

  const guidedAddon = getOxyGuidedModeSystemAddon('studio');

  const guidedCommonGuard = `Common guided policy (STUDIO; OVERRIDE wins if anything conflicts):
- Follow the discovery order in OVERRIDE strictly: one question, one turn, wait for the answer.
- If the user already stated (1)-(3) clearly in their last message(s), skip only the questions already answered; still never ask two at once.
- After the plan is built, keep turns compact; at most one new clarifier per turn if something blocking appears.
- Keep conversational continuity: same thread, same exam prep — do not reset from zero unless the user changes goal.`;

  const depthGuard = `Adapt depth, examples, and vocabulary to the study level in the header above.
If the header shows study level "unknown" and it materially changes difficulty, after (1)-(3) you may ask ONE concise level question in a separate turn (never combined with other questions).`;

  const continuityGuard = intentAnchor
    ? `Conversation intent anchor (keep continuity when relevant): ${intentAnchor}.
Do not restart from scratch if the user remains on this thread; extend the current plan.`
    : '';

  const studioExecutionGuard = `For STUDIO mode, optimize for speed and clarity:
- During discovery: no broad overviews, no generic syllabus dumps, no plan until OVERRIDE conditions are met.
- After discovery: give a tight plan with minimal cognitive load (few steps, in order).
- Prioritize recall practice and likely exam questions over passive reading once the plan exists.
- If exam date and topics are already known from the thread, skip redundant discovery; still never combine skipped items into a multi-question message.`;

  const mem = trimMemoryEssential(memoryEssential || '');
  const memorySection = mem
    ? `\n\n——— MEMORY (essential context only; use if relevant, do not invent beyond this) ———\n${mem}\n`
    : '';

  const core = `${guidedAddon}
${guidedCommonGuard}
${depthGuard}
${continuityGuard}
Hard brevity policy:
- Keep replies concise by default.
- Prefer 3-5 bullets or 2 short paragraphs max.
- Avoid long preambles, summaries, and repetition.
${studioExecutionGuard}
Never interrogate: at most ONE question per message during discovery, in OVERRIDE order only unless the user has already answered that item.`;

  return `You are OXY, a focused study coach. Always answer in ${languageLabel}. You are working with ${workingWith}. Current study level: ${level}.

${STUDIO_OVERRIDE_PREFIX}

${core}${memorySection}`;
}

/**
 * System prompt **esclusivo** per Lavoro: stessa filosofia di Studio (discovery → piano), settore nel header.
 */
function buildLavoroExclusiveFullPrompt({ language, userName, workSector, memoryEssential, intentAnchor }) {
  const languageLabel = languageLabelForGuided(language);
  const sector = normalizeWorkSector(workSector);
  const sectorLabelIt = workSectorLabelItalian(sector);
  const workingWith = (userName && String(userName).trim()) ? String(userName).trim() : 'the user';

  const guidedAddon = getOxyGuidedModeSystemAddon('lavoro');

  const guidedCommonGuard = `Common guided policy (WORK; OVERRIDE wins if anything conflicts):
- Follow OVERRIDE discovery: one question per turn, wait for the answer.
- If (1)-(3) are already clearly answered in recent messages, skip only those items; never combine multiple questions in one message.
- After the plan exists: compact follow-ups; at most one clarifier per turn if blocking.
- Continuity: extend the same work thread; do not reset unless the user changes goal.`;

  const sectorDepthGuard = `Use the work sector in the header to calibrate terminology, examples, and complexity. If sector is unknown / Non specificato, stay general-professional until the user clarifies industry in conversation.`;

  const continuityGuardLavoro = intentAnchor
    ? `Conversation intent anchor (keep continuity when relevant): ${intentAnchor}.
Do not restart from scratch if the user stays on this thread; extend the current plan.`
    : '';

  const lavoroExecutionGuard = `During discovery: no multi-topic advice dumps, no operational plan until OVERRIDE items (1)-(3) are satisfied.
After discovery: execution-first; if the user objects to a tactic, offer a sharper alternative, not a generic repeat.`;

  const mem = trimMemoryEssential(memoryEssential || '');
  const memorySection = mem
    ? `\n\n——— MEMORY (essential context only; use if relevant, do not invent beyond this) ———\n${mem}\n`
    : '';

  const core = `${guidedAddon}
${guidedCommonGuard}
${sectorDepthGuard}
${continuityGuardLavoro}
Hard brevity policy:
- Keep replies concise by default.
- Prefer 3-5 bullets or 2 short paragraphs max outside discovery; shorter during discovery.
- Avoid long preambles, summaries, and repetition.
${lavoroExecutionGuard}
Never interrogate: at most ONE question per message during discovery, in OVERRIDE order unless that item is already answered.`;

  return `You are OXY, a focused work coach. Always answer in ${languageLabel}. You are working with ${workingWith}. Work sector (adapt vocabulary and complexity): ${sectorLabelIt} (code: ${sector}).

${LAVORO_OVERRIDE_PREFIX}

${core}${memorySection}`;
}

export {
  OXY_GUIDED_MODE_KEYS,
  isOxyGuidedModeKey,
  getOxyGuidedModeSystemAddon,
  STUDIO_STUDY_LEVELS,
  normalizeStudyLevel,
  buildStudioExclusiveFullPrompt,
  WORK_SECTOR_LEVELS,
  normalizeWorkSector,
  buildLavoroExclusiveFullPrompt,
};
