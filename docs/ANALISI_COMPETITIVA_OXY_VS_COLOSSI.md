# OXY Real vs i colossi — Analisi competitiva e strategia “Davide vs Golia”

**Obiettivo:** capire dove siamo avanti o indietro rispetto ai competitor e come uscirne vincenti (prodotto, posizionamento, prezzi).

*Ultimo aggiornamento: marzo 2025 — Progetto OXY Real.*

---

## 1. Chi sono i “Golia”

| Competitor | Tipo | Prezzo (indicativo) | Posizionamento |
|------------|------|---------------------|----------------|
| **ChatGPT Plus** | Assistente generico | ~22–24 €/mese (EU) | IA potente, GPT-4o, nessun abbonamento annuale scontato |
| **ChatGPT Pro** | Top tier OpenAI | ~200 $/mese | o1, modelli reasoning, power user |
| **Gemini Advanced** (Google One AI) | Assistente + ecosistema Google | ~22 €/mese | 2 TB storage, Gmail/Docs, contesto 1M token |
| **Microsoft Copilot Pro** | Assistente + Office | ~22 €/mese | Word, Excel, Outlook, GPT-4 Turbo |
| **Replika** | Companion emotivo | ~20 $/mese, ~50–70 $/anno, 300 $ lifetime | “AI che si preoccupa”, voce, AR, coaching |
| **Bodie, Memno, Qwox, Klara** | Personal AI / “second brain” | Vari (spesso freemium) | Memoria, organizzazione vita, privacy |

---

## 2. OXY Real oggi — sintesi

- **Posizionamento:** compagno conversazionale che **ti conosce**, ricorda obiettivi e conversazioni, tono da amico/coach (Anima/Marco). “Real Identity” = identità reale potenziata dall’IA.
- **Modelli:** Free/Starter = gpt-4o-mini, Pro = gpt-4o, Elite = gpt-4-turbo (configurabili da env).
- **Funzionalità chiave:** Memory Vault (identità, obiettivi, key facts, promemoria), Diario, Vision (foto), Ricerca web (Tavily), 17 Power Badges (“Agisci come”), TTS, multilingua (it, en, fr, es, ar, zh).
- **Prezzi (listino da STRIPE_PRODOTTI_COMPLETI.md):**
  - **Abbonamenti:** Starter 19 €/mese, Pro 39 €/mese, Elite 59 €/mese (+ annuali con ~20% sconto).
  - **Lifetime:** Starter 90 €, Pro 190 €, Elite 390 € (una tantum, utente porta Oxy Key).
  - **Free:** 5 msg/giorno, Memory Vault, notifiche, una voce default.
  - **Pacchetti token:** 100k e 500k (prezzi suggeriti 5 € e 20 €).

---

## 2.1 Verifica: codice vs documenti

L’analisi competitiva va basata su **cosa l’app fa davvero oggi** (codice) e su **cosa dicono i documenti** (prezzi, feature list). Di seguito cosa è stato controllato.

**Verificato nel codice (stato attuale):**

| Elemento | Dove | Stato |
|----------|------|--------|
| **Memory Vault** | `App.js` (effectiveFlags, tile, long-press salva), `chatService.js` (GET/POST /api/memory), `backend` GET/POST `/api/memory` | ✅ Implementato e usato |
| **Diario** | `App.js` (showDiaryModal, refetchDiary), `diaryService.js` (GET/POST /api/diary), `backend` GET/POST `/api/diary` | ✅ Implementato e usato |
| **Vision** | `App.js` (handleCameraVision, effectiveFlags.vision, blocco Starter/Free), backend in `/api/chat` con imageBase64 | ✅ Implementato; Pro/Elite only |
| **Storie** | `App.js` (showStoriesModal, lastCompletedStoryTitle), modal Storie con contenuto | ✅ UI e stato presenti |
| **Community** | `App.js` (showCommunityModal, communityTab forYou/explore/ask, communityExploreHub) | ✅ UI e tab presenti |
| **Cloud** | `App.js` (effectiveFlags.cloud, backup/export, cloudImportPayload), menu “Gestisci Cloud” | ✅ Solo Elite; export/import locale |
| **Power Badges** | `powerBadges.js`, `App.js` (POWER_BADGES, moduloAttivo, moduleName in chiamate chat) | ✅ 17 badge, inviati al backend |
| **Modelli per piano** | `backend` getChatModelForPlan(), OPENAI_MODEL_STARTER/PRO/ELITE | ✅ Free/Starter=mini, Pro=4o, Elite=4-turbo |
| **Limiti messaggi** | `backend` DAILY_LIMITS_BY_PLAN (env: 50/150/400), FREE_DAILY_LIMIT 5; `pricingConfig.js` DAILY_LIMITS | Vedi sotto |
| **Piano free** | `App.js` isFreePlan, effectiveFlags da piano 'free', banner 5/5, openMenuToSubscription | ✅ Implementato |
| **Billing / Stripe** | Backend billing status, readBilling, Stripe webhook; app mostra piani e usage | ✅ Flusso presente |

