import { API_PREFIX } from "./config";

// The backend itself, for code that runs on the server only: keep this out of client modules so its
// address is never bundled for the browser. Accepts the backend's origin or its /api/v1 base URL.
export function getServerApiBaseUrl() {
  const base = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
  return base.endsWith(API_PREFIX) ? base : `${base}${API_PREFIX}`;
}
