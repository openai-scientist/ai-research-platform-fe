import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, LOGIN_PATH } from "@/lib/auth/auth-config";

// Cookie presence is an optimistic check. Server layouts validate it with /auth/me.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/admin/:path*", "/projects/:path*", "/reviews/:path*", "/dashboard/:path*", "/onboarding"],
};
