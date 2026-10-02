import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { jwtDecode } from "jwt-decode";

const getUserRoles = (token: string | undefined): string[] => {
  if (!token) return [];
  try {
    const decoded = jwtDecode(token) as {
      role?: string | string[];
      roles?: string | string[];
      exp?: number;
    } | null;

    if (decoded?.exp && decoded.exp < Math.floor(Date.now() / 1000)) return [];

    const rawRoles = decoded?.role ?? decoded?.roles;
    if (!rawRoles) return [];
    return Array.isArray(rawRoles) ? rawRoles : [rawRoles];
  } catch {
    return [];
  }
};

const hasRole = (roles: string[], target: string) => roles.includes(target);

/**
 * Runs before requests complete in Next.js 16 (replaces legacy middleware).
 * Handles authentication, RBAC, and redirects.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  const userRoles = getUserRoles(token);

  if (pathname.endsWith(".xml") || pathname.endsWith(".json")) return NextResponse.next();

  const publicRoutes = [
    "/",
    "/auth/v1/login",
    "/auth/v1/register",
    "/auth/v2/login",
    "/auth/v2/register",
    "/unauthorized",
  ];
  const authRoutes = ["/auth/v1/login", "/auth/v1/register", "/auth/v2/login", "/auth/v2/register"];
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/dashboard");

  const isPublicRoute = publicRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isAuthRoute = authRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  // Chưa đăng nhập
  if (!token || userRoles.length === 0) {
    if (isProtectedPath) {
      const res = NextResponse.redirect(new URL("/auth/v1/login", request.url));
      if (token) res.cookies.delete("authToken");
      return res;
    }
    if (isPublicRoute) return NextResponse.next();
  }

  // Đang ở auth route mà đã đăng nhập
  if (isAuthRoute && token && userRoles.length > 0) {
    if (hasRole(userRoles, "ROLE_ADMIN") || hasRole(userRoles, "SYSTEM_ADMIN")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (hasRole(userRoles, "REVIEWER")) {
      return NextResponse.redirect(new URL("/reviews", request.url));
    }
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  // Admin route check
  if (pathname.startsWith("/admin")) {
    if (!hasRole(userRoles, "ROLE_ADMIN") && !hasRole(userRoles, "SYSTEM_ADMIN")) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp4|xml|glb)$).*)"],
};
