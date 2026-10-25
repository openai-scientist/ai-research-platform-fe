import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  agentMarkdown,
  isKnownRoute,
  MARKDOWN_CONTENT_TYPE,
  notFoundMarkdown,
  prefersMarkdown,
} from "@/lib/agents/agent-markdown";
import { AUTH_COOKIE_NAME, LOGIN_PATH, REQUEST_PATH_HEADER } from "@/lib/auth/auth-config";

const PROTECTED_PREFIXES = ["/admin", "/projects", "/reviews", "/dashboard"];

function isProtected(pathname: string) {
  return pathname === "/onboarding" || PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function markdown(body: string, status: number) {
  return new NextResponse(body, { status, headers: { "Content-Type": MARKDOWN_CONTENT_TYPE, Vary: "Accept" } });
}

// The home page answers differently by Accept, so caches must keep the variants apart.
function varyOnAccept(response: NextResponse) {
  response.headers.append("Vary", "Accept");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(AUTH_COOKIE_NAME);

  // Agents that ask for Markdown get it on the home page, and a Markdown 404 where nothing exists.
  if ((request.method === "GET" || request.method === "HEAD") && prefersMarkdown(request.headers.get("accept"))) {
    if (pathname === "/") return markdown(agentMarkdown(), 200);
    if (!isKnownRoute(pathname)) return markdown(notFoundMarkdown(pathname), 404);
  }

  // A real redirect, not the page's own: once the page streams, Next.js can only send a meta refresh.
  if (pathname === "/") {
    return varyOnAccept(signedIn ? NextResponse.next() : NextResponse.redirect(new URL(LOGIN_PATH, request.url)));
  }
  if (!isProtected(pathname)) return NextResponse.next();

  // Cookie presence is an optimistic check. Server layouts validate it with /auth/me.
  if (!signedIn) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  // Lets a server page that sends the user elsewhere first (onboarding) bring them back here.
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Every page, so Markdown requests can be answered; files, API calls and build assets are left alone.
    "/((?!api|_next/static|_next/image|.*\\.(?:txt|xml|ico|png|jpg|jpeg|svg|webp|webmanifest)$).*)",
    // Protected areas in full, including paths the pattern above leaves out.
    "/admin/:path*",
    "/projects/:path*",
    "/reviews/:path*",
    "/dashboard/:path*",
  ],
};
