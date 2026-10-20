// The browser only ever talks to this app's own origin; next.config.mjs passes /api/v1 on to the
// backend, so the backend's address never reaches the browser.
export const API_PREFIX = "/api/v1";

export function getApiBaseUrl() {
  return API_PREFIX;
}
