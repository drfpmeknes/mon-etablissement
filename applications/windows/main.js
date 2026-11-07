// EduManager Pro — application Windows (Electron)
const { app, BrowserWindow, protocol, net, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const WWW = path.join(__dirname, '..', 'www');
const ORIGINE = 'app://edumanager';

// Origine propre (app://edumanager) plutôt que file:// : stockage local stable,
// fenêtres d'impression et appels à la base de données fonctionnent normalement.
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

if (!app.requestSingleInstanceLock()) app.quit();

let fenetre = null;

function estExterne(url) {
  return /^(https?:|mailto:|tel:|whatsapp:)/i.test(url);
}

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'EduManager Pro',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#f3f7f7',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });
  fenetre.once('ready-to-show', () => { fenetre.maximize(); fenetre.show(); });

  const wc = fenetre.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:') || url === 'about:blank' || url === '' || url.startsWith(ORIGINE)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1100, height: 850, autoHideMenuBar: true,
          backgroundColor: '#ffffff', title: 'Impression — EduManager Pro',
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
          },
          icon: path.join(__dirname, '..', 'assets', 'icon.png')
        }
      };
    }
    if (estExterne(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (ev, url) => {
    if (!url.startsWith(ORIGINE)) { ev.preventDefault(); if (estExterne(url)) shell.openExternal(url); }
  });

  fenetre.loadURL(ORIGINE + '/index.html');
}

// Impression avec l'orientation demandée par la page (paysage / portrait)
ipcMain.on('edumanager:imprimer', (ev, opts) => {
  const paysage = !!(opts && opts.paysage);
  ev.sender.print({ silent: false, printBackground: true, landscape: paysage }, (ok, raison) => {
    if (!ok && raison && raison !== 'cancelled') console.error('Impression :', raison);
  });
});

ipcMain.on('edumanager:deconnexion', (ev) => {
  const w = BrowserWindow.fromWebContents(ev.sender);
  if (w) w.webContents.reloadIgnoringCache();
});

app.on('second-instance', () => {
  if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); }
});

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    let rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const fichier = path.normalize(path.join(WWW, rel));
    if (!fichier.startsWith(WWW)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(fichier).toString());
  });

  // Menu minimal (Alt pour l'afficher) : zoom, plein écran, rechargement.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Affichage', submenu: [
      { role: 'reload', label: 'Recharger' },
      { role: 'resetZoom', label: 'Taille normale' },
      { role: 'zoomIn', label: 'Agrandir' },
      { role: 'zoomOut', label: 'Réduire' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Plein écran' },
      { role: 'toggleDevTools', label: 'Outils de développement' }
    ] }
  ]));

  creerFenetre();
});

app.on('window-all-closed', () => app.quit());
