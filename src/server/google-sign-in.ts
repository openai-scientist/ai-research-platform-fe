import { getServerApiBaseUrl } from "@/lib/api/server-config";

export async function isGoogleSignInAvailable(): Promise<boolean> {
  try {
    // Probe on the server only. Do not follow Google's redirect or forward the unused state cookie.
    // The browser starts its own flow by navigating directly to the backend when the user clicks.
    const response = await fetch(`${getServerApiBaseUrl()}/auth/google/start`, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.status !== 404;
  } catch {
    // A temporary outage does not mean the feature is disabled.
    return true;
  }
}
