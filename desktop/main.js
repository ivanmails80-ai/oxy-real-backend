const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// URL esatto: ?platform=web fa servire l'app (AuthScreen/MainScreen) invece della pagina di servizio Expo
const DEV_URL = 'http://localhost:8081/?platform=web';
const WINDOW_TITLE = 'OXY Real - Anima';

const FALLBACK_HTML = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>OXY Real</title></head>
  <body style="margin:0;background:#0a0a0a;color:#d1d1d1;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box;">
    <div style="text-align:center;max-width:360px;">
      <h1 style="color:#c5a059;font-size:1.5rem;">OXY Real - Anima</h1>
      <p style="margin-top:16px;">L'app non è in esecuzione. Avvia dalla cartella principale:</p>
      <pre style="background:#1a1a1a;padding:12px;border-radius:8px;overflow:auto;text-align:left;font-size:14px;">npm run web</pre>
      <p style="margin-top:16px;font-size:14px;">Si aprirà il browser. Poi puoi riavviare questa finestra.</p>
      <p style="margin-top:12px;font-size:13px;"><a href="${DEV_URL}" style="color:#c5a059;">Apri nel browser</a></p>
    </div>
  </body>
</html>`;

let mainWindow;
let loadFailed = false;

function showFallback() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  loadFailed = true;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(FALLBACK_HTML)}`).catch(() => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    title: WINDOW_TITLE,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#0a0a0a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Apri anche il browser su localhost:8081 (più comodo per l'utente)
  mainWindow.webContents.once('did-start-loading', () => {
    shell.openExternal(DEV_URL).catch(() => {});
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!loadFailed) mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] did-fail-load:', errorCode, errorDescription, validatedURL);
    showFallback();
  });

  mainWindow.loadURL(DEV_URL, { timeout: 10000 }).then(() => {}).catch(() => {
    console.error('[Electron] loadURL fallito per', DEV_URL);
    showFallback();
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!mainWindow) createWindow(); });
