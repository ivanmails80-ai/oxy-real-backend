# OXY Real - Versione desktop (Anima)

Finestra desktop per lavorare con Anima sullo stesso backend e account del telefono.

## Come usarla

### 1. Avvia l'app web (dalla cartella principale del progetto)

```bash
cd ..
npx expo start --web
```

Lascia questa finestra aperta (l'app gira su http://localhost:8081). L'app desktop carica `http://localhost:8081/?platform=web` così il server Expo serve direttamente l'app (AuthScreen/MainScreen) invece della pagina di configurazione.

### 2. Avvia l'app desktop

In un **secondo terminale**:

```bash
cd desktop
npm install
npm start
```

Si aprirà una finestra "OXY Real - Anima" con la stessa interfaccia: login, chat, Memory Vault, ecc. Usa lo **stesso backend** (`.env` con `EXPO_PUBLIC_BACKEND_URL`) e lo **stesso account** (Firebase).

### Solo browser (più comodo)

Dalla cartella principale: `npm run web`. Si apre il browser.

### Se la finestra è nera o dice "Avvia prima l'app web"

- Avvia prima dalla cartella principale: `npm run web`, poi riavvia `npm run desktop`.
- Se Expo usa un’altra porta (es. 19006), modifica `DEV_URL` in `desktop/main.js` con quella porta.

## Requisiti

- **Node.js** installato
- Backend OXY avviato (come per il telefono) se vuoi usare la chat con il server
- Stesso `.env` nella root del progetto (Expo legge da lì quando servi il web)

## Build installabile (opzionale)

Per creare un `.exe` (Windows) o un’app installabile su Mac/Linux puoi usare `electron-builder`. Da `desktop/`:

```bash
npm install --save-dev electron-builder
```

Poi in `package.json` aggiungi una sezione `"build"` e lo script `"dist": "electron-builder"`. Prima esporta il web dalla root: `npx expo export --platform web` e fai puntare Electron alla cartella `dist` prodotta (modificando `main.js` per caricare `file://...` invece di localhost).
