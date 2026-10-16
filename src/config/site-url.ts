// The public origin, for absolute links in share previews, the sitemap and robots.txt.
// Set SITE_URL (with https://) in production. Read on the server only: it is not a NEXT_PUBLIC_ variable.
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
