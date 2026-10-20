import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site-url";

// Everything else sits behind sign-in, so only the auth pages are worth indexing.
const PUBLIC_ROUTES = ["/auth/login", "/auth/register"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));
}
