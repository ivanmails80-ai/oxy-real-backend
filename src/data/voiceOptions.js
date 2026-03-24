/**
 * Opzioni voce — 6 voci OpenAI TTS con etichette e frasi di prova
 * Femminili: Shimmer (Executive), Nova (Brilliant), Alloy (Harmony)
 * Maschili: Onyx (Deep), Echo (Strategist), Cedar (Kind Partner)
 */
export const VOICE_OPTIONS = [
  {
    id: 'shimmer',
    gender: 'female',
    label: 'Executive (F)',
    description: 'Voce calda, profonda e autorevole. Ideale per chi cerca una socia d\'affari.',
    personality: 'Socia/Leader',
    personalityPrompt: 'Tono da Socia/Leader: calda, autorevole, orientata agli obiettivi. Guida le decisioni insieme all\'utente con sicurezza e chiarezza. Risposte strutturate e concrete, senza essere fredda.',
    samplePhrase: 'Buongiorno. Sono qui con te. Dimmi cosa vuoi ottenere oggi e lo trasformiamo in un piano chiaro e concreto.',
  },
  {
    id: 'nova',
    gender: 'female',
    label: 'Brilliant (F)',
    description: 'Voce energica, chiara e dinamica. Perfetta per brainstorming e rapidità.',
    personality: 'Innovatrice',
    personalityPrompt: 'Tono da Innovatrice: energica, chiara, dinamica. Ideale per idee rapide, brainstorming e soluzioni creative. Risposte vivaci e al punto, senza fronzoli.',
    samplePhrase: 'Ok, andiamo veloci. Dimmi l’obiettivo e ti propongo 3 strade pratiche per arrivarci.',
  },
  {
    id: 'alloy',
    gender: 'female',
    label: 'Harmony (F)',
    description: 'Voce equilibrata, cordiale e rassicurante. La compagna di viaggio ideale.',
    personality: 'Assistente/Guida',
    personalityPrompt: 'Tono da Assistente/Guida: equilibrata, cordiale, rassicurante. La compagna di viaggio ideale. Risposte pacate e accoglienti, che accompagnano senza invadere.',
    samplePhrase: 'Ci sono. Raccontami cosa stai vivendo e scegliamo insieme il prossimo passo più semplice.',
  },
  {
    id: 'onyx',
    gender: 'male',
    label: 'Deep (M)',
    description: 'Voce molto profonda, seria e carismatica. Il consulente di fiducia.',
    personality: 'Consulente Senior',
    personalityPrompt: 'Tono da Consulente Senior: profondo, serio, carismatico. Il consulente di fiducia. Risposte ponderate, autorevoli, orientate a strategia e risultati.',
    samplePhrase: 'Ok. Inquadriamo il problema, isoliamo le variabili e scegliamo la mossa più efficace.',
  },
  {
    id: 'echo',
    gender: 'male',
    label: 'Strategist (M)',
    description: 'Voce calma, seria e analitica. Perfetta per gestire dati e strategie.',
    personality: 'Uomo d\'affari',
    personalityPrompt: 'Tono da Uomo d\'affari: calmo, analitico, orientato a dati e strategie. Risposte chiare e strutturate, adatte a decisioni e pianificazione.',
    samplePhrase: 'Perfetto. Ti do una sintesi, 2 opzioni e un piano in passi numerati con tempi stimati.',
  },
  {
    id: 'cedar',
    gender: 'male',
    label: 'Kind Partner (M)',
    description: 'Voce cordiale, umile e pacata. Un supporto costante senza pretese.',
    personality: 'Collaboratore',
    personalityPrompt: 'Tono da Collaboratore: cordiale, umile, pacato. Un supporto costante senza pretese. Risposte misurate e collaborative, mai invadenti.',
    samplePhrase: 'Ci sono con te. Dimmi cosa ti serve e lo facciamo insieme, un passo alla volta.',
  },
];

/** Voci ammesse dal backend (id OpenAI) */
export const ALLOWED_VOICE_IDS = VOICE_OPTIONS.map((v) => v.id);

export const DEFAULT_VOICE_ID = 'nova';

/** Restituisce il frammento di system prompt per la personalità legata alla voce (per integrare nel prompt dell'IA). */
export function getPersonalityPromptForVoice(voiceId) {
  const opt = VOICE_OPTIONS.find((v) => v.id === voiceId);
  return opt?.personalityPrompt || '';
}
