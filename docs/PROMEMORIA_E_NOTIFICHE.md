# Promemoria e notifiche — come funzionano e perché può non arrivare

## Due percorsi distinti

1. **Memory Vault (memoria)**  
   Quando chiedi a OXY "ricordami alle 19:00 di inviare un SMS a mia sorella", l’**IA (backend)** può chiamare il tool `save_memory` e salvare il promemoria in **Memory Vault** (obiettivi/fatti). Quello che vedi in "memory default" viene da qui: è solo **memoria**, non una notifica.

2. **Notifica sul telefono**  
   La **notifica** (avviso alle 19:00) viene schedulata **solo dall’app** quando il messaggio che invii viene riconosciuto come promemoria dal parser locale (es. "ricordami alle 19:00 di …"). In quel caso l’app:
   - programma una notifica locale (`expo-notifications`) per quell’ora,
   - e in più salva un key fact in Memory Vault (best-effort).

Se la frase non viene riconosciuta dal parser (formulazione diversa, messaggio vocale trascritto in modo diverso, ecc.), l’IA risponde e può salvare in memoria, ma **nessuna notifica** viene schedulata.

## Perché la notifica può non arrivare

- **Permessi**: su Android 13+ serve il permesso "Notifiche". L’app ora chiede il permesso **prima** di schedulare il promemoria; se l’utente rifiuta o lo aveva rifiutato in passato, la notifica non parte.
- **Expo Go**: in Expo Go le notifiche programmate in background non sono affidabili. Serve un **build installato** (APK/IPA) per avere notifiche all’ora giusta.
- **Formulazione**: il parser riconosce frasi tipo "ricordami alle 19:00 di …", "promemoria per le 19", "avvisami alle 19". Se la frase è molto diversa, può non essere riconosciuta e quindi non si schedulano notifiche (solo memoria, se l’IA chiama `save_memory`).
- **Battery / Doze**: su Android, risparmio energetico e Doze possono ritardare le notifiche; in genere non le bloccano del tutto.

## Cosa è stato sistemato (feb 2026)

- **Permessi**: prima di schedulare un promemoria l’app controlla e, se serve, chiede il permesso notifiche; senza permesso non si programma la notifica.
- **Trigger**: la notifica viene schedulata con trigger esplicito `{ type: 'date', date }` (più affidabile su Android che passare solo un `Date`).
- **Console**: i log di errore in `scheduleLocalReminder` e permessi sono mostrati solo in sviluppo (`__DEV__`).

## Cosa fare se non arriva la notifica

1. Controllare in **Impostazioni → App → OXY Real** che il permesso **Notifiche** sia attivo.
2. Usare un **build installato** (non Expo Go) per i promemoria.
3. Formulare in modo chiaro, ad esempio: "Ricordami alle 19:00 di inviare un SMS a mia sorella".
