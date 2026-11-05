// Pont minimal attendu par index.html (window.electronApp)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronApp', {
  isElectron: true,
  logout: () => ipcRenderer.send('edumanager:deconnexion')
});
