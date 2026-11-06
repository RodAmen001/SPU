package ai.spu.pocket;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * SPU Pocket 1.0 — companion Android du Système Parabolique Universel.
 * - Charge la bibliothèque embarquée (assets/spu/index.html), 100 % hors ligne.
 * - Synthèse vocale native Android (voix du téléphone, aucune donnée envoyée).
 * - Peut naviguer vers un serveur SPU complet (local ou hébergé).
 */
public class MainActivity extends Activity {

    private static final String ACCUEIL = "file:///android_asset/spu/index.html";

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsPret = false;
    private int numeroUtterance = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // favoris, réglages, serveurs récents
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadsImagesAutomatically(true);
        s.setStandardFontFamily("sans-serif");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                return gererLien(req.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return gererLien(url);
            }
        });
        web.setWebChromeClient(new WebChromeClient());

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int statut) {
                if (statut == TextToSpeech.SUCCESS) {
                    int r = tts.setLanguage(new Locale("fr", "FR"));
                    if (r < TextToSpeech.LANG_AVAILABLE) tts.setLanguage(Locale.getDefault());
                    tts.setSpeechRate(1.0f);
                    tts.setPitch(1.0f);
                    ttsPret = true;
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) { }
                        @Override public void onDone(String id) { notifierFinJs(); }
                        @Override public void onError(String id) { notifierFinJs(); }
                    });
                }
            }
        });

        web.addJavascriptInterface(new Pont(), "SpuAndroid");
        setContentView(web);
        web.loadUrl(ACCUEIL);
    }

    private boolean gererLien(String url) {
        if (url.startsWith("file://") || url.startsWith("http://") || url.startsWith("https://")) {
            return false; // naviguer dans l'app (accueil embarqué ou serveur SPU)
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignore) { }
        return true;
    }

    private void notifierFinJs() {
        if (web != null) {
            web.post(new Runnable() {
                @Override public void run() {
                    web.evaluateJavascript(
                        "window.spuTtsFin && window.spuTtsFin();", null);
                }
            });
        }
    }

    /** Pont JavaScript exposé à la page sous le nom window.SpuAndroid. */
    private class Pont {

        @JavascriptInterface
        public String infos() {
            return "{\"app\":\"SPU Pocket\",\"version\":\"1.0.0\",\"tts\":" + ttsPret +
                   ",\"android\":" + Build.VERSION.SDK_INT + "}";
        }

        /** Lit un bloc de texte (≤ ~2600 caractères, déjà découpé côté page). */
        @JavascriptInterface
        public boolean parler(String texte, float vitesse, float hauteur) {
            if (!ttsPret || tts == null || texte == null || texte.trim().isEmpty()) return false;
            try {
                tts.setSpeechRate(Math.max(0.3f, Math.min(2.5f, vitesse)));
                tts.setPitch(Math.max(0.3f, Math.min(2.0f, hauteur)));
                String id = "spu-" + (++numeroUtterance);
                tts.speak(texte, TextToSpeech.QUEUE_ADD, null, id);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void silence() {
            try { if (tts != null) tts.stop(); } catch (Exception ignore) { }
        }

        /** Liste des voix françaises installées, pour l'information utilisateur. */
        @JavascriptInterface
        public String voixDisponibles() {
            List<String> noms = new ArrayList<String>();
            try {
                if (ttsPret && tts != null && tts.getVoices() != null) {
                    for (android.speech.tts.Voice v : tts.getVoices()) {
                        if (v.getLocale() != null && v.getLocale().getLanguage().startsWith("fr")) {
                            noms.add(v.getName());
                        }
                    }
                }
            } catch (Exception ignore) { }
            return noms.toString();
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript(
            "(function(){ try { return !!(window.spuRetour && window.spuRetour()); } catch(e) { return false; } })()",
            new ValueCallback<String>() {
                @Override public void onReceiveValue(String valeur) {
                    if ("true".equals(valeur)) return; // la page a géré le retour (écrans internes)
                    String u = web.getUrl();
                    if (u != null && !u.contains("android_asset/spu/index.html")) {
                        web.loadUrl(ACCUEIL); // revenir depuis un serveur externe
                    } else {
                        finish();
                    }
                }
            });
    }

    @Override
    protected void onPause() {
        super.onPause();
        try { if (tts != null) tts.stop(); } catch (Exception ignore) { }
    }

    @Override
    protected void onDestroy() {
        try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception ignore) { }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
