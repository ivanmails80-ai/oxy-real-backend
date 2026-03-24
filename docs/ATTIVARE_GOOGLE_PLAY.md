# Attivare subito Google Play – OXY Real

Guida operativa per pubblicare l’app su Google Play (prima dello store Apple).

---

## 1. Account Google Play Developer

- Vai su [Google Play Console](https://play.google.com/console).
- Accedi con un account Google (meglio uno dedicato al progetto).
- **Registra l’account sviluppatore**: pagamento una tantum **$25** (carta).
- Compila nome sviluppatore, email, sito (puoi usare il sito vetrina OXY).
- Accetta i contratti di distribuzione.

Tempi: di solito attivazione in pochi minuti; a volte revisione fino a 48 ore.

---

## 2. Crea l’app in Play Console

- In Play Console → **Tutte le app** → **Crea app**.
- Nome app: **OXY Real** (o il nome definitivo).
- Lingua predefinita: Italiano (e altre se servono).
- Tipo: **App** (non gioco).
- Gratuita o a pagamento: **Gratuita** (monetizzi con abbonamento/acquisto dal sito).
- Compila le dichiarazioni su privacy, norme, contenuti (vedi sotto).

---

## 3. Build di produzione (AAB)

L’app va inviata in formato **Android App Bundle (AAB)**, non APK. EAS è già configurato con `production` → `app-bundle`.

- Aggiorna versioni in **app.json** (se non l’hai già fatto):
  - `expo.version` (es. `1.0.0`)
  - `android.versionCode` (numero intero, incrementalo a ogni upload)
- Build:
  ```bash
  npx eas build --platform android --profile production --non-interactive
  ```
- Al termine scarichi l’AAB da [expo.dev](https://expo.dev) → il tuo progetto → Builds, oppure usi direttamente EAS Submit (step 4).

---

## 4. Invio a Google Play (EAS Submit)

- **Prima volta**: collega EAS al tuo account Google Play (EAS chiederà le credenziali; puoi usare un account di servizio JSON dalla Play Console).
- Comando:
  ```bash
  npx eas submit --platform android --latest --profile production
  ```
- Scegli la build **production** più recente; EAS caricherà l’AAB nella Play Console (traccia “Production” o “Internal testing” a seconda di come configuri).

Documentazione: [EAS Submit – Android](https://docs.expo.dev/submit/android/).

---

## 5. Scheda store (listing) in Play Console

Nella Play Console, per la tua app compila almeno:

- **Grafica**: icona 512×512, feature graphic 1024×500, screenshot (telefono, almeno 2).
- **Testo**: titolo breve (max 30 caratteri), descrizione breve (max 80), descrizione completa (cosa fa l’app, abbonamento/acquisto dal sito, ecc.).
- **Categoria**: es. Stile di vita o Produttività (scegli la più adatta).
- **Contatto**: email per supporto e privacy.

---

## 6. Contenuti e policy (obbligatori)

- **Privacy policy**: URL pubblico (es. `https://tuosito.com/privacy`). Il testo può essere quello in `docs/PRIVACY_POLICY.md` / `src/content/legalContent.js` (sostituendo i placeholder con la versione definitiva).
- **Target e contenuti**: fascia d’età, dichiarazione che non raccogli dati sensibili in modo non dichiarato, ecc.
- **Dati raccolti**: in Play Console va dichiarato quali dati raccogli (email, nome, ecc.). Allinea alla tua privacy policy.

---

## 7. Invio in revisione

- Crea una **release** (es. Production o Internal testing per provare prima).
- Allega l’AAB caricato con EAS Submit (o caricalo manualmente dalla sezione Release).
- Compila tutte le sezioni obbligatorie (store listing, policy, questionari contenuti).
- **Invia in revisione**.

Google di solito revisiona in 1–7 giorni (spesso 24–48 ore). All’approvazione l’app sarà disponibile (o in “Internal testing” se hai scelto quella traccia).

---

## Riepilogo veloce

| Step | Cosa fare |
|------|-----------|
| 1 | Account Play Developer ($25) su play.google.com/console |
| 2 | Crea app “OXY Real”, tipo App, gratuita |
| 3 | `npx eas build --platform android --profile production` |
| 4 | `npx eas submit --platform android --latest --profile production` |
| 5 | Compila scheda store (icone, screenshot, descrizioni) |
| 6 | Privacy policy URL + dichiarazioni dati/contenuti |
| 7 | Crea release, allega AAB, invia in revisione |

---

## Note

- **Package name**: in `app.json` è `com.oxyreal.app`. Per Google Play va bene; se in futuro vorrai cambiarlo dovrai creare una nuova app in Play Console (il package identifica l’app).
- **Firebase / Google Sign-In**: assicurati che in Firebase Console siano aggiunti SHA-1 (e SHA-256) del keystore di **produzione** EAS (lo trovi in EAS → progetto → Credentials → Android). Vedi `GO_LIVE.md` per SHA e riferimenti.
- Dopo la pubblicazione, nella pagina “Dopo l’acquisto” del sito potrai mettere il link diretto al Play Store oltre (o al posto) del download APK, così gli utenti non vedono avvisi “app non sicura”.
