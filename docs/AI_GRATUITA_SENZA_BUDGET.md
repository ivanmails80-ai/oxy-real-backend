# AI gratuita senza budget: si può? Pro e contro

**Domanda:** senza soldi da investire, si può offrire un’AI “gratuita” agli utenti free? O sarebbe un punto a sfavore / l’app non funzionerebbe?

**Risposta breve:** **Sì, si può.** L’app può funzionare con un’AI a costo zero (o quasi) per te. Ci sono trade-off; nessuno di questi è “l’app non funziona”.

---

## Situazione attuale

Oggi gli utenti **free** usano **la tua** chiave OpenAI (GPT-4o mini) sul backend. Ogni messaggio free ti costa. Con molti utenti e zero budget, la spesa cresce.

---

## Opzioni per un’AI “gratuita” per te

### Opzione 1: Gemini (Google) in free tier sul backend

- **Costo per te:** 0 € (entro i limiti del free tier Google).
- **Come funziona:** sul backend, per gli utenti free, usi l’API Gemini con **una tua** chiave Google (stesso account che usi per Firebase/Play). Google offre un free tier con un tot di richieste al giorno (es. 250–1000 al giorno a seconda del modello e delle policy attuali).
- **Limiti:**  
  - Quota giornaliera **totale** (tutti i free user insieme). Es.: 250 richieste/giorno → con 5 msg/user = ~50 utenti free al giorno a pieno uso; con 3 msg/user puoi coprire più utenti.  
  - Quando superi la quota: quella giornata non puoi più servire altri messaggi free (o riduci a 1–2 msg/user per restare sotto).
- **Pro:** costo zero, esperienza identica per l’utente (chat, memoria, diario). L’app funziona.
- **Contro:** cap massimo di utenti free “a pieno” (es. 5 msg/giorno) dipende dalla quota; oltre potresti dover limitare i msg o introdurre “chiave tua” (vedi sotto).
- **È uno svantaggio?** No, se lo presenti bene: “Prova gratis con X messaggi al giorno; per di più sblocca con un abbonamento.”

---

### Opzione 2: “Porta la tua chiave” (solo utenti free)

- **Costo per te:** 0 €.
- **Come funziona:** l’utente free può usare la chat solo se inserisce **la sua** chiave (es. Gemini o OpenAI) nelle impostazioni. Già supporti qualcosa del genere (Oxy Key / Gemini key) per altri flussi.
- **Pro:** nessun costo; l’utente “illimitato” (entro i limiti della sua chiave).
- **Contro:** attrito: molti non sanno cosa sia una API key o non vogliono crearla. Meno download che si trasformano in chat “attiva”.
- **È uno svantaggio?** Può ridurre le conversioni da “scaricato” a “usa la chat”, ma l’app **funziona** per chi la inserisce. Puoi offrirla come opzione “power user” insieme a un free tier con limite (Opzione 1).

---

### Opzione 3: Ibrido (consigliato)

- **Free tier “senza chiave”:** 3–5 messaggi/giorno con **Gemini free tier** sul backend (Opzione 1). Costo zero, cap in base alla quota.
- **Free “con la tua chiave”:** chi inserisce la propria chiave Gemini (e un giorno magari OpenAI) ha più messaggi o illimitato in free, sempre a costo zero per te.
- **Messaggio:** “Prova gratis con N messaggi al giorno. Per più messaggi senza abbonamento, inserisci la tua chiave Gemini (gratis) in Impostazioni.”
- **Pro:** massimi download (nessuno è obbligato a mettere la chiave), zero costi, l’app funziona per tutti; chi vuole di più può portare la chiave o passare ad abbonamento.
- **Contro:** da implementare (scelta modello Gemini per free, fallback se quota superata: messaggio “limite globale raggiunto oggi” o invito a usare la propria chiave).

---

## L’app funzionerebbe?

- **Sì.** Con Gemini free tier (Opzione 1 o 3) la chat risponde, Memory Vault e Diario restano come oggi. L’unica differenza è il modello (Gemini invece di GPT-4o mini) e, se vuoi, un limite per non sforare la quota (es. 5 msg/user/giorno o un tetto globale).
- **Punto a sfavore?** Solo se presentato male. Se spieghi chiaramente (“Prova gratis con N messaggi al giorno; per di più sblocca con abbonamento o con la tua chiave”), è una proposta coerente e onesta.

---

## Cosa fare in pratica

1. **Decidere:** solo Gemini free per i free (con limite msg/user e/o globale), oppure ibrido (Gemini free + opzione “porta la tua chiave”).
2. **Backend:** per utenti free senza chiave, chiamare l’API Gemini (con una tua chiave Google) invece di OpenAI; rispettare il limite 5 msg/user/giorno e, se vuoi, un tetto globale giornaliero per non sforare la quota.
3. **App:** nessun cambio di flusso per l’utente; eventuale messaggio tipo “Oggi hai usato X/5 messaggi gratuiti” e, se superi la quota globale, “Limite giornaliero raggiunto; riprova domani o inserisci la tua chiave Gemini.”
4. **Quando la quota free non basta:** puoi (a) limitare i nuovi utenti free a 3 msg/giorno, (b) invitare a usare la propria chiave, (c) passare a un piano Gemini a pagamento (costi molto inferiori a OpenAI per uso simile).

