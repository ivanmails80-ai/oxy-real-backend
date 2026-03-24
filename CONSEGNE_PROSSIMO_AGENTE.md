# Passaggio di consegne — Prossimo agente

**Data:** 2 marzo 2026  
**Contesto:** L’utente passa a un altro agente perché Cursor va in crash per memoria. Questo file serve al prossimo agente per capire dove siamo e cosa fare dopo.

---

## 1. Dove siamo arrivati

### Completato di recente (sessione precedente)
- **Banner Memory Vault in chat:** rimosso dalla chat (sia layout web che nativo) in `App.js`.
- **Stile testi legali (Termini / Privacy):** modale in `src/screens/AuthScreen.js` aggiornata con stile “da grande società”: caratteri piccoli (11px), interlinea stretta (14), testo giustificato, titoli e margini compatti. I testi sono in `src/content/legalContent.js`.
- **Check go-live versione gratuita / beta:** era stato richiesto un check del codice prima del beta tester (verifiche bug, caratteri mancanti, crash). Se non è stato completato, va fatto come primo passo utile.

### Stato progetto (riferimento: GO_LIVE.md)
- **Backend:** URL in codice `https://oxy-real-backend.onrender.com`; variabili EAS da impostare in EAS Dashboard.
- **App:** Flusso lingua → login/registrazione → Abbonamento/Lifetime → pagamento (Stripe) → chat. Flusso descritto in **`docs/FLUSSO_APP.md`**.
- **Prossimi passi logici:** beta tester → build APK → installazione su telefono → (poi store, legali, Stripe LIVE se serve). Ordine dettagliato in **GO_LIVE.md** §3 e §6bis.

### File e regole importanti
- **Go-live e ordine passi:** **`GO_LIVE.md`** (unico riferimento; non sostituirlo con altri doc).
- **Flusso utente (lingua, iscrizione, pagamento, chat):** **`docs/FLUSSO_APP.md`**.
- **Manutenzione e rischi (cosa non toccare, cosa può rompere l’app):** **`docs/MANUTENZIONE_E_RISCHI.md`**.
- **Regole Cursor:** `.cursor/rules/manutenzione-app.mdc` e `.cursor/rules/obfuscazione-pre-vendita.mdc` (obbligatorie).
- **Checklist test:** **`CHECKLIST_TEST_APP.md`** (per beta e dopo installazione APK).
- **Build APK e installazione sul telefono:** **`COME_CREARE_APK_E_INSTALLARLA.md`** (unica guida; preflight → prebuild → build con bat o Android Studio → installazione con `INSTALLA-APP-SUL-TELEFONO.bat` o `adb install -r ...`).

---

## 2. Cosa fare successivamente

1. **Check pre-beta (se non già fatto):**  
   Verificare che non manchi nulla per il go-live in versione gratuita: nessun bug evidente, nessun carattere/stringa mancante che possa causare crash, riferimenti a file/asset assenti. Utile un passaggio su punti critici (avvio, lingua, login, chat, billing, legal).

2. **Beta tester:**  
   L’utente vuole passare al beta tester. Prima di creare l’APK e installarla sul telefono, il check di cui al punto 1 è consigliato. Poi seguire **GO_LIVE.md** §6bis (Fase 1 beta con Expo, poi Fase 2 APK).

3. **Immagine per l’icona dell’app:**  
   L’utente ha chiesto di **modificare un’immagine da inserire all’interno dell’icona dell’app**.  
   - **Dove si gestisce l’icona:**  
     - **`app.json`:** `expo.icon` → `./assets/icon.png` (icona principale); `expo.web.favicon` → `./assets/favicon.png`; per Android, `expo.android.adaptiveIcon` ha solo `backgroundColor: "#ffffff"` (nessun `foregroundImage` esplicito; Expo usa l’icona principale per l’adaptive icon se non si specifica altro).  
     - **Asset:** cartella **`assets/`** (icon.png, favicon.png; eventuale splash se presente in app.json).  
   - **Cosa fare per il prossimo agente:**  
     - Chiedere all’utente **l’immagine da usare** (file che vuole come icona o come “contenuto” dentro l’icona).  
     - Se serve **sostituire l’icona:** sostituire `assets/icon.png` (e se serve `assets/favicon.png`) rispettando le dimensioni consigliate Expo (es. 1024x1024 per icon.png; 48x48 per favicon).  
     - Se serve un **adaptive icon Android** con un’immagine diversa (es. logo su sfondo): aggiungere in `app.json` sotto `expo.android.adaptiveIcon` la proprietà `foregroundImage: "./assets/adaptive-icon-foreground.png"` (o percorso scelto) e creare/posizionare l’asset; il foreground tipicamente è 1024x1024 con area “sicura” centrale (circa 66% per i mask).  
     - Dopo aver cambiato asset, se è stato usato `npx expo prebuild` in passato, rilanciare `npx expo prebuild --platform android --clean` prima della build release, così le icone native vengono rigenerate.

---

## 3. Riepilogo per il prossimo agente

| Cosa | Dove / Come |
|------|-------------|
| Stato e ordine passi go-live | **GO_LIVE.md** |
| Flusso app (lingua → login → payment → chat) | **docs/FLUSSO_APP.md** |
| Cosa non toccare / rischi | **docs/MANUTENZIONE_E_RISCHI.md** + `.cursor/rules/manutenzione-app.mdc` |
| Test beta / post-APK | **CHECKLIST_TEST_APP.md** |
| Build APK e installazione | **COME_CREARE_APK_E_INSTALLARLA.md** (unica guida), **GO_LIVE.md** §6bis, **INSTALLA-APP-SUL-TELEFONO.bat** |
| Icona app e asset | **app.json** (`icon`, `android.adaptiveIcon`, `favicon`), cartella **assets/** |
| Modifica immagine per icona | Ottenere dall’utente il file; sostituire/aggiungere asset in `assets/` e aggiornare `app.json` se serve `foregroundImage`; eventuale prebuild --clean prima della build |

L’utente ha ringraziato e chiesto esplicitamente questo passaggio di consegne; la priorità immediata è supportarlo sul beta tester e sull’**immagine da inserire nell’icona dell’app** (chiarire quale immagine e dove deve apparire, poi applicare le modifiche in `assets/` e `app.json`).

---

## Aggiornamento (preparazione build APK)

- **Eseguito in autonomia:** `npm install` e `npx expo prebuild --platform android --clean` sono stati eseguiti con successo; la cartella `android` è aggiornata e `android/local.properties` contiene `sdk.dir` per l’utente `giuse`.
- **Build Gradle da ambiente Cursor:** fallisce per “SDK location not found” (in questo ambiente non c’è Android SDK). **Sul PC dell’utente** la build va fatta con **Android Studio** (apri la cartella `android` → Build → Build APK(s)) oppure con il bat **INSTALLA-APP-SUL-TELEFONO.bat**; poi installare con `adb install -r android\app\build\outputs\apk\release\app-release.apk` con telefono collegato.
- **Riferimento:** **COME_CREARE_APK_E_INSTALLARLA.md** (Opzione B = Android Studio se il bat/Gradle fallisce).
