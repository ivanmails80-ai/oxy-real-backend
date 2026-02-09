# Configurazione Email SMTP per OXY Real - PARAMETRI DEFINITIVI

## ⚠️ CONFIGURAZIONE OBBLIGATORIA - PARAMETRI UFFICIALI

### 1. CONFIGURAZIONE SMTP (Invio Tecnico)

**Parametri SMTP Ufficiali OXY Real:**

1. Accedi a https://supabase.com/dashboard
2. Seleziona il progetto: `vplvkhbjngbeuileszcg`
3. Vai su **Authentication** → **Providers** → **Email**
4. Nella sezione **SMTP Settings**, configura esattamente così:

```
SMTP Enabled: ✅ ON

SMTP Host: mail.oxyreal.it

SMTP Port: 465

Secure Connection: SSL/TLS (Consigliato)

SMTP User: otp@oxyreal.it

SMTP Password: Bella.Vita.Style2359

Sender Address: otp@oxyreal.it

Sender Name: OXY Real OTP
```

5. **Salva** le impostazioni

**IMPORTANTE**: 
- Questo account (`otp@oxyreal.it`) è dedicato esclusivamente all'invio dei codici OTP
- Non usare questo account per altre comunicazioni
- La password è sensibile - non condividerla pubblicamente

---

### 2. FLUSSO OTP (Codice, NON Link)

**Configurazione su Supabase:**

1. Vai su **Authentication** → **Settings**
2. Nella sezione **Email Auth**, assicurati che:
   - ✅ **"Enable email signup"** sia **ATTIVO**
   - ✅ **"Enable email login"** sia **ATTIVO**
   - ⚠️ **"Enable email confirmations"** sia **DISABILITATO** (o configurato per non richiedere conferma)

3. Vai su **Authentication** → **URL Configuration**
   - **Site URL**: La tua URL di produzione (es. `https://oxyreal.app`)
   - **Redirect URLs**: Aggiungi solo URL di produzione (NON includere link di conferma)

4. **DISABILITA l'invio del link di conferma:**
   - Vai su **Authentication** → **Email Templates**
   - Trova il template **"Confirm signup"** o **"Magic Link"**
   - **DISABILITALO** o configura per non essere inviato automaticamente
   - L'unico template attivo deve essere quello per **OTP a 6 cifre**

**Il codice dell'app è già configurato correttamente:**
- Usa `signInWithOtp()` che invia solo codice OTP (non link)
- Usa `verifyOtp()` con `type: 'email'` per verificare il codice
- Il cliente resta nell'app e inserisce il codice ricevuto
- Dopo registrazione, OTP viene inviato automaticamente

---

### 3. TEMPLATE MAIL (Identità e Assistenza)

**Configurazione su Supabase:**

1. Vai su **Authentication** → **Email Templates**
2. Seleziona il template **"Magic Link"** o crea/modifica il template **"OTP"**
3. Configura con questi valori esatti:

**Oggetto Email:**
```
[SICUREZZA] Il tuo codice di accesso esclusivo OXY Real
```

**Corpo Email (HTML o Text):**
```
Benvenuto in OXY Real.

Per completare l'accesso alla piattaforma e verificare la tua identità, inserisci il seguente codice di sicurezza a 6 cifre nell'app:

{{ .Token }}

Questo codice è strettamente personale e scadrà tra pochi minuti.

AVVISO DI SICUREZZA: Se non hai richiesto tu questo codice, il tuo account potrebbe essere a rischio. Contatta immediatamente il nostro dipartimento di sicurezza all'indirizzo sicurezza@oxyreal.it per bloccare ogni accesso non autorizzato.
```

**Variabili disponibili nel template:**
- `{{ .Token }}` - Il codice OTP a 6 cifre
- `{{ .Email }}` - L'indirizzo email dell'utente
- `{{ .SiteURL }}` - URL del sito

**IMPORTANTE**: 
- Il template deve contenere **SOLO** il codice OTP (`{{ .Token }}`)
- **NON** includere link di conferma o redirect
- Il cliente deve inserire il codice manualmente nell'app
- Il contatto sicurezza è: **sicurezza@oxyreal.it** (come da accordi)

---

### 4. VERIFICA FINALE

Dopo aver configurato tutto:

1. **Test Email:**
   - Vai su **Authentication** → **Users**
   - Crea un utente di test o usa quello esistente
   - Usa la funzione `requestLoginOtp` dall'app
   - Controlla la casella email dell'utente
   - Verifica che l'email arrivi da `otp@oxyreal.it` con nome "OXY Real OTP"
   - Verifica che arrivi solo il codice OTP, NON link

2. **Test Flusso Completo:**
   - Registra un nuovo utente dall'app
   - Controlla che arrivi email da `otp@oxyreal.it` con nome "OXY Real OTP"
   - Verifica che il template sia quello configurato sopra
   - Verifica che il contatto sicurezza sia `sicurezza@oxyreal.it`
   - Inserisci il codice nell'app
   - Verifica che il login funzioni

3. **Controlla i Log:**
   - Vai su **Authentication** → **Logs**
   - Verifica che non ci siano errori di invio email
   - Controlla che il tipo di email inviata sia "OTP" e non "Magic Link"
   - Verifica che il mittente sia `otp@oxyreal.it`

---

### ⚡ TROUBLESHOOTING

**Se le email non arrivano:**
1. Controlla la cartella SPAM
2. Verifica i log in **Authentication** → **Logs**
3. Assicurati che il dominio `oxyreal.it` sia verificato (SPF/DKIM/DMARC)
4. Verifica che le credenziali SMTP siano corrette:
   - Host: `mail.oxyreal.it`
   - Port: `465`
   - User: `otp@oxyreal.it`
   - Password: `Bella.Vita.Style2359`
   - Secure: SSL/TLS
5. Testa la connessione SMTP manualmente se possibile

**Se arrivano link invece di codici:**
1. Verifica che il template "Confirm signup" sia disabilitato
2. Controlla che `signInWithOtp()` sia usato (già configurato nel codice)
3. Assicurati che "Enable email confirmations" sia disabilitato

**Se il mittente non è corretto:**
1. Verifica che SMTP personalizzato sia configurato con `otp@oxyreal.it`
2. Controlla che "Sender Address" sia `otp@oxyreal.it`
3. Verifica che "Sender Name" sia `OXY Real OTP`

**Se il template non mostra sicurezza@oxyreal.it:**
1. Verifica che il template email contenga esattamente: `sicurezza@oxyreal.it`
2. Controlla che non ci siano variabili o placeholder al posto dell'indirizzo
3. Testa l'invio per verificare che l'indirizzo sia visibile nell'email ricevuta

---

**NOTA FINALE**: 
- Dopo aver configurato SMTP e template, l'app funzionerà automaticamente
- Non serve riavviare o modificare il codice
- Il codice è già configurato per usare solo OTP (non link)
- Dopo registrazione, OTP viene inviato automaticamente da `otp@oxyreal.it`

---

## 📧 Riepilogo Parametri SMTP

```
Host: mail.oxyreal.it
Port: 465
Secure: SSL/TLS
User: otp@oxyreal.it
Password: Bella.Vita.Style2359
Sender: otp@oxyreal.it
Sender Name: OXY Real OTP
Contatto Sicurezza: sicurezza@oxyreal.it
```
