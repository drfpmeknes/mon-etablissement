// Crée (si besoin) puis met à jour le projet Android Capacitor :
// icônes, écran de démarrage, code natif (impression / téléchargements).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apps = path.resolve(__dirname, '..');
const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { cwd: apps, stdio: 'inherit' }); };

if (!fs.existsSync(path.join(apps, 'android'))) run('npx cap add android');

const dest = path.join(apps, 'android', 'app', 'src', 'main', 'java', 'ma', 'drfp', 'edumanager');
fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(path.join(apps, 'android-natif', 'MainActivity.java'), path.join(dest, 'MainActivity.java'));

// Couleur de la barre d'état et de navigation (sarcelle du thème Cabinet)
const styles = path.join(apps, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
if (fs.existsSync(styles)) {
  let xml = fs.readFileSync(styles, 'utf8');
  if (!xml.includes('android:statusBarColor')) {
    xml = xml.replace(
      /(<style name="AppTheme.NoActionBar"[^>]*>)/,
      '$1\n        <item name="android:statusBarColor">#0f5457</item>\n        <item name="android:navigationBarColor">#ffffff</item>'
    );
    fs.writeFileSync(styles, xml);
  }
}

run('npx capacitor-assets generate --android' +
    ' --iconBackgroundColor "#12908c" --iconBackgroundColorDark "#0c2a2c"' +
    ' --splashBackgroundColor "#f3f7f7" --splashBackgroundColorDark "#0c2a2c"');
run('npx cap sync android');
console.log('Projet Android prêt : applications/android');