Se vuoi, il passo successivo è implementare nel backend lo switch “utente free → Gemini” (con chiave server) e il limite 5 msg/user (e opzionale tetto globale).

---

## Promemoria e notifiche (“ricordami un appuntamento”) con Gemini

**Domanda:** Se usiamo Gemini per i free, la funzione “ricordami un appuntamento” / notifiche funziona?

**Risposta: Sì.** Il flusso principale dei promemoria **non dipende dal modello** (OpenAI vs Gemini).

### Come funziona oggi

1. **“Ricordami alle 19 di chiamare Marco”** (con orario)
   - L’**app** analizza il **messaggio dell’utente** con `parseGenericReminderFromMessage()` (client-side).
   - Se riconosce data/ora e testo:
     - Programma la **notifica locale** sul telefono (`scheduleLocalReminder`).
     - Chiama direttamente **POST /api/memory** per salvare in Memory Vault (nessuna chiamata all’IA per questo passo).
     - Mostra in chat “Promemoria impostato per …” e **non** invia il messaggio al modello.
   - Quindi: **notifica + Memory Vault** funzionano **anche con Gemini**, perché non passano dall’IA.

2. **“Ricordami di comprare il latte”** (senza orario)
   - Il messaggio va all’IA. Con **OpenAI** l’assistente può usare il tool `save_memory` e il backend salva in Memory Vault.
   - Con **Gemini** attuale (solo conversazione, senza tool) la risposta è solo testuale; il salvataggio in Memory Vault da parte dell’IA non avviene. L’utente può comunque usare “Ricordamelo” (long-press sul messaggio) per salvare in Memory Vault dalla app.

### In sintesi

| Funzione | Con Gemini free |
|----------|------------------|
| **Notifica “ricordami alle X di Y”** (appuntamento con orario) | ✅ Sì: gestita dall’app e da /api/memory, non dall’IA. |
| **Salvataggio in Memory Vault** per “ricordami alle X di Y” | ✅ Sì: l’app chiama direttamente /api/memory. |
| **Salvataggio in Memory Vault** per “ricordami di X” (solo testo, senza orario) | ⚠️ Solo tramite long-press “Ricordamelo” in chat, finché Gemini non avrà i tool (save_memory). |

Quindi: **sì, con Gemini la funzione “ricordami un appuntamento” (notifica + promemoria) è gestita e funziona.** Il solo pezzo che oggi dipende dall’IA è il “ricordami di X” senza orario; lì l’utente può usare il long-press per salvare in Memory Vault. Opzionalmente si può aggiungere in seguito il function calling a Gemini per avere parità con OpenAI anche su quel caso.

---

## Quanti messaggi / utenti sono “gratis” con Gemini?

I limiti del **free tier** Gemini sono **per progetto Google (per chiave API)**, non per singolo utente. Tutti i tuoi utenti free condividono la stessa quota giornaliera.

### Limiti indicativi (free tier, da verificare su [ai.google.dev](https://ai.google.dev/gemini-api/docs/rate-limits))

| Modello | Richieste al minuto (RPM) | Richieste al giorno (RPD) |
|--------|----------------------------|----------------------------|
| **Gemini 2.5 Pro** | 5 | 100 |
| **Gemini 2.5 Flash** | 10 | 250 |
| **Gemini 2.5 Flash-Lite** | 15 | 1.000 |

- Il rientro delle quote è a **mezzanotte (Pacific Time)**.
- I limiti sono **per progetto** (una chiave = un progetto): più chiavi sullo stesso progetto non aumentano la quota.

### Cosa significa per OXY (esempio: 5 messaggi/giorno per utente free)

Se in app imponi **5 messaggi/giorno** per utente free e usi **una** chiave Gemini free sul backend:

- Con **Gemini 2.5 Flash** (250 RPD):  
  **250 ÷ 5 = fino a ~50 utenti** che usano tutti e 5 i messaggi nello stesso giorno.
- Con **Gemini 2.5 Flash-Lite** (1.000 RPD):  
  **1.000 ÷ 5 = fino a ~200 utenti** a “pieno” uso.

In pratica non tutti useranno tutti e 5 i messaggi ogni giorno, quindi con 250 RPD puoi avere anche **più di 50 utenti** (molti ne useranno 1–3). Quando la quota giornaliera è finita, le richieste restano bloccate fino al giorno dopo (o mostri “limite raggiunto oggi”).

### Riepilogo

- **Gratis** = free tier Google (0 €).
- **Quota** = tot richieste/giorno **per tutta l’app** (tutti gli utenti free insieme).
- **Stima utenti**: con 5 msg/user/giorno, 250 RPD ≈ 50 utenti “a pieno”, 1.000 RPD ≈ 200 utenti “a pieno”; con uso reale (media più bassa) puoi avere più utenti.
- I numeri esatti vanno controllati sulla documentazione ufficiale; Google può modificare i limiti (es. riduzioni come a fine 2025).

