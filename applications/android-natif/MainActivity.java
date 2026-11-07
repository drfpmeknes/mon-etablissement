package ma.drfp.edumanager;

import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * EduManager Pro — application Android.
 * Ajoute à la WebView un pont « EduManagerNatif » utilisé par app-runtime.js :
 *  - imprimer(html, titre)  : impression Android (ou « Enregistrer en PDF ») ;
 *  - enregistrerFichier(...) : enregistre Excel / Word / PDF dans Téléchargements ;
 *  - ouvrirLien(url)        : WhatsApp, e-mail, téléphone, sites web.
 */
public class MainActivity extends BridgeActivity {

    private WebView webImpression; // gardée en mémoire pendant l'impression

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView web = getBridge().getWebView();
        web.addJavascriptInterface(new PontNatif(), "EduManagerNatif");
        // Le pont n'est visible qu'au chargement suivant de la page.
        web.post(web::reload);
    }

    private class PontNatif {

        @JavascriptInterface
        public void imprimer(final String html, final String titre) {
            runOnUiThread(() -> lancerImpression(html, titre));
        }

        @JavascriptInterface
        public void enregistrerFichier(final String base64, final String nom, final String type) {
            try {
                byte[] octets = Base64.decode(base64, Base64.DEFAULT);
                Uri uri = enregistrer(octets, nettoyerNom(nom), type);
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this,
                        "Enregistré dans Téléchargements : " + nom, Toast.LENGTH_LONG).show();
                    ouvrirFichier(uri, type);
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "Échec de l'enregistrement : " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void ouvrirLien(final String url) {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "Aucune application pour ouvrir ce lien", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private void lancerImpression(String html, String titre) {
        final String nomTravail = (titre == null || titre.trim().isEmpty()) ? "EduManager Pro" : titre.trim();
        WebView w = new WebView(this);
        w.getSettings().setJavaScriptEnabled(false); // évite les scripts d'auto-impression
        w.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (pm == null) return;
                PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .build();
                pm.print(nomTravail, view.createPrintDocumentAdapter(nomTravail), attrs);
            }
        });
        webImpression = w;
        w.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
    }

    private String nettoyerNom(String nom) {
        String n = (nom == null || nom.trim().isEmpty()) ? "fichier" : nom.trim();
        return n.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private Uri enregistrer(byte[] octets, String nom, String type) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, nom);
            v.put(MediaStore.Downloads.MIME_TYPE, type);
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/EduManager");
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new Exception("stockage indisponible");
            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                if (os == null) throw new Exception("stockage indisponible");
                os.write(octets);
            }
            return uri;
        }
        File dossier = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "EduManager");
        if (!dossier.exists() && !dossier.mkdirs()) throw new Exception("dossier inaccessible");
        File f = new File(dossier, nom);
        try (FileOutputStream os = new FileOutputStream(f)) { os.write(octets); }
        return FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", f);
    }

    private void ouvrirFichier(Uri uri, String type) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, type);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(Intent.createChooser(i, "Ouvrir avec"));
        } catch (Exception ignore) {
            // Pas d'application compatible : le fichier reste dans Téléchargements.
        }
    }
}
