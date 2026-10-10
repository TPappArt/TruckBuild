package io.github.tpappart.truckbuild;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * The whole app: one WebView, filling the screen, showing the game.
 *
 * The game's files are packed in the app's assets, under "www". They are
 * handed to the WebView as if they came from a web address (HOST below), so
 * that the page behaves exactly as it does in a browser: scripts load as
 * modules and saved games are kept. Nothing is ever fetched from a network,
 * and the app does not hold the permission that would allow it.
 */
public class MainActivity extends Activity {
    private static final String TAG = "GamePage"; // android/smoke-test.sh reads the log by this

    /** An address Google keeps for exactly this purpose: it leads nowhere. */
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/";

    /** "?app" tells the page it is already fullscreen (see src/fullscreen.js). */
    private static final String START = BASE + "index.html?app";

    private static final Map<String, String> TYPES = new HashMap<>();
    static {
        TYPES.put("html", "text/html");
        TYPES.put("js", "text/javascript");
        TYPES.put("css", "text/css");
        TYPES.put("json", "application/json");
        TYPES.put("webmanifest", "application/manifest+json");
        TYPES.put("svg", "image/svg+xml");
        TYPES.put("png", "image/png");
        TYPES.put("jpg", "image/jpeg");
        TYPES.put("ico", "image/x-icon");
    }

    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Window window = getWindow();
        // The screen must not dim or lock in the middle of a race.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // Draw behind a notch too. The page keeps its buttons clear of it.
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xff132a6b);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // where the game keeps coins, parts and tracks
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100); // the system's font size setting must not break the layout
        settings.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serve(request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // The game is one page. It never leaves it.
                return !HOST.equals(request.getUrl().getHost());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "page finished: " + url);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                // The page's own messages, for anyone reading the log.
                Log.i(TAG, "page " + message.messageLevel() + ": " + message.message()
                        + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
                return true;
            }
        });

        setContentView(web);
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(START);
    }

    /** Answers a request for one of the game's files from the app's assets. */
    private WebResourceResponse serve(WebResourceRequest request) {
        if (!HOST.equals(request.getUrl().getHost())) return refuse(403, "Forbidden");
        String path = request.getUrl().getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        if (path.contains("..")) return refuse(403, "Forbidden");
        int dot = path.lastIndexOf('.');
        String type = dot < 0 ? null : TYPES.get(path.substring(dot + 1).toLowerCase());
        if (type == null) type = "application/octet-stream";
        try {
            WebResourceResponse response = new WebResourceResponse(type, textual(type) ? "utf-8" : null, getAssets().open("www" + path));
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            response.setResponseHeaders(headers);
            return response;
        } catch (IOException missing) {
            return refuse(404, "Not Found");
        }
    }

    private static boolean textual(String type) {
        return type.startsWith("text/") || type.endsWith("json") || type.endsWith("xml");
    }

    private static WebResourceResponse refuse(int status, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", status, reason, new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    /** Hides the status bar and the navigation buttons; a swipe from the edge brings them back for a moment. */
    private void hideBars() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) hideBars();
    }

    /**
     * Back: the game is asked first (it leaves a race, or closes whatever is
     * open). If it had nothing to go back from, the app steps into the
     * background, which is what Back does at the top of any app.
     */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("Boolean(window.truckbuildBack && window.truckbuildBack())", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onPause() {
        // Stops the page's clock, so nothing runs and no battery is used
        // while the app is out of sight.
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
