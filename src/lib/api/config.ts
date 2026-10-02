// Accepts the backend origin or its /api/v1 base URL.
export function getApiBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}
export function getServerApiBaseUrl() {
  const base = (process.env.API_URL ?? getApiBaseUrl()).replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}