---

## Se in un giorno scaricano l’app 1000 utenti: cosa succede (lato pratico)

### Situazione

- **1000 download** in un giorno = 1000 utenti che possono aprire l’app e scrivere in chat.
- La **quota Gemini free** è **totale** (tutta l’app): es. **250 richieste/giorno** (Flash) o **1000** (Flash-Lite).
- Ogni messaggio inviato in chat = **1 richiesta** al backend = **1 richiesta** a Gemini (se usi Gemini per i free).

### Cosa succede in pratica

**Con quota 250 richieste/giorno (es. Gemini 2.5 Flash):**

1. I primi **250 messaggi** della giornata (di qualsiasi utente free) vengono serviti: l’IA risponde, tutto ok.
2. Dal **251° messaggio** in poi, la chiamata a Gemini va in **429** (quota superata).
3. L’utente che invia il 251° messaggio (e tutti quelli dopo) **non** riceve risposta dall’IA: il backend può restituire errore e l’app mostra un messaggio tipo *“Limite giornaliero dei messaggi gratuiti raggiunto. Riprova domani o passa ad abbonamento.”*

Quindi: **non è che l’app va in crash.** Semplicemente, dopo un tot di messaggi in quel giorno, i messaggi successivi non vengono più elaborati dall’IA fino al giorno dopo (reset quota a mezzanotte Pacific).

**Con 1000 download in un giorno:**

- Non tutti scrivono subito; molti aprono, pochi inviano 1–2 messaggi.
- Se in totale (tutti i free) si inviano **≤ 250 messaggi** (Flash): tutti vengono serviti.
- Se se ne inviano **> 250**: solo i primi 250 hanno risposta; gli altri vedono “limite raggiunto” (o simile). Chi arriva tardi o chi ha già usato i 5 messaggi personali può vedere il messaggio già al primo tentativo se la quota globale è già esaurita.

### Cosa vede l’utente

- **Ha ancora “messaggi personali” disponibili** (es. 2/5) ma la **quota globale** è finita → invia messaggio → l’app/backend risponde con errore → messaggio tipo: *“I messaggi gratuiti di oggi sono esauriti. Domani si ricomincia, oppure passa ad abbonamento per continuare.”*
- Oppure: *“Limite raggiunto. Riprova domani.”* + pulsante “Passa ad abbonamento”.

Quindi: **l’app resta utilizzabile** (registrazione, menu, Memory Vault, notifiche, ecc.); **solo la chat** smette di rispondere per i free quando si sfora la quota (globale o personale, a seconda di come lo implementi).

### Cosa puoi fare in backend (consigli pratici)

1. **Contatore globale giornaliero**  
   Sul backend tieni il numero di richieste chat “free” già inviate a Gemini oggi. **Prima** di chiamare Gemini, controlli: se già ≥ 250 (o 1000), **non** chiami l’API e rispondi subito con 429 e messaggio chiaro (*“Messaggi gratuiti di oggi esauriti”*). Così eviti di sprecare chiamate e dai sempre lo stesso messaggio agli utenti.

2. **Limite per utente** (già previsto)  
   Ogni utente free ha max 5 messaggi/giorno. Se ha già usato i 5, gli rispondi “Hai finito i 5 messaggi di oggi” senza chiamare Gemini. Così il “budget” di 250 (o 1000) richieste viene distribuito tra più utenti (es. 50 o 200 utenti a “pieno”).

3. **Messaggio unico in app**  
   Sia per “hai finito i tuoi 5 messaggi” sia per “quota globale esaurita” puoi mostrare un solo messaggio generico: *“Oggi non è possibile inviare altri messaggi gratuiti. Riprova domani o passa ad abbonamento.”* L’utente non deve capire la differenza tra quota personale e globale.

4. **Se prevedi picchi (es. 1000 download/giorno)**  
   - Usare **Flash-Lite** (1000 RPD) se disponibile nel free tier, così servi fino a ~1000 messaggi/giorno.  
   - Oppure accettare che, con 250 RPD, dopo ~250 messaggi gli altri vedono “riprova domani / passa ad abbonamento” (messaggio onesto e chiaro).

### Riepilogo

| Cosa | Effetto pratico |
|------|------------------|
| 1000 download in un giorno | L’app non va in crash; tutti possono registrarsi e usare le funzioni che non passano da Gemini (notifiche, Memory Vault, menu, ecc.). |
| Chat free con quota 250/giorno | Dopo 250 messaggi totali (tutti gli utenti), le richieste chat free non vengono più servite fino al giorno dopo; l’app mostra “limite raggiunto / riprova domani / passa ad abbonamento”. |
| Cosa fare | Contatore globale lato backend; messaggio chiaro in app; opzionale uso Flash-Lite (1000 RPD) se disponibile. |
