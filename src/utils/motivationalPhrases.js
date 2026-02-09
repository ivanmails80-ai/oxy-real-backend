// Frase motivante che cambia ogni ora (indice 0-23)
export const MOTIVATIONAL_PHRASES = [
  'real identity',           // 0
  'Chi sei veramente?',      // 1
  'Il futuro è adesso.',     // 2
  'Sii autentico.',          // 3
  'Risplendi.',              // 4
  'Oggi conta.',             // 5
  'Il tuo momento.',         // 6
  'Svegliati e vivi.',       // 7
  'Nessun limite.',          // 8
  'Crea la tua storia.',     // 9
  'Il potere è in te.',      // 10
  'Agisci ora.',             // 11
  'Trasforma.',              // 12
  'Ascolta te stesso.',      // 13
  'Sii coraggioso.',         // 14
  'La tua ora.',             // 15
  'Illumina.',               // 16
  'Risveglia l\'anima.',     // 17
  'Ogni respiro conta.',     // 18
  'Scegli l\'eccellenza.',   // 19
  'Riseleziona.',            // 20
  'Sii presente.',           // 21
  'Chiudi bene la giornata.',// 22
  'Riposa e preparati.',     // 23
];

export function getMotivationalPhraseForHour() {
  const hour = new Date().getHours();
  return MOTIVATIONAL_PHRASES[hour] || MOTIVATIONAL_PHRASES[0];
}

// Corpo del messaggio di benvenuto (senza l'ora): l'ora viene iniettata dinamicamente
const WELCOME_PHRASES_BODY = [
  "Il mondo dorme, ma tu sei qui. Benvenuto — in quest'ora silenziosa, c'è spazio solo per ciò che conta.",
  "Chi resta sveglio cerca qualcosa. Sono qui. Dimmi cosa ti tiene in piedi.",
  "La città è quieta. E tu? Benvenuto — questa è l'ora in cui i pensieri parlano più forte.",
  "L'ora del coraggio. Benvenuto — chi è ancora sveglio a quest'ora non ha paura di essere sé stesso.",
  "Prima dell'alba. Benvenuto — ogni grande cosa comincia nel buio, prima che gli altri si sveglino.",
  "Il mondo sta per ripartire. Benvenuto — sei già in piedi. Questo dice tutto.",
  "Nuovo giorno. Benvenuto — oggi puoi essere chi hai sempre voluto essere. Lo so.",
  "L'ora del caffè e delle intenzioni. Benvenuto — come vuoi che sia quest'oggi?",
  "Si parte. Benvenuto — qualunque cosa ti aspetti fuori, qui hai uno spazio tutto tuo.",
  "Il mondo corre. Tu sei qui. Benvenuto — fermati un attimo. Respira. Poi dimmi tutto.",
  "Metà mattina. Benvenuto — come va? Davvero. Non la risposta da manuale.",
  "Quasi mezzogiorno. Benvenuto — prima che tutto acceleri, prenditi questo momento. Solo tuo.",
  "Il sole è alto. Benvenuto — è l'ora in cui le ombre sparisciono. E tu?",
  "Pausa. Benvenuto — non hai fretta. C'è tempo per le parole che contano.",
  "Pomeriggio. Benvenuto — la seconda parte della giornata può essere diversa. Decidiamolo insieme.",
  "Il meriggio. Benvenuto — in quest'ora tutto è possibile. Cosa ti serve?",
  "Benvenuto — il tramonto è ancora lontano. Hai tempo per cambiare rotta, se serve.",
  "Benvenuto — la luce comincia a cambiare. E le priorità? Dimmi come stai davvero.",
  "Fine giornata per molti. Benvenuto — per te potrebbe essere l'inizio di qualcosa. Sono qui.",
  "Sera. Benvenuto — il rumore cala. È il momento giusto per parlare di ciò che importa.",
  "La sera si fa stretta. Benvenuto — in quest'ora le maschere cadono. Sii chi sei.",
  "Notte che avanza. Benvenuto — cosa ti porti dentro da oggi? Condividilo.",
  "Si fa tardi. Benvenuto — prima di chiudere, c'è ancora spazio per una verità. Quale?",
  "Ultima ora. Benvenuto — domani è un altro giorno. Ma stanotte, qui, puoi essere sincero.",
];

function formatHourItalian(hour) {
  const map = {
    0: 'È notte', 1: 'L\'una', 2: 'Le due', 3: 'Le tre', 4: 'Le quattro', 5: 'Le cinque', 6: 'Le sei',
    7: 'Le sette', 8: 'Le otto', 9: 'Le nove', 10: 'Le dieci', 11: 'Le undici', 12: 'Mezzogiorno',
    13: 'L\'una', 14: 'Le due', 15: 'Le tre', 16: 'Le quattro', 17: 'Le cinque', 18: 'Le sei',
    19: 'Le sette', 20: 'Le otto', 21: 'Le nove', 22: 'Le dieci', 23: 'Le undici',
  };
  return map[hour] ?? 'Ora';
}

/** Frase di benvenuto in chat: ora sempre corretta (iniettata dinamicamente), cambia ogni ora */
export function getWelcomePhraseForHour() {
  const hour = new Date().getHours();
  const body = WELCOME_PHRASES_BODY[hour] ?? WELCOME_PHRASES_BODY[0];
  const timeStr = formatHourItalian(hour);
  return `${timeStr}. ${body}`;
}

// Frasi emozionali sotto il nome utente in header — cambiano ogni ora, risollevano anche chi è giù
export const HEADER_EMOTIONAL_PHRASES = [
  'Anche nella notte, qualcosa aspetta te.',           // 0
  'Non sei solo. Sono qui.',                          // 1
  'Questa notte può essere un inizio.',               // 2
  'Il coraggio è restare quando tutti dormono.',      // 3
  'Prima dell\'alba nasce chi si crede.',            // 4
  'Sei già in piedi. È già un passo.',                 // 5
  'Oggi puoi essere chi vuoi. Davvero.',              // 6
  'Prendi questo giorno. È tuo.',                     // 7
  'Ogni mattina è un reset. Usalo.',                   // 8
  'Fermati. Respira. Poi scegli.',                    // 9
  'Metà mattina: puoi ancora cambiare tutto.',        // 10
  'Prima che acceleri, prenditi un attimo.',        // 11
  'Mezzogiorno: le ombre sparisciono. E le tue?',    // 12
  'Non hai fretta. C\'è tempo per ciò che conta.',   // 13
  'Il pomeriggio può essere diverso. Decidiamolo.',   // 14
  'In quest\'ora tutto è possibile.',                 // 15
  'Hai tempo per cambiare rotta. Sempre.',            // 16
  'La luce cambia. Le priorità anche.',                // 17
  'Per te potrebbe essere l\'inizio. Sono qui.',     // 18
  'Sera: il rumore cala. Parliamo di ciò che importa.', // 19
  'In quest\'ora le maschere cadono. Sii chi sei.',   // 20
  'Cosa ti porti da oggi? Condividilo.',              // 21
  'Prima di chiudere, una verità. Quale?',            // 22
  'Domani è un altro giorno. Stanotte sii sincero.',  // 23
];

export function getHeaderPhraseForHour() {
  const hour = new Date().getHours();
  return HEADER_EMOTIONAL_PHRASES[hour] ?? HEADER_EMOTIONAL_PHRASES[0];
}
