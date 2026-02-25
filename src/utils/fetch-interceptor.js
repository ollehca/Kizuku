/**
 * Fetch/XHR Interceptor
 * Redirects PenPot API calls to the local mock server on port 9999.
 * Injected into the renderer process as early as possible.
 */

/**
 * Get the fetch interceptor script as a string for injection
 * @returns {string} JavaScript source for fetch/XHR interception
 */
function getFetchInterceptorScript() {
  return `
(function() {
  if (window.__kizukuFetchInterceptorInstalled) return;
  window.__kizukuFetchInterceptorInstalled = true;

  var originalFetch = window.fetch;
  var MOCK_SERVER = 'http://localhost:9999';

  window.fetch = async function(input, init) {
    init = init || {};
    var url = typeof input === 'string' ? input : input.url;
    if (url && url.includes('/api/rpc/command/')) {
      var apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      var mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizuku Fetch] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalFetch(mockUrl, {
        method: init.method || 'GET',
        headers: init.headers || {},
        body: init.body,
      });
    }
    return originalFetch(input, init);
  };

  var originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments, 2);
    if (url && url.includes('/api/rpc/command/')) {
      var apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      var mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizuku XHR] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalXHROpen.apply(this, [method, mockUrl].concat(args));
    }
    return originalXHROpen.apply(this, arguments);
  };

  console.log('✅ [Kizuku] Fetch interceptor installed EARLY');
})();
`;
}

/**
 * Inject fetch interceptor into renderer webContents
 * @param {object} webContents - Electron webContents
 */
function injectFetchInterceptor(webContents) {
  webContents.executeJavaScript(getFetchInterceptorScript()).catch((err) => {
    console.error('❌ Failed to inject fetch interceptor:', err);
  });
}

/**
 * Redirect API and asset requests to the mock server at session level.
 * Catches web-worker requests that bypass the fetch interceptor.
 * @param {object} ses - Electron session (e.g. session.defaultSession)
 */
function setupSessionRedirect(ses) {
  const filter = {
    urls: [
      '*://localhost:*/api/rpc/command/*',
      '*://localhost:*/assets/by-id/*',
      '*://localhost:*/assets/by-file-media-id/*',
    ],
  };
  ses.webRequest.onBeforeRequest(filter, (details, callback) => {
    const url = new URL(details.url);
    if (url.port === '9999') {
      callback({});
      return;
    }
    const mockUrl = `http://localhost:9999${url.pathname}${url.search}`;
    callback({ redirectURL: mockUrl });
  });
}

module.exports = {
  getFetchInterceptorScript,
  injectFetchInterceptor,
  setupSessionRedirect,
};
