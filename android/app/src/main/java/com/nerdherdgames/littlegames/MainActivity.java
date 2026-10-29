package com.nerdherdgames.littlegames;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;

/** An offline host for the same production games shipped on the web. */
public final class MainActivity extends Activity {
    private static final String HOST = WebViewAssetLoader.DEFAULT_DOMAIN;
    private static final String START_URL = "https://" + HOST + "/assets/index.html";
    private WebView webView;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);

        // Keep controls clear of system bars and cutouts, including Android 15+ edge-to-edge.
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        webView.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                // Never fall back to the network, even for a missing asset or unexpected URL.
                return response != null ? response : new WebResourceResponse(
                        "text/plain", "UTF-8", 404, "Not Found", null,
                        new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                return !"https".equals(url.getScheme()) || !HOST.equals(url.getHost())
                        || !"/assets/index.html".equals(url.getPath());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(START_URL);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.stopLoading();
        webView.destroy();
        super.onDestroy();
    }
}
