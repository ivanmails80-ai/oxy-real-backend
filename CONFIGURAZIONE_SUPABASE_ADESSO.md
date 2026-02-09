# ⚡ CONFIGURAZIONE SUPABASE - FAI SUBITO

## ⚠️ IMPORTANTE: Devo configurare manualmente perché non posso accedere al tuo dashboard

### PASSO 1: Configura SMTP (2 minuti)

1. **Apri**: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/auth/providers
2. **Clicca** su "Email"
3. **Scorri** fino a "SMTP Settings"
4. **Disattiva** "Use Supabase SMTP"
5. **Inserisci** questi valori ESATTI:

```
SMTP Enabled: ✅ ON
SMTP Host: mail.oxyreal.it
SMTP Port: 465
Secure Connection: SSL/TLS
SMTP User: otp@oxyreal.it
SMTP Password: Bella.Vita.Style2359
Sender Address: otp@oxyreal.it
Sender Name: OXY Real OTP
```

6. **CLICCA "SAVE"**

---

### PASSO 2: Configura Template Email (1 minuto)

1. **Apri**: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/auth/templates
2. **Clicca** sul template "Magic Link" (o crea nuovo template "OTP")
3. **Copia e incolla** questo ESATTO testo:

**Oggetto:**
```
[SICUREZZA] Il tuo codice di accesso esclusivo OXY Real
```

**Corpo (HTML o Text):**
```
Benvenuto in OXY Real.

Per completare l'accesso alla piattaforma e verificare la tua identità, inserisci il seguente codice di sicurezza a 6 cifre nell'app:

{{ .Token }}

Questo codice è strettamente personale e scadrà tra pochi minuti.

AVVISO DI SICUREZZA: Se non hai richiesto tu questo codice, il tuo account potrebbe essere a rischio. Contatta immediatamente il nostro dipartimento di sicurezza all'indirizzo sicurezza@oxyreal.it per bloccare ogni accesso non autorizzato.
```

4. **CLICCA "SAVE"**

---

### PASSO 3: Disabilita Conferma Email (30 secondi)

1. **Apri**: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/auth/settings
2. **Cerca** "Enable email confirmations"
3. **DISABILITALO** (toggle OFF)
4. **CLICCA "SAVE"**

---

## ✅ FATTO? 

Una volta salvato tutto, l'app funzionerà automaticamente. Il tunnel Expo è in avvio - controlla il terminale per il QR code.