**Disallineamenti codice vs documenti:**

- **`pricingConfig.js`** (frontend): contiene valori **da test** — `suggestedPrice: 0.1` per tutti i piani, `DAILY_LIMITS`: 5, 10, 15 (commento: “TEST: minimi per velocizzare test”). In produzione andrebbero 19/39/59 e limiti 50/150/400 (o quelli in `.env` backend).
- **Backend:** i limiti giornalieri sono letti da **env** (`DAILY_LIMIT_STARTER`, `DAILY_LIMIT_PRO`, `DAILY_LIMIT_ELITE`) con default 50, 150, 400; il frontend non legge gli stessi numeri da backend per la sola UI, usa `pricingConfig`.
- **Prezzi mostrati in app:** dipendono da `pricingConfig` (suggestedPrice) e/o da Stripe (se i Price ID restituiscono il prezzo). Per il confronto con i competitor si sono usati i **prezzi di listino del documento** STRIPE_PRODOTTI_COMPLETI (19/39/59 €, 90/190/390 €).

In sintesi: le **funzionalità** dell’analisi sono state verificate nel codice; **prezzi e limiti** in tabella e proposte fanno riferimento al listino (documenti) e ai default produzione (backend env), non ai valori di test ancora presenti in `pricingConfig.js`.

---

## 3. Confronto punto per punto: dove siamo indietro

