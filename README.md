# OXY Real — App del Secolo

App React Native (Expo) con chat IA, auth Firebase, backend proxy per chiavi e cronologia.

## Configurazione

1. **Copia `.env.example` in `.env`** e compila le variabili (vedi sotto). **Non committare mai `.env`** (contiene segreti).

2. **Variabili principali:**
   - `EXPO_PUBLIC_BACKEND_URL` — URL del backend (es. `http://TUO_IP:3030`). Obbligatorio per cronologia chat e per utente Master senza chiave in app.
   - `EXPO_PUBLIC_FIREBASE_*` — Config Firebase (Auth). Da Firebase Console.
   - `EXPO_PUBLIC_MASTER_EMAIL` — (Opzionale) Email Master che usa le chiavi del backend.

3. **Backend:** avvia il server in `backend/` (vedi `backend/README.md`). Senza backend, l’app può usare una chiave OpenAI in app (Oxy Key) ma la cronologia non viene salvata.

## Avvio

```bash
npm install
# Opzionale: banner "Sei offline" quando non c'è rete (audit 6.3)
npm install @react-native-community/netinfo
npx expo start
```

Per build Android/iOS: `npx expo run:android` / `npx expo run:ios`. Per EAS Build, invio agli store e passi go-live vedi **GO_LIVE.md** (unico riferimento).

## Login social (Google e Apple) — audit 3.1

- **Google:** Installa `@react-native-google-signin/google-signin`. In Firebase Console → Authentication → Sign-in method abilita **Google** e copia il **Web client ID** (OAuth 2.0) in `.env` come `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Per Android/iOS nativi serve un **development build** (non Expo Go) e, per Android, configurare `google-services.json` e SHA-1. Vedi [React Native Google Sign-In](https://react-native-google-signin.github.io/docs/setting-up/expo).
- **Apple:** Installa `expo-apple-authentication`. In Firebase abilita il provider **Apple** e configura Service ID / chiave privata come da [documentazione Firebase Apple](https://firebase.google.com/docs/auth/web/apple). Sign in with Apple è disponibile solo su **iOS** (su Android il pulsante mostrerà un messaggio).

Se i pacchetti non sono installati o non configurati, i pulsanti social mostrano un messaggio di errore chiaro; l’accesso con email/password resta sempre disponibile.

## Firestore (profilo utente)

Per salvare backup email, telefono e data di nascita tra sessioni (audit 1.2): in Firebase Console abilita Firestore e crea la collezione `users`. Regole: lettura/scrittura solo su `users/{uid}` per utente autenticato. Se Firestore non è configurato, l’app funziona uguale.

## Contenuti legali (prima della release)

Le pagine **Privacy policy**, **Termini di servizio** e **Abbonamento e pagamenti** (menu hamburger → Impostazioni) mostrano testi placeholder. Prima di pubblicare: sostituire i contenuti in `src/content/legalContent.js` con i testi definitivi; in `docs/` trovi `PRIVACY_POLICY.md` e `TERMINI_SERVIZIO.md` come riferimento.

## Sicurezza

- Le chiavi API (OpenAI, Tavily) non vanno nell’app in produzione: usa il backend e `EXPO_PUBLIC_BACKEND_URL`.
- Il file `.env` è in `.gitignore`; usare `.env.example` come template senza valori reali.

## Build produzione (EAS) — prima di andare sugli store

- **Non** aggiungere ai segreti EAS (né in .env di build): `EXPO_PUBLIC_OXY_AI_KEY`, `EXPO_PUBLIC_TAVILY_API_KEY`. In modalità subscription la chiave sta solo sul backend.
- **Imposta** nei segreti EAS: `EXPO_PUBLIC_BACKEND_URL` (URL pubblico del backend), tutte le `EXPO_PUBLIC_FIREBASE_*`, e se serve `EXPO_PUBLIC_MASTER_EMAIL` (solo per sviluppo; in produzione userai verifica abbonamento).
- Riferimento completo: **GO_LIVE.md**.

## Supabase

La dipendenza `@supabase/supabase-js` è presente; le migrazioni in `supabase/migrations/` sono per uso futuro (es. messaggi/profilo). L’app attuale usa il backend per la cronologia chat.
