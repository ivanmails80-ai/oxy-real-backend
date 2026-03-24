# Guida: caricare OXY Real su Google Play Store

**Quando usarla:** dopo che i beta tester hanno verificato i punti critici (vedi **BETA_PUNTI_CRITICI.md**) e l’app è stabile.

---

## 1. Cosa ti serve prima di iniziare

- **Account Google Play Console** (costo una tantum **25 €**): [play.google.com/console](https://play.google.com/console).
- **App firmata:** EAS Build la firma per te se usi EAS Submit (consigliato).
- **Privacy policy** pubblicata online (URL pubblico). In OXY Real i testi sono in `src/content/legalContent.js`; per lo store serve un **link** (es. `https://tuosito.com/privacy` o pagina su Firebase Hosting / GitHub Pages).
- **Backend e Stripe** configurati per produzione (URL, webhook LIVE se vendi abbonamenti).

---

## 2. Ordine dei passi (in sintesi)

| Ordine | Cosa | Dove |
|--------|------|------|
| 1 | Account sviluppatore + crea app | Play Console |
| 2 | Build release (APK o AAB) | EAS o Android Studio |
| 3 | Firma app | EAS (automatica) o keystore manuale |
| 4 | Compila scheda store (testi, immagini, policy) | Play Console → scheda app |
| 5 | Contenuto e target (rating, dati sensibili) | Play Console |
| 6 | Invio build: prima **Internal testing**, poi **Closed**, poi **Production** | EAS Submit + Play Console |

---

## 3. Account e creazione app (Play Console)

1. Vai su [play.google.com/console](https://play.google.com/console) e accedi con il tuo account Google.
2. Se è la prima volta: **Accetta** i contratti e paga la **tassa una tantum di 25 €**.
3. **Crea app:** pulsante **"Crea app"** → inserisci nome (es. "OXY Real"), lingua predefinita, tipo (App o Giochi), categoria (es. Stile di vita o Produttività). Decidi se app gratuita o a pagamento (OXY Real è gratuita con acquisti in-app).
4. Salva: l’app viene creata e hai la **dashboard** della scheda.

---

## 4. Build da inviare (EAS consigliato)

- **Versione:** in `app.json` verifica `expo.version` (es. `1.0.15`) e `android.versionCode` (es. `16`). Per ogni nuovo upload in store il **versionCode** deve essere **maggiore** del precedente (es. 17, 18, …).
- **Build production:** dalla cartella del progetto:
  ```bash
  npx eas build --platform android --profile production
  ```
  Quando EAS ha finito, scarichi l’**AAB** (o APK se hai configurato APK) dal link che ti dà Expo.
- **Firma:** con EAS la build è già firmata (EAS gestisce il keystore). Al primo submit, Play Console può chiedere di **registrare la chiave di upload** (Upload key) di EAS: segui le istruzioni a schermo (di solito “Registra la chiave” e incolla il certificato che EAS ti mostra).

---

## 5. Invio build a Google (EAS Submit)

1. Dopo la build:
   ```bash
   npx eas submit --platform android --latest
   ```
2. EAS chiede: **Track** (canale di rilascio). Scegli:
   - **internal** = Internal testing (solo tester che aggiungi per email).
   - **alpha** = di solito Closed testing (lista tester).
   - **production** = disponibile a tutti (dopo revisione).
3. **Prima volta:** collega l’account Google Play (EAS chiede di accedere a Google Play Console e di selezionare l’app). Se serve un **service account** per automatizzare, dalla Play Console puoi crearlo e dare i permessi (EAS doc: “EAS Submit”).
4. Al termine, la build compare in Play Console nella traccia scelta (es. **Testing** → **Internal testing**).

**Consiglio:** invia prima su **Internal testing**, installa e prova. Poi promuovi a **Closed testing** (beta tester). Quando tutto ok, **Production**.

---

## 6. Compilare la scheda app (Store listing)

In Play Console → la tua app → **Crescita** → **Presenza su store** (o **Dashboard** → “Imposta la scheda store”):

- **Nome app:** es. OXY Real (max 30 caratteri).
- **Breve descrizione:** max 80 caratteri (compare nella ricerca).
- **Descrizione completa:** cosa fa l’app, per chi è (max 4000 caratteri).
- **Icona:** 512 x 512 px (PNG, no trasparenza).
- **Screenshot:** almeno 2 (telefono); dimensioni consigliate 1080 x 1920 o simili. Puoi aggiungere anche per tablet se supporti tablet.
- **Grafica funzionalità:** opzionale, 1024 x 500 px.
- **Categoria:** es. Stile di vita / Produttività / Social.
- **Contatto:** email (es. oxy@oxyreal.it).

---

## 7. Contenuto e policy (obbligatori)

- **Privacy policy:** URL pubblico (es. `https://tuosito.com/privacy`). Va inserito nella scheda store e in **Norme e dati** (sezione “Privacy”).
- **Questionario contenuti:** rispondi su dati raccolti (email, ID dispositivo, ecc.), se l’app è per bambini, se ci sono acquisti in-app. Per OXY Real: acquisti in-app sì (abbonamenti/token), dati utente sì (account, messaggi per il servizio).
- **Classificazione contenuti:** compila il questionario (età target, violenza, ecc.). Di solito per una chat/assistente è “Tutti” o “Adulti” a seconda dei contenuti.
- **Destinatari:** se l’app è per tutti, seleziona le fasce d’età; se ci sono acquisti in-app, va dichiarato.

---

## 8. Internal → Closed → Production

1. **Internal testing:** build inviata con `eas submit` su track **internal**. Aggiungi tester per email (max 100). Nessuna revisione Google; aggiornamenti veloci. Usa questa per l’ultimo controllo prima dei beta.
2. **Closed testing:** dalla console, crea una “Release” in **Closed testing** e aggiungi la build (o promuovi da Internal). Aggiungi elenco tester (email o gruppo Google). Dopo aver caricato la release, puoi condividere il **link di iscrizione** ai beta tester.
3. **Production:** quando sei pronto per il go live, crea una **Release** in **Production**, aggiungi la stessa build (o una nuova con versionCode superiore), compila le note di rilascio e invia in revisione. I tempi di revisione Google sono in genere 1–3 giorni (a volte più al primo rilascio).

---

## 9. Riepilogo comandi (dal progetto)

| Cosa | Comando |
|------|---------|
| Preflight (controlli) | `npm run preflight:go-live` |
| Build Android production | `npx eas build --platform android --profile production` |
| Invio ultima build (scegli track) | `npx eas submit --platform android --latest` |

---

## 10. Riferimenti

- **EAS Submit:** [docs.expo.dev/submit/eas-submit](https://docs.expo.dev/submit/eas-submit/)
- **Versioni Android (versionCode):** [docs.expo.dev/build-reference/app-versions](https://docs.expo.dev/build-reference/app-versions/)
- **Play Console:** [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)

Dopo il caricamento in Production e l’approvazione, l’app sarà visibile in Play Store (puoi scegliere paesi e se rilasciare gradualmente).