| Aspetto | Noi (OXY) | Colossi | Gap |
|--------|-----------|--------|-----|
| **Brand e fiducia** | Brand nuovo, poco noto | OpenAI, Google, Microsoft = fiducia immediata | Indietro: servono prova sociale, recensioni, contenuti (blog, video). |
| **Ecosistema** | App standalone | Gemini = Gmail/Docs/2TB; Copilot = Office; ChatGPT = ecosistema plugin | Indietro: non abbiamo app “bloccanti” (email, doc). Possiamo puntare su “un solo posto dove tutto ti conosce”. |
| **Contesto / token** | Contesto “classico” (memoria strutturata + cronologia) | Gemini 1M token, altri contesti ampi | Indietro su numeri puri; avanti su **memoria persistente strutturata** (obiettivi, fatti, identità) che loro non hanno così chiara. |
| **Prezzo mensile entry** | Starter 19 €/mese (sconto lancio 50% → 9 €) | ChatGPT Plus ~22 €, Gemini/Copilot ~22 € | **Avanti:** stesso ordine di prezzo ma con sconto lancio e tier sotto (Starter). |
| **Prezzo massimo** | Elite 59 €/mese | ChatGPT Pro 200 $ | **Avanti:** non competiamo sul “super-premium”; Elite è molto più accessibile. |
| **Opzione “niente abbonamento”** | Lifetime 90 / 190 / 390 € (con tua chiave) | ChatGPT/Gemini/Copilot: solo abbonamento | **Avanti:** unica vera alternativa “paga una volta e tieni per sempre” (costi API a carico utente). |
| **Memoria a lungo termine** | Memory Vault (identità, obiettivi, key facts, lastContext) + tool save_memory | ChatGPT: memoria “generica” recente; Gemini/Copilot: contesto sessione; Replika: memoria emotiva | **Avanti:** noi abbiamo memoria **strutturata e azionabile** (salva obiettivo, “ricordamelo”, integrazione con prompt). |
| **Personalità coerente** | Anima/Marco, tono fisso da brief, 6 voci (Pro/Elite) | ChatGPT: personalità configurabile ma non “compagno fisso”; Replika: molto emotivo | **Avanti:** posizionamento “amico/coach che non dimentica” è chiaro e differenziante. |
| **Diario integrato** | Sì, con lettura da parte dell’IA | Non standard nei colossi | **Avanti:** diario + memoria + chat = storia di vita in un unico posto. |
| **Ricerca web** | Tavily integrata (dopo ott 2023) | Tutti ce l’hanno | Pari: non indietro. |
| **Vision (foto)** | Sì (Pro/Elite) | Tutti ce l’hanno | Pari. |
| **Voce (TTS)** | 6 voci, “Prova” in impostazioni; risposta a voce (mani libere) | ChatGPT/Gemini: voce; Replika: forte su voce/AR | Leggermente indietro su “esperienza vocale” (es. chiamate vocali lunghe come Replika). |
| **Scelta voce** | Pro/Elite: 6 voci; Free/Starter: una default | Variabile | Pari o avanti (più voci = più personalizzazione). |
| **Power Badges (“Agisci come”)** | 17 modalità (Coach, Planner, Legal, Gourmet, ecc.) | Custom GPT / “mode” simili ma meno integrati con memoria | **Avanti:** combinazione badge + Memory Vault è unica. |
| **Piano gratuito** | 5 msg/giorno, Memory Vault, notifiche, una voce | ChatGPT/Gemini: tier free limitato; Replika: free molto limitato | **Avanti:** free utilizzabile per “provare la memoria e il compagno” senza carta. |
| **Privacy / dati** | Dati su tuo backend/Firebase; nessun “training su di te” dichiarato | Colossi: policy complesse, dati per migliorare modelli | **Avanti potenziale:** messaggio “i tuoi dati restano tuoi, non addestriamo modelli su di te” (da esplicitare in policy e marketing). |
| **Multilingua** | it, en, fr, es, ar, zh | Tutti multilingua | Pari. |
| **Supporto / assistenza** | Email, knowledge base | Colossi: supporto largo; Replika: community | Indietro: servono FAQ chiare, risposta rapida, magari chat support o “Contattaci” in-app. |

---

## 4. Dove siamo avanti (da sfruttare in marketing)

1. **Memory Vault + coerenza:** memoria strutturata (identità, obiettivi, fatti, “dove eravamo rimasti”) che l’IA usa davvero. I colossi non hanno un “vault” così esplicito e azionabile.
2. **Diario + IA:** diario che l’IA legge e usa nel contesto. Raro nei competitor generalisti.
3. **Lifetime reale:** pagamento una tantum, niente canone (con tua chiave). Per chi odia gli abbonamenti siamo l’alternativa chiara.
4. **Piano free utilizzabile:** 5 msg/giorno + memoria + notifiche = “prova il valore” senza carta.
5. **Scala di modelli per piano:** mini / 4o / 4-turbo per tier = controllo costo/qualità e messaggio “più paghi, più potenza”.
6. **Power Badges + memoria:** “Agisci come X” con contesto già ricco (obiettivi, fatti) = risposta più pertinente.
7. **Posizionamento “compagno”:** non “assistente task”, ma “amico/coach che ti conosce”. Allineato a Replika/Bodie ma con memoria e strumenti più forti.

---

## 5. Proposte di miglioramento per essere avanti a tutti

### 5.1 Prodotto e UX

- **Memory Vault in evidenza:**  
  - Onboarding: “OXY ricorda obiettivi, promemoria e cosa conta per te. Qui li tiene al sicuro.”  
  - In chat: dopo “ricordamelo” / “salva come obiettivo”, breve conferma visiva (“Salvato in Memory Vault”).  
  - Obiettivo: che “memoria che non dimentica” sia il primo messaggio che arriva ai nuovi utenti.

- **Diario come differenziatore:**  
  - Blocco in-app tipo “Questa settimana nel tuo diario” (sintesi o ultime voci) e CTA “Chiedi a OXY di commentare”.  
  - Obiettivo: “Diario + IA che lo conosce” come feature da citare nelle recensioni e nelle comparazioni.

- **Power Badges discoverability:**  
  - Suggerimenti contestuali (es. “Per questo messaggio potresti usare **Planner**”) o “Badge del giorno”.  
  - Obiettivo: far usare i 17 badge invece che lasciarli nascosti.

