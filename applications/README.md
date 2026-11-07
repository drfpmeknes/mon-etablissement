# EduManager Pro — applications Windows et Android

Les deux applications sont construites à partir du même `index.html` (celui du site),
avec en plus :

- le **thème « Cabinet »** (sarcelle, boutons 3D, feuilles qui tournent, mode Jour/Nuit
  automatique) : il est écrit directement dans `index.html`, donc identique sur le site web
  et dans les applications ;
- les bibliothèques (Supabase, Excel, PDF…) **embarquées** dans l'application : elle démarre
  et fonctionne en mode hors-ligne même sans Internet ;
- sur **Android** : impression native (ou « Enregistrer en PDF »), fichiers Excel / Word / PDF
  enregistrés dans `Téléchargements/EduManager`, liens WhatsApp / e-mail ouverts dans la bonne appli.

## Récupérer les applications (sans rien installer)

À chaque modification de `index.html` (ou de ce dossier) envoyée sur GitHub, la compilation
démarre seule (onglet **Actions › Applications Windows et Android**, environ 10 min).
On peut aussi la lancer à la main : **Run workflow**.

Une fois l'exécution en vert ✅, ouvrez-la, section **Artifacts** :

| Fichier | Contenu |
|---|---|
| `EduManagerPro-Windows` | `EduManagerPro-Installation-x.y.z.exe` (installateur, raccourci bureau) et `EduManagerPro-Portable-x.y.z.exe` (sans installation) |
| `EduManagerPro-Android` | `EduManagerPro.apk` |

- **Windows** : au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
  (l'application n'est pas signée) → **Informations complémentaires › Exécuter quand même**.
- **Android** : envoyez l'APK sur le téléphone, ouvrez-le, autorisez « Installer des applis inconnues ».

## Compiler sur votre PC

```bash
cd applications
npm install
npm run windows          # lance l'application Windows pour tester
npm run build:windows    # crée les .exe dans applications/dist
npm run build:android    # prépare applications/android (puis Android Studio : npx cap open android)
```

## Fichiers

| Chemin | Rôle |
|---|---|
| `../index.html` (`#cab-theme-css`, `#cab-theme-js`) | le thème « Cabinet » et le mode Jour/Nuit, communs au site et aux applications |
| `theme/app-runtime.js` | adaptations des applications (service worker désactivé, impression Windows en paysage, pont Android) |
| `scripts/build-www.js` | copie `index.html` dans `www/` et y ajoute les bibliothèques embarquées |
| `windows/` | application Windows (Electron) |
| `android-natif/MainActivity.java` | code natif Android : impression, enregistrement de fichiers, liens |
| `assets/` | icône et écran de démarrage |
