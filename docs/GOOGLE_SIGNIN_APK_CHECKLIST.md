# Checklist Google Sign-In — APK e Expo Go

---

## Expo Go — Errore 400 redirect_uri mismatch (flowName=generalOauthFlow)

Se in **Expo Go** con “Continua con Google” vedi **400 redirect_uri mismatch**:

1. Vai su [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Apri il client OAuth 2.0 di tipo **Web application** (quello il cui Client ID è in `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`).
3. In **Authorized redirect URIs** aggiungi **esattamente** (sostituisci `TUO_USERNAME` con il tuo account Expo, es. quello con cui fai `expo login`):
   ```
   https://auth.expo.io/@TUO_USERNAME/secondself
   ```
4. **Salva**. Riavvia l’app in Expo Go e riprova.

Lo slug dell’app è `secondself` (da `app.json`); il redirect deve usare quello.

---

## APK — Firebase: identity provider configuration not found

Se vedi **Firebase: the identity provider configuration is not found (auth/operation-not-allowed)** significa che **Google non è abilitato** come metodo di accesso nel progetto Firebase.

---

## 1. Firebase Console (obbligatorio)

1. Vai su [Firebase Console](https://console.firebase.google.com/) → seleziona il progetto **OXY Real** (oxy-real).
2. **Authentication** → **Sign-in method** (Metodo di accesso).
3. Clicca su **Google**.
4. **Abilita** (Enable) e, se richiesto, imposta **Email del supporto** (puoi usare il tuo).
5. **Salva**.

Senza questo passaggio Firebase rifiuta il login con l’errore `auth/operation-not-allowed`.

---

## 2. Google Cloud Console (client Android e redirect)

- **Credenziali** → Client OAuth tipo **Android**:
  - Nome pacchetto: `com.oxyreal.app`
  - SHA-1: vedi `docs/HANDOFF_AGENTE_GOOGLE_APK.md`
- **Impostazioni avanzate** → **Abilita schema URI personalizzato** (custom URI: `com.oxyreal.app:/oauthredirect`).

### Redirect URI per tornare nell’app (evitare che si apra google.com)

Se dopo “Continua con Google” il browser resta su Google invece di tornare nell’app:

1. Apri il client OAuth 2.0 di tipo **Web application** (quello usato nel flusso OAuth).
2. In **Authorized redirect URIs** aggiungi lo **scheme dell’app** (da `app.json` → `scheme`):
   ```
   oxyreal://oauthredirect
   ```
3. **Salva**. Ricompila l’APK se necessario e riprova.

---

## 3. Progetto (env e build)

- **.env**: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<Client ID Android>`
- **Build**: prima di `assembleRelease` esegui `node scripts/preflight-google-release.js`.
- **Android**: in `AndroidManifest.xml` deve esserci l’intent-filter per `com.oxyreal.app` con path `/oauthredirect` (già presente se hai seguito la guida).

---

## Verifica pre-release

Prima di ogni nuova release APK con login Google:

```bash
node scripts/preflight-google-release.js
```

Poi controlla manualmente: **Firebase Console → Authentication → Sign-in method → Google = Abilitato**.
