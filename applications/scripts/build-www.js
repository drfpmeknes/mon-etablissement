// Prépare le dossier applications/www à partir de l'index.html du site :
// copie l'application, puis y ajoute le thème « Cabinet » et les adaptations
// Windows / Android. Le site web (index.html à la racine) n'est pas modifié.
const fs = require('fs');
const path = require('path');

const racine = path.resolve(__dirname, '..', '..');
const apps = path.resolve(__dirname, '..');
const www = path.join(apps, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

// Fichiers du site à embarquer (images utilisées par l'application)
for (const f of fs.readdirSync(racine)) {
  if (/\.(png|jpe?g|svg|webp|ico)$/i.test(f) || f === 'manifest.json') {
    fs.copyFileSync(path.join(racine, f), path.join(www, f));
  }
}
for (const f of ['theme-cabinet.css', 'app-runtime.js']) {
  fs.copyFileSync(path.join(apps, 'theme', f), path.join(www, f));
}

let html = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');

// Bibliothèques embarquées dans l'application (au lieu des CDN) : l'appli
// démarre et fonctionne en mode hors-ligne même sans Internet.
const libs = {
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js': '@supabase/supabase-js/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js': '@emailjs/browser/dist/email.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js': 'xlsx/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js': 'jszip/dist/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'html2canvas/dist/html2canvas.min.js'
};
fs.mkdirSync(path.join(www, 'libs'), { recursive: true });
for (const [url, rel] of Object.entries(libs)) {
  const src = path.join(apps, 'node_modules', rel);
  if (!html.includes(url)) continue;
  if (!fs.existsSync(src)) { console.warn('⚠ ' + rel + ' absent : CDN conservé'); continue; }
  const local = 'libs/' + path.basename(rel);
  fs.copyFileSync(src, path.join(www, local));
  html = html.split(url).join(local);
}

const tete = '<head>';
if (!html.includes(tete)) throw new Error('Balise <head> introuvable dans index.html');
html = html.replace(tete, tete + '\n<script src="app-runtime.js"></script>');

// Le thème est chargé en dernier dans <head> pour primer sur les styles d'origine.
const finTete = html.indexOf('</head>');
if (finTete < 0) throw new Error('Balise </head> introuvable dans index.html');
html = html.slice(0, finTete) +
  '<link rel="stylesheet" href="theme-cabinet.css">\n' +
  html.slice(finTete);

html = html.replace('<html lang="fr">', '<html lang="fr" class="app-cabinet">');

fs.writeFileSync(path.join(www, 'index.html'), html);
console.log('applications/www prêt (' + Math.round(html.length / 1024) + ' Ko)');