- **Prova sociale in-app:**  
  - Sezione “Cosa dicono” (citazioni, stelle, numero download) e link a recensioni store.  
  - Obiettivo: ridurre la diffidenza da “app piccola vs colossi”.

- **Privacy come messaggio:**  
  - Testo chiaro in Privacy e in onboarding: “Non usiamo le tue conversazioni per addestrare modelli. La tua storia resta tua.”  
  - Obiettivo: differenziarsi da “i dati servono a migliorare il servizio” dei big.

- **Supporto visibile:**  
  - Menu: “Aiuto e supporto” con FAQ, “Scrivici” (email o form).  
  - Obiettivo: fiducia e meno abbandoni per dubbi tecnici.

### 5.2 Prezzi e pacchetti (per essere avanti)

- **Mantenere lo sconto lancio 50% (es. primi 30 gg):**  
  - Starter 19 → 9 €, Pro 39 → 19 €, Elite 59 → 29 €.  
  - Messaggio: “Prezzi da lancio: bloccati per i primi iscritti.”

- **Starter sotto i 20 €:**  
  - 19 €/mese (o 9 € in promo) ci mette **sotto** ChatGPT/Gemini/Copilot (~22 €).  
  - Messaggio: “Stesso livello di compagno e memoria, prezzo più basso.”

- **Annuali sempre con sconto netto (~20%):**  
  - Es. Starter annuale ~183 € (15,25 €/mese), Pro ~374 € (31 €/mese), Elite ~566 € (47 €/mese).  
  - Messaggio: “Risparmi X € all’anno rispetto al mensile.”

- **Lifetime come “uscita dall’abbonamento”:**  
  - Comunicare esplicitamente: “Niente più canone. Paghi una volta, usi per sempre (con la tua chiave API).”  
  - Confronto: “Un anno di ChatGPT Plus ≈ 264 €; con OXY Lifetime Starter (90 €) dopo pochi mesi sei in pari.”

- **Free come funnel:**  
  - 5 msg/giorno + Memory Vault + notifiche = “Prova che ti conosce”.  
  - CTA chiara al limite: “Hai finito i messaggi gratuiti di oggi. Sblocca tutto con Starter da 9 € (prezzo lancio).”

- **Pacchetti token come “top-up”:**  
  - Per chi non vuole abbonamento né Lifetime: 100k/500k token a 5 € / 20 €.  
  - Messaggio: “Niente abbonamento: compri credito e lo usi quando serve.”

### 5.3 Posizionamento e messaggi

- **Slogan / payoff:**  
  - “L’IA che ti conosce davvero” / “La memoria che non dimentica” / “Un compagno, non un assistente.”  
  - Da usare in store listing, sito, social.

- **Confronto indiretto (senza nominare):**  
  - “Non solo risposte: obiettivi, diario e promemoria in un unico posto.”  
  - “Paga una volta e tienilo per sempre: l’alternativa senza abbonamento.”

- **Target espliciti:**  
  - Chi vuole un “compagno” coerente (non solo Q&A).  
  - Chi vuole uscire dagli abbonamenti (Lifetime).  
  - Chi cerca memoria a lungo termine (obiettivi, abitudini, contesto di vita).

### 5.4 Cose da evitare

- Non inseguire “più modelli / più contesto” come unico messaggio: i colossi vincono su numeri. Vincere su **memoria strutturata**, **diario**, **personalità**, **prezzo** e **Lifetime**.
- Non alzare i prezzi mensili sopra i 22 € per lo Starter: perderemmo il vantaggio “stesso valore, prezzo minore”.
- Non nascondere il piano free: è il nostro ingresso per utenti diffidenti.

---

## 6. Riepilogo: dove siamo indietro vs avanti

