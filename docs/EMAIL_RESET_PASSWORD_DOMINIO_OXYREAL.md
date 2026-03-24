# Email reset password (e Auth) da dominio oxyreal.it

**Obiettivo:** le email di Firebase Auth (reset password, verifica email, ecc.) devono apparire dal dominio **oxyreal.it** (es. `noreply@oxyreal.it` o `doc@oxyreal.it`), non da `noreply@oxy-real.firebaseapp.com`, così il cliente non vede il dominio Firebase.

---

## 1. Creare l’indirizzo email sul dominio (consigliato)

- Con il provider che gestisce **oxyreal.it** (es. Aruba, Register, Google Workspace, ecc.) crea un indirizzo da usare per le comunicazioni automatiche, ad esempio:
  - **noreply@oxyreal.it** — per reset password e email di sistema (nessuna risposta attesa)
  - oppure **doc@oxyreal.it** — se preferisci un indirizzo “documentazione/supporto”

Non è obbligatorio avere SMTP attivo su quell’indirizzo per il **mittente personalizzato** in Firebase (vedi sotto): Firebase può inviare “da” quel dominio dopo la verifica. Avere l’email creata sul dominio aiuta comunque per eventuali reply e per coerenza.

---

## 2. Personalizzare il dominio mittente in Firebase

Firebase permette di usare un **dominio personalizzato** come mittente dopo averne verificato la proprietà.

1. Apri **[Firebase Console](https://console.firebase.google.com/)** → progetto **oxy-real**.
2. **Authentication** → scheda **Templates** (Modelli).
3. Cerca l’opzione **“Customize sender domain”** / **“Personalizza dominio mittente”** (o simile).
4. Inserisci il dominio: **oxyreal.it**.
5. Firebase mostrerà una **verifica di proprietà** (di solito un record **TXT** da aggiungere al DNS di oxyreal.it).  
   - Vai dal provider del dominio (dove gestisci i DNS per oxyreal.it).  
   - Aggiungi il record TXT con il valore indicato da Firebase.  
   - Attendi la propagazione (minuti/ore), poi in Firebase clicca **Verifica**.
6. Dopo la verifica, in **Authentication → Templates** modifica i modelli che ti interessano (es. **Password reset**):
   - **Sender name:** es. `OXY Real` o `OXY Real - Nessuna risposta`.
   - **Sender email:** `noreply@oxyreal.it` (o `doc@oxyreal.it`).
   - **Reply-to** (se disponibile): stesso indirizzo o un altro @oxyreal.it (es. `support@oxyreal.it`).

Salva. Le prossime email di reset password (e gli altri tipi che modifichi) useranno il mittente @oxyreal.it.

Riferimento: [Personalizzare email e SMS – Firebase Help](https://support.google.com/firebase/answer/7000714) (sezione “Customize the sender domain”).

---

## 3. (Opzionale) Link di reset su oxyreal.it

Di default il link nel messaggio di reset porta a una pagina Firebase. Se vuoi che il link sia del tipo `https://oxyreal.it/...` (per branding e fiducia):

1. Crea una pagina sul sito **oxyreal.it** che gestisca i parametri di Firebase (`mode`, `oobCode`, `continueUrl`, `lang`), come descritto in:  
   [Create custom email action handlers \| Firebase](https://firebase.google.com/docs/auth/custom-email-handler).
2. In Firebase Console → **Authentication → Templates** usa **“Customize action URL”** e imposta l’URL di quella pagina (es. `https://oxyreal.it/reset-password` o `https://oxyreal.it/__/auth/action`).

Così il cliente clicca su un link oxyreal.it e, se vuoi, può essere reindirizzato alla app dopo il reset.

---

## 4. Riepilogo

| Cosa | Dove |
|------|------|
| Creare indirizzo tipo noreply@oxyreal.it o doc@oxyreal.it | Provider del dominio oxyreal.it |
| Verificare dominio oxyreal.it | Firebase Console → Authentication → Customize sender domain → record TXT DNS |
| Impostare mittente (nome + email @oxyreal.it) | Firebase Console → Authentication → Templates → modifica modello (es. Password reset) |
| (Opzionale) Link reset su oxyreal.it | Pagina su oxyreal.it + “Customize action URL” in Firebase |

Dopo questi passi, le email di reset password (e le altre che configuri) arriveranno con mittente **@oxyreal.it** e il cliente non vedrà il dominio firebaseapp.com.
