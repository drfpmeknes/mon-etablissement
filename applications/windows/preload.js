// Pont minimal attendu par index.html (window.electronApp)
const { contextBridge, ipcRenderer } = require('electron');

// La page demande-t-elle le format paysage (@page { size: A4 landscape }) ?
function pagePaysage() {
  const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
  return /@page[^{]*\{[^}]*landscape/i.test(css);
}

contextBridge.exposeInMainWorld('electronApp', {
  isElectron: true,
  logout: () => ipcRenderer.send('edumanager:deconnexion'),
  imprimer: () => ipcRenderer.send('edumanager:imprimer', { paysage: pagePaysage() })
});
