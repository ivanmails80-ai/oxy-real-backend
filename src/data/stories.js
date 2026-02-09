/**
 * Definizione storie a livelli OXY (roadmap 1.2).
 * Ogni storia ha id, title, steps (array di { text }). In futuro: choices per rami.
 */
export const STORIES = [
  {
    id: 'primo_passo',
    title: 'Il tuo primo passo',
    steps: [
      { text: 'Oggi è un buon giorno per dare un nome a qualcosa che ti sta a cuore. Non serve un obiettivo enorme: può essere "bere un bicchiere d\'acqua in più" o "scrivere tre righe". Cosa scegli?' },
      { text: 'Bene. Ora immagina di averlo fatto. Come ti senti? Prendi un attimo per risponderti davvero — poi scrivilo qui nel Diario o dillo a OXY in chat.' },
      { text: 'Hai completato questa storia. Ogni piccolo passo conta. Quando vuoi, torna in chat e racconta a OXY come è andata, o inizia un\'altra storia.' },
    ],
  },
  {
    id: 'tre_giorni',
    title: 'Tre giorni di consapevolezza',
    steps: [
      { text: 'Per i prossimi tre giorni, ogni mattina dedica un minuto a una sola domanda: "Cosa mi serve davvero oggi?" Non la risposta perfetta: quella che viene per prima.' },
      { text: 'Oggi è il secondo giorno. Ieri hai risposto alla domanda. Oggi chiediti: "Cosa è cambiato da ieri? C\'è qualcosa che voglio tenere o lasciare andare?"' },
      { text: 'Terzo giorno. "Cosa mi serve davvero oggi?" — e poi: "Cosa posso fare, anche piccolo, per averlo?" Scrivilo nel Diario o condividilo con OXY. Hai finito questa storia.' },
    ],
  },
];
