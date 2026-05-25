// Every API route in this app is either auth-protected or returns
// user-specific data, so no API response is safe to cache across requests.
// Apply this before route handlers to prevent browser, proxy, and CDN caching.
function noStore(req, res, next) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache"); // HTTP/1.0 backwards compatibility
  next();
}

module.exports = { noStore };
