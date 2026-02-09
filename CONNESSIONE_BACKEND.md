# Connessione app ↔ backend (errore "Impossibile raggiungere il server")

Quando l’app mostra **"Impossibile raggiungere il server"**, le chiamate dal telefono al backend non arrivano. Segui questi passi.

## 1. Il cavo USB non basta

- Il **cavo USB** serve per far girare l’app su Expo e per il debug.
- Le **chiamate all’AI/backend** le fa il **telefono in rete** (Wi‑Fi o dati).
- Quindi: **telefono e PC devono essere sulla stessa rete Wi‑Fi**. Collega il telefono allo stesso Wi‑Fi del PC (non solo USB).

## 2. Verifica l’IP del PC

L’IP può cambiare (DHCP). Controlla l’IP **attuale** del PC:

- **Windows**: apri CMD e scrivi `ipconfig`. Cerca “Indirizzo IPv4” della scheda Wi‑Fi (es. `192.168.1.5` o `10.24.65.179`).
- **Mac/Linux**: `ifconfig` o `ip addr`.

Nel file **`.env`** alla root del progetto deve esserci:

```env
EXPO_PUBLIC_BACKEND_URL=http://TUO_IP_PC:3030
```

Esempio: se l’IP è `192.168.1.5`:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.5:3030
```

Dopo aver cambiato `.env`, **riavvia Expo** (ferma e rilancia `npx expo start`).

## 3. Backend avviato

Nella cartella `backend/`:

```bash
cd backend
npm start
```

Deve comparire qualcosa come: `OXY Real backend proxy on port 3030` e “In rete: http://...”.

## 4. Firewall

- **Windows**: Verifica che la porta **3030** sia consentita per Node/il processo del backend (rete privata).
- **Mac**: Preferenze di sistema → Sicurezza e privacy → Firewall → Opzioni, e assicurati che Node/terminale possa accettare connessioni in entrata.

## 5. (Opzionale) Solo USB, senza Wi‑Fi (Android)

Se vuoi usare **solo il cavo USB** (telefono senza Wi‑Fi sulla stessa rete), su Android puoi usare il port forwarding:

1. Collega il telefono via USB con debug USB attivo.
2. Sul PC esegui:
   ```bash
   adb reverse tcp:3030 tcp:3030
   ```
3. Nel `.env` imposta:
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:3030
   ```
4. Riavvia l’app sul telefono.

In questo modo le chiamate dal telefono a `127.0.0.1:3030` vengono inviate al PC sulla porta 3030.

---

**Riepilogo**: di solito il problema è che **telefono e PC non sono sulla stessa Wi‑Fi** o che **l’IP in `.env` non è più quello attuale del PC**. Controlla questi due punti per primi.