| Area | Stato | Azione prioritaria |
|------|--------|---------------------|
| Memoria strutturata (Memory Vault) | **Avanti** | Metterla in primo piano in onboarding e comunicazione |
| Diario + IA | **Avanti** | Sintesi/suggerimenti “questa settimana” e CTA in-app |
| Lifetime (una tantum) | **Avanti** | Messaggio “niente abbonamento per sempre” + confronto costo annuo |
| Prezzo entry (Starter + sconto lancio) | **Avanti** | Tenere 19 € (9 € promo) e sconto annuale ~20% |
| Power Badges | **Avanti** | Migliorare discoverability (suggerimenti, “badge del giorno”) |
| Brand / fiducia | **Indietro** | Recensioni, prova sociale, contenuti, supporto visibile |
| Ecosistema (email, doc) | **Indietro** | Non replicare; puntare su “un posto che ti conosce” e privacy |
| Voce / esperienza vocale lunga | **Leggermente indietro** | Valutare migliorie TTS / “chiamata” in roadmap |
| Supporto utente | **Indietro** | FAQ + “Scrivici” in menu |

---

## 7. Prossimi step operativi suggeriti

1. **Copy e store listing:** rifare titolo, sottotitolo e descrizione Play/App Store mettendo al centro: memoria, diario, compagno, Lifetime, prezzo lancio.
2. **Onboarding:** uno screen “OXY ricorda” con Memory Vault + esempio (“Obiettivi, promemoria, dove eravamo rimasti”).
3. **Privacy policy:** frase esplicita “Non usiamo le tue conversazioni per addestrare modelli”.
4. **Menu:** voce “Aiuto e supporto” con link a FAQ e email.
5. **Prezzi in app:** verificare che sconto 50% e annuali siano chiari e che il confronto con “nessun canone con Lifetime” sia leggibile.
6. **Roadmap:** valutare migliorie voce/TTS e piccole integrazioni (es. “Esporta obiettivi” o “Sintesi settimana”) per rafforzare “second brain”.

Se vuoi, il prossimo passo può essere: (a) adattare i testi di store/onboarding a questa analisi, (b) definire 2–3 KPI (es. conversion free→Starter, retention 30 gg), o (c) approfondire una sola sezione (es. solo prezzi o solo UX).

---

## 8. Come farci notare: l’app che “urla”

Data la **latenza della fiducia** (i colossi hanno nome e budget), l’app non può limitarsi a “essere migliore”: deve **mostrarlo subito**, in modo che in pochi secondi o minuti l’utente pensi: *“Questo gli altri non ce l’hanno”*. Obiettivo: far vedere che **i colossi sono indietro**, senza nominarli.

### 8.1 Principio: dimostrare, non raccontare

- **Non basta** dire “abbiamo la memoria”: l’utente è abituato a claim vaghi.
- **Serve** che veda e tocchi la differenza: salva “ricordami di X” → lo vede in Memory Vault → la prossima risposta dell’IA usa X. In 2 minuti ha la prova.
- Ogni schermata e ogni flusso devono **urlare** uno di questi messaggi:
  - “Qui ti conoscono.”
  - “Qui non ricominci da zero.”
  - “Qui puoi pagare una volta e basta.”
  - “Qui i tuoi dati non addestrano nessuno.”

### 8.2 Primi 10 secondi (store + splash)

- **Titolo / sottotitolo store:** una frase che colpisce e distingue.
  - Esempio: **“OXY Real – L’IA che ti conosce”** / **“Memoria, diario, compagno. Non ricominciare da zero.”**
  - Evitare “Assistente AI” generico; puntare su “memoria”, “ti conosce”, “compagno”.
- **Splash / prima schermata:** una sola frase forte, non un elenco.
  - Esempio: **“L’unica che ricorda obiettivi, promemoria e dove eravate rimasti”** oppure **“Qui non ti chiede due volte la stessa cosa.”**
- **Icona e nome:** coerenti con “Real”, “identità”, “compagno” (non “bot” o “assistente”).

### 8.3 Primo minuto (dopo l’apertura)

- **Prima cosa visibile:** non solo la chat vuota. Una **barra o card sopra la chat** con:
  - **“Memory Vault”** + testo tipo: “Obiettivi, promemoria, cose da non dimenticare. OXY li usa in ogni risposta.”
  - CTA: “Apri” o “Aggiungi il primo ricordo” → porta in Memory Vault (o a un mini-onboarding “Salva il primo obiettivo”).
- **Messaggio di benvenuto dell’IA:** che **citiamo la memoria** anche se è vuota.
  - Esempio: “Ciao. Sono OXY. Qui tengo a mente obiettivi e cose che mi chiedi di ricordare: quando ne aggiungi, non dovrò più chiederteli. Dimmi pure cosa ti passa per la testa.”
  - Messaggio: “qui è diverso, qui c’è memoria”.

