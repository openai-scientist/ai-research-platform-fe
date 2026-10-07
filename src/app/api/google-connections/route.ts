import { getServerApiBaseUrl } from "@/lib/api/config";

export async function GET() {
  try {
    // The backend checks the feature before authentication. Anonymous requests return 401 when enabled,
    // or 404 when disabled. Never forward cookies: an authenticated start would create an OAuth grant.
    const response = await fetch(
      `${getServerApiBaseUrl()}/projects/00000000-0000-0000-0000-000000000000/connections/google/start`,
      { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(3000) },
    );
    return Response.json({ available: response.status === 401 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ available: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
