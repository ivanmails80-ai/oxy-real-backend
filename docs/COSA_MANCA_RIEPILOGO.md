# Cosa manca — Riepilogo (secondo analisi codice e checklist)

*Aggiornato: marzo 2025. Basato su COSA_MANCA_PER_IL_LANCIO, CHECKLIST_IMPLEMENTAZIONE_FREE, GO_LIVE, analisi codice.*

---

## 1. Obbligatori per store e lancio

| Cosa | Stato | Azione |
|------|--------|--------|
| **Privacy policy e Termini** | Placeholder o bozze in `legalContent.js` | Sostituire con testi definitivi (eventuale revisione legale). Allineare `docs/PRIVACY_POLICY.md` e `docs/TERMINI_SERVIZIO.md`. |
| **Config produzione in `pricingConfig.js`** | Valori **test**: `suggestedPrice: 0.1`, `DAILY_LIMITS: 5, 10, 15` | Per produzione: `DAILY_LIMITS` 50, 150, 400 e prezzi 19, 39, 59 € (e Lifetime 90, 190, 390). Oppure tenere i limiti da **env** nel backend e solo i prezzi in app da Stripe. |
| **Stripe LIVE** | Se vendi abbonamento | Secret Key LIVE in `backend/.env`, Price ID LIVE, webhook LIVE su `/api/billing/webhook`. Sconto lancio 50% (coupon o prezzi) se vuoi che checkout rispecchi l’app. |
| **Variabili EAS (production)** | Parziali in `eas.json` | Impostare in EAS Dashboard: `EXPO_PUBLIC_BACKEND_URL`, Firebase (API key, auth domain, project id, ecc.), eventuale `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` per Google Sign-In. |
| **Build e test su dispositivo** | Da fare | `npx eas build --platform android --profile production`. Installare APK e seguire **CHECKLIST_TEST_APP.md** (login, chat, free→upgrade, limiti, menu, Memory Vault, ecc.). |
| **Submit store** | Da fare | Versioni in `app.json` (version, versionCode). `npx eas submit --platform android --latest`. Consigliato: prima closed testing, poi produzione. |

---

## 2. Consigliati prima del go-live

| Cosa | Stato | Azione |
|------|--------|--------|
| **Store listing (Play Store)** | Da ottimizzare | Titolo/sottotitolo e descrizione che “urlano”: memoria, diario, compagno, Lifetime, prezzo lancio. Vedi `docs/ANALISI_COMPETITIVA_OXY_VS_COLOSSI.md` sezione 8. |
| **Revisione legale** | Opzionale | Policy su dati, retention, memoria, cancellazione account, scadenza abbonamento. |
| **Supporto visibile** | Menu | Voce “Aiuto e supporto” con FAQ + “Scrivici” (email o link). Aumenta fiducia. |
| **Verifica BILLING_TRIAL_ENABLED** | In checklist free | Se trial è disattivato, utenti senza billing vedono correttamente “free”. Verificare che il flusso free e il ritorno da Stripe siano coerenti. |

---

## 3. Prima della vendita (codice indecifrabile)

| Cosa | Stato | Azione |
|------|--------|--------|
| **Oscuramento** | Da fare | Seguire `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md` e rule `.cursor/rules/obfuscazione-pre-vendita.mdc`. Bundle JS + ProGuard/R8; `android.enableMinifyInReleaseBuilds=true`; test build dopo. |

---

## 4. Già fatto (per riferimento)

- Backend: stato free, limite 5 msg/giorno, chiave server per free, modelli per tier (mini/4o/4-turbo).
- App: Prova gratis → Chat con voce default; feature visibili con lock (Vision, Storie, Community, Cloud); tap → Menu Abbonamento; banner 5/5 e blocco invio; contatore free in Menu; Oxy Key nascosta per free; scelta voce solo a pagamento.
- Copy “urlare”: onboarding OXY ricorda, banner Memory Vault sopra chat, messaggio benvenuto IA che cita memoria, toast Salva/Vedi, intro Memory Vault e Diario, tagline Lifetime e prezzo lancio in Abbonamento.
- Traduzioni: IT, EN, FR, ES, AR, ZH per le nuove stringhe (incluso FR sistemato).

---

## 5. Opzionali / dopo

- Cloud reale (Drive / iCloud / server): oggi “in arrivo”.
- Chat di gruppo: oggi “in arrivo”.
- Limitazione abuso free (es. max account per device/IP): non obbligatorio per il primo rilascio.
- Migliorie voce/TTS o “chiamata” tipo Replika: in roadmap.

---

**In sintesi:** per andare in store servono **legali definitivi**, **config produzione** (prezzi/limiti), **Stripe LIVE** se vendi, **EAS + build + test + submit**. Consigliati: **store listing** forte e **supporto** in menu. Prima della vendita: **obfuscazione**. Il resto (free, “urlare”, traduzioni) è già implementato.
