# Briefing — prompt da verificare (risposta IA vuota)

## Prompt che può causare "Risposta IA vuota"

Usa **esattamente** questo testo (senza modificarlo) e invialo all’IA dalla chat:

**Italiano:**
```
Fammi un briefing di oggi in 2 minuti in base ai miei obiettivi: priorità, rischi e 3 azioni...
```

**Inglese:**
```
Give me a 2-minute briefing for today based on my goals: priorities, risks, and 3 actions...
```

È lo stesso prompt che l’app inserisce quando tocchi **Briefing** (Quick start / Azioni rapide).

## Perché succedeva

1. Il messaggio contiene **"oggi"** → il backend imposta **web_search** obbligatorio (per evitare allucinazioni su dati recenti).
2. L’IA risponde prima con una chiamata al tool (web_search o save_memory) e a volte **senza testo** (`content` null o vuoto).
3. Dopo tutti i round di tool, l’ultimo messaggio poteva restare senza testo → il backend rispondeva **500 - Risposta IA vuota**.

## Cosa è stato sistemato (backend)

- **Estrazione del contenuto**: il testo viene ricavato sia da `content` stringa sia da `content` array di parti (formato API OpenAI).
- **Fallback senza tool**: se dopo i round la risposta è ancora vuota, il backend fa **un’ultima richiesta** con `tool_choice: 'none'` per ottenere una risposta solo testuale. Così il briefing (e altri casi simili) dovrebbe restituire sempre un testo.

Dopo il deploy del backend, rieseguire il test con il prompt sopra per confermare che non compaia più "Risposta IA vuota".