### 8.4 “Proof moment” nei primi 5 minuti

- **Flusso obbligato (soft):** guidare l’utente a fare **una** azione che i colossi non mostrano così chiaramente.
  1. L’utente scrive qualcosa tipo “ricordami di chiamare Marco venerdì” (o suggeriamo noi una frase esempio).
  2. L’IA risponde e conferma: “Fatto, l’ho messo in Memory Vault. Te lo ricorderò.”
  3. **Toast o banner:** “Salvato in Memory Vault ✓” con pulsante “Vedi” → apre Memory Vault con la voce appena aggiunta.
  4. Prossimo messaggio (o stesso turno): l’IA può dire “Quando parli con Marco venerdì, se vuoi ti aiuto a prepararti.”
- **Risultato:** in pochi minuti l’utente ha **visto** che (a) si può chiedere di ricordare, (b) finisce in un posto dedicato, (c) l’IA ci si riferisce. Con gli altri non ha questo flusso così esplicito e strutturato.

### 8.5 Messaggi che “urlano” in-app (copy ovunque)

- **Sopra la chat (banner/card):**
  - “Memory Vault: OXY usa obiettivi e promemoria in ogni risposta.”
  - “Qui non ricominci da zero.”
- **In Memory Vault:**
  - “Quello che OXY ricorda di te. Gli altri assistenti non hanno questo.”
  - “Ogni risposta di OXY può usare queste informazioni.”
- **Nel Diario:**
  - “Il tuo diario. OXY lo legge e lo usa per capirti meglio.”
- **Menu Abbonamento / prezzi:**
  - “Niente abbonamento a vita? Scegli Lifetime: paghi una volta, nessun canone.”
  - “Prezzo lancio: bloccato per te. I colossi non offrono questo.”
- **Dopo “Ricordamelo” / “Salva come obiettivo”:**
  - “Salvato. È la differenza OXY: qui ti conoscono.”

Questi testi vanno tradotti e adattati (tono, lunghezza) ma il **tema** è sempre: *noi abbiamo questo, qui è strutturato, qui non ricominci da zero, qui puoi pagare una volta*.

### 8.6 Una “prova” in più: confronto esplicito (opzionale, fuori app)

- **Landing / sito / video:** una sezione **“Perché OXY è diversa”** con 3–4 righe a confronto, **senza nominare i competitor**.
  - Esempio: “Con gli assistenti classici ogni conversazione può essere da zero. Con OXY, obiettivi e promemoria restano in Memory Vault e vengono usati ogni volta.” / “Molti servizi sono solo abbonamento. Con OXY puoi pagare una volta (Lifetime) e tenere l’app per sempre.” / “Noi non usiamo le tue conversazioni per addestrare modelli.”
  - Serve a chi cerca “alternativa a X” e arriva da fuori: trova subito i motivi per cui siamo avanti.

### 8.7 Cosa implementare per primi (per “urlare” subito)

1. **Onboarding / primo avvio:** uno screen “OXY ricorda” con icona Memory Vault + una frase (“Obiettivi, promemoria, dove eravate rimasti. Solo qui.”) + pulsante “Inizia”.
2. **Card/banner sopra la chat:** “Memory Vault: OXY usa quello che salvi in ogni risposta” + link ad Apri / Aggiungi primo ricordo.
3. **Messaggio di benvenuto dell’IA:** che parli esplicitamente di memoria e di “non dover ripetere”.
4. **Conferma visiva dopo “ricordami” / “salva come obiettivo”:** toast “Salvato in Memory Vault ✓” con opzione “Vedi”.
5. **Copy in Memory Vault e Diario:** 1–2 frasi che dicono “questo gli altri non ce l’hanno” (o equivalente).
6. **Sezione Abbonamento:** una riga chiara su Lifetime (“Paga una volta, nessun canone”) e una su prezzo lancio (“Prezzo bloccato per i primi”).

In questo modo l’app **non si limita a essere innovativa**: **lo dimostra** nei primi secondi e nei primi minuti, riduce la latenza della fiducia e fa vedere che i colossi, su memoria e rapporto con l’utente, sono indietro.
