package com.rafiquk.offline

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.URLConnection

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
        private const val CAMERA_PERMISSION_REQUEST_CODE = 1002
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val START_URL = "https://appassets.androidplatform.net/index.html"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.setSupportZoom(false)

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(AndroidDownloadBridge(), "AndroidDownloadBridge")

        webView.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
            if (url.startsWith("blob:")) {
                val safeMime = mimeType ?: "application/octet-stream"
                val suggestedName = extractFileName(contentDisposition, safeMime)
                val js = """
                    (function() {
                        fetch('$url')
                            .then(function(r) { return r.blob(); })
                            .then(function(blob) {
                                var reader = new FileReader();
                                reader.onloadend = function() {
                                    var base64data = reader.result.split(',')[1] || '';
                                    window.AndroidDownloadBridge.saveBase64File(base64data, '$suggestedName', '$safeMime');
                                };
                                reader.readAsDataURL(blob);
                            });
                    })();
                """.trimIndent()
                webView.evaluateJavascript(js, null)
            } else if (url.startsWith("data:")) {
                val commaIndex = url.indexOf(',')
                if (commaIndex != -1) {
                    val base64Data = url.substring(commaIndex + 1)
                    val safeMime = mimeType ?: "application/octet-stream"
                    val suggestedName = extractFileName(contentDisposition, safeMime)
                    saveBase64ToDownloads(base64Data, suggestedName, safeMime)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hook programmatic <a download="filename" href="blob:..."> clicks so filename is preserved
                val hookJs = """
                    (function() {
                        if (window.__rafiqukDownloadHooked) return;
                        window.__rafiqukDownloadHooked = true;
                        document.addEventListener('click', function(e) {
                            var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
                            if (!a) return;
                            var href = a.getAttribute('href') || '';
                            var downloadName = a.getAttribute('download') || 'rafiquk_export.schpack';
                            if (href.indexOf('blob:') === 0 && window.AndroidDownloadBridge) {
                                e.preventDefault();
                                fetch(href)
                                    .then(function(r) { return r.blob(); })
                                    .then(function(blob) {
                                        var reader = new FileReader();
                                        reader.onloadend = function() {
                                            var b64 = (reader.result || '').split(',')[1] || '';
                                            window.AndroidDownloadBridge.saveBase64File(
                                                b64,
                                                downloadName,
                                                blob.type || 'application/octet-stream'
                                            );
                                        };
                                        reader.readAsDataURL(blob);
                                    });
                            }
                        }, true);
                    })();
                """.trimIndent()
                view?.evaluateJavascript(hookJs, null)
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                if (url.host != APP_HOST) {
                    return super.shouldInterceptRequest(view, request)
                }

                var assetPath = url.path?.removePrefix("/") ?: "index.html"
                if (assetPath.isEmpty()) {
                    assetPath = "index.html"
                }

                return try {
                    val inputStream = assets.open(assetPath)
                    val mimeType = guessMimeType(assetPath)
                    WebResourceResponse(
                        mimeType,
                        "UTF-8",
                        200,
                        "OK",
                        mapOf(
                            "Access-Control-Allow-Origin" to "*",
                            "Cache-Control" to "no-cache"
                        ),
                        inputStream
                    )
                } catch (_: Exception) {
                    if (!assetPath.contains(".")) {
                        try {
                            val fallbackStream = assets.open("index.html")
                            WebResourceResponse(
                                "text/html",
                                "UTF-8",
                                200,
                                "OK",
                                mapOf("Access-Control-Allow-Origin" to "*"),
                                fallbackStream
                            )
                        } catch (_: Exception) {
                            notFoundResponse()
                        }
                    } else {
                        notFoundResponse()
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                return try {
                    startActivityForResult(
                        Intent.createChooser(intent, "اختر ملف الحزمة (.schpack)"),
                        FILE_CHOOSER_REQUEST_CODE
                    )
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback = null
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val requiresCamera = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                if (requiresCamera && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    pendingPermissionRequest = request
                    requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_PERMISSION_REQUEST_CODE)
                } else {
                    request.grant(request.resources)
                }
            }
        }

        webView.loadUrl(START_URL)
    }

    inner class AndroidDownloadBridge {
        @JavascriptInterface
        fun saveBase64File(base64Data: String, fileName: String, mimeType: String) {
            saveBase64ToDownloads(base64Data, fileName, mimeType)
        }
    }

    private fun extractFileName(contentDisposition: String?, mimeType: String): String {
        if (!contentDisposition.isNullOrBlank()) {
            val match = Regex("filename\\*?=['\"]?(?:UTF-8'')?([^'\";]+)", RegexOption.IGNORE_CASE)
                .find(contentDisposition)
            if (match != null) {
                return Uri.decode(match.groupValues[1].trim())
            }
        }
        val ext = when {
            mimeType.contains("json") -> ".json"
            mimeType.contains("pdf") -> ".pdf"
            mimeType.contains("spreadsheet") || mimeType.contains("excel") -> ".xlsx"
            else -> ".schpack"
        }
        return "rafiquk_${System.currentTimeMillis()}$ext"
    }

    private fun saveBase64ToDownloads(base64Data: String, fileName: String, mimeType: String) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val safeName = fileName.ifBlank { "rafiquk_${System.currentTimeMillis()}.schpack" }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType.ifBlank { "application/octet-stream" })
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                if (uri != null) {
                    contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                downloadsDir.mkdirs()
                val outFile = File(downloadsDir, safeName)
                FileOutputStream(outFile).use { it.write(bytes) }
            }
            runOnUiThread {
                Toast.makeText(
                    this@MainActivity,
                    "تم حفظ الملف في التنزيلات: $safeName",
                    Toast.LENGTH_LONG
                ).show()
            }
        } catch (e: Exception) {
            runOnUiThread {
                Toast.makeText(
                    this@MainActivity,
                    "تعذر حفظ الملف: ${e.localizedMessage}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun guessMimeType(path: String): String {
        val lower = path.lowercase()
        return when {
            lower.endsWith(".html") -> "text/html"
            lower.endsWith(".js") || lower.endsWith(".mjs") -> "application/javascript"
            lower.endsWith(".css") -> "text/css"
            lower.endsWith(".json") || lower.endsWith(".schpack") -> "application/json"
            lower.endsWith(".svg") -> "image/svg+xml"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".ico") -> "image/x-icon"
            lower.endsWith(".woff2") -> "font/woff2"
            lower.endsWith(".woff") -> "font/woff"
            lower.endsWith(".ttf") -> "font/ttf"
            else -> URLConnection.guessContentTypeFromName(path) ?: "application/octet-stream"
        }
    }

    private fun notFoundResponse(): WebResourceResponse {
        return WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            mapOf("Access-Control-Allow-Origin" to "*"),
            ByteArrayInputStream(ByteArray(0))
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val results: Array<Uri>? = if (resultCode == RESULT_OK && data != null) {
                val dataUri = data.data
                if (dataUri != null) arrayOf(dataUri) else null
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            val req = pendingPermissionRequest
            pendingPermissionRequest = null
            if (req != null) {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    req.grant(req.resources)
                } else {
                    req.deny()
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
