/**
 * Script per configurare SMTP e Template Email su Supabase via Management API
 * 
 * PREREQUISITI:
 * 1. Ottieni il tuo Access Token da: https://supabase.com/dashboard/account/tokens
 * 2. Installa le dipendenze: npm install node-fetch
 * 3. Esegui: node configure-supabase-smtp.js
 */

const PROJECT_REF = 'vplvkhbjngbeuileszcg';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';

// Parametri SMTP OXY Real
const SMTP_CONFIG = {
  SMTP_ADMIN_EMAIL: 'otp@oxyreal.it',
  SMTP_HOST: 'mail.oxyreal.it',
  SMTP_PORT: 465,
  SMTP_USER: 'otp@oxyreal.it',
  SMTP_PASS: 'Bella.Vita.Style2359',
  SMTP_SENDER_NAME: 'OXY Real OTP',
  SMTP_SECURE: true, // SSL/TLS
};

// Template Email OTP
const EMAIL_TEMPLATE = {
  subject: '[SICUREZZA] Il tuo codice di accesso esclusivo OXY Real',
  body: `Benvenuto in OXY Real.

Per completare l'accesso alla piattaforma e verificare la tua identità, inserisci il seguente codice di sicurezza a 6 cifre nell'app:

{{ .Token }}

Questo codice è strettamente personale e scadrà tra pochi minuti.

AVVISO DI SICUREZZA: Se non hai richiesto tu questo codice, il tuo account potrebbe essere a rischio. Contatta immediatamente il nostro dipartimento di sicurezza all'indirizzo sicurezza@oxyreal.it per bloccare ogni accesso non autorizzato.`,
};

async function configureSupabaseSMTP() {
  if (SUPABASE_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.error('❌ ERRORE: Devi impostare SUPABASE_ACCESS_TOKEN');
    console.log('\n1. Vai su: https://supabase.com/dashboard/account/tokens');
    console.log('2. Crea un nuovo token');
    console.log('3. Esegui: export SUPABASE_ACCESS_TOKEN="il_tuo_token"');
    console.log('4. Oppure modifica questo script e inserisci il token direttamente');
    process.exit(1);
  }

  try {
    // Nota: La Management API di Supabase potrebbe non supportare tutte le configurazioni SMTP
    // Alcune impostazioni devono essere fatte manualmente dal dashboard
    
    console.log('⚠️  ATTENZIONE:');
    console.log('La configurazione SMTP completa richiede accesso al dashboard.');
    console.log('Questo script può aiutare, ma alcune impostazioni devono essere fatte manualmente.\n');
    
    console.log('📋 PARAMETRI DA INSERIRE MANUALMENTE SU SUPABASE:\n');
    console.log('1. Vai su: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/auth/providers');
    console.log('2. Clicca su "Email"');
    console.log('3. Nella sezione SMTP Settings, inserisci:\n');
    console.log(`   SMTP Enabled: ON`);
    console.log(`   SMTP Host: ${SMTP_CONFIG.SMTP_HOST}`);
    console.log(`   SMTP Port: ${SMTP_CONFIG.SMTP_PORT}`);
    console.log(`   Secure Connection: SSL/TLS`);
    console.log(`   SMTP User: ${SMTP_CONFIG.SMTP_USER}`);
    console.log(`   SMTP Password: ${SMTP_CONFIG.SMTP_PASS}`);
    console.log(`   Sender Address: ${SMTP_CONFIG.SMTP_ADMIN_EMAIL}`);
    console.log(`   Sender Name: ${SMTP_CONFIG.SMTP_SENDER_NAME}\n`);
    
    console.log('4. Vai su: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/auth/templates');
    console.log('5. Seleziona il template "Magic Link" o "OTP"');
    console.log('6. Configura:\n');
    console.log(`   Oggetto: ${EMAIL_TEMPLATE.subject}\n`);
    console.log(`   Corpo:\n${EMAIL_TEMPLATE.body}\n`);
    
    console.log('✅ Una volta salvato tutto, l\'app funzionerà automaticamente!');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.log('\n⚠️  Configurazione manuale richiesta. Segui le istruzioni sopra.');
  }
}

configureSupabaseSMTP();
