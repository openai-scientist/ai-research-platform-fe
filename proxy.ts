import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, LOGIN_PATH, REQUEST_PATH_HEADER } from "@/lib/auth/auth-config";

// Cookie presence is an optimistic check. Server layouts validate it with /auth/me.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  // Lets a server page that sends the user elsewhere first (onboarding) bring them back here.
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/admin/:path*", "/projects/:path*", "/reviews/:path*", "/dashboard/:path*", "/onboarding"],
};
