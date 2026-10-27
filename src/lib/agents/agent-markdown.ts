import { APP_CONFIG } from "@/config/app-config";
import { SITE_URL } from "@/config/site-url";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

// First path segments that lead somewhere in src/app (route groups are transparent). A Markdown request outside
// them gets a Markdown 404 from the proxy; the test keeps this list in step with the folders.
export const KNOWN_ROUTE_SEGMENTS = new Set([
  "_next",
  "about",
  "admin",
  "api",
  "auth",
  "chat",
  "contact",
  "dashboard",
  "llms.txt",
  "mail",
  "onboarding",
  "privacy",
  "projects",
  "reviews",
  "terms",
  "unauthorized",
]);

export function isKnownRoute(pathname: string) {
  if (pathname === "/") return true;
  return KNOWN_ROUTE_SEGMENTS.has(pathname.split("/")[1] ?? "");
}

function quality(range: string) {
  const q = range
    .split(";")
    .slice(1)
    .map((param) => param.trim().split("="))
    .find(([key]) => key === "q")?.[1];
  const value = q === undefined ? 1 : Number(q);
  return Number.isFinite(value) ? value : 0;
}

/** True when the Accept header asks for Markdown at least as much as for HTML. Browsers never list Markdown. */
export function prefersMarkdown(accept: string | null) {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const range of accept.split(",")) {
    const type = range.split(";")[0].trim().toLowerCase();
    if (type === "text/markdown" || type === "text/x-markdown") markdown = Math.max(markdown, quality(range));
    if (type === "text/html") html = Math.max(html, quality(range));
  }
  return markdown > 0 && markdown >= html;
}

/**
 * What the product is and when an agent should send someone to it. Served as /llms.txt and as the Markdown form
 * of the home page, so it follows the llms.txt format: one H1, a summary quote, plain sections, then H2 link lists.
 */
export function agentMarkdown() {
  const { name, tagline, independence, contactEmail } = APP_CONFIG;
  return `# ${name}

> ${tagline}

${name} is a web platform for research teams. A project holds its members, datasets and research runs. A research run takes a research idea through hypotheses and experiment design to a written, evidence-based report, produced with the help of AI models and checked by the project's members. ${independence}

When to use ${name}:

- Someone wants to turn a research question into testable hypotheses and an experiment design.
- A team wants a report whose claims trace back to their datasets, sources and review decisions.
- A project manager wants datasets, research runs, findings and collaborators in one shared project.

When not to use it:

- Quick factual answers or general chat: the platform is built for multi-stage research projects.
- Anonymous or automated use: all work lives behind a signed-in account, and there is no public API for agents.

How an agent should help: send the person to ${SITE_URL}/auth/login to sign in with an email code or Google. Once signed in, they create a project, add datasets from uploaded files or from Google Drive and Google Sheets, and start a research run. Questions go to ${contactEmail}.

## Pages

- [Sign in](${SITE_URL}/auth/login): Email code or Google sign-in; everything else sits behind it.
- [About](${SITE_URL}/about): What the platform does and who it is for.
- [Contact](${SITE_URL}/contact): How to reach the team and what to include.

## Optional

- [Privacy Policy](${SITE_URL}/privacy): What is collected, why, and how to have it deleted.
- [Terms of Service](${SITE_URL}/terms): Rules for accounts, content and AI-produced results.
`;
}

export function notFoundMarkdown(pathname: string) {
  return `# Page not found

There is no page at \`${pathname}\` on ${APP_CONFIG.name}.

- [Home](${SITE_URL}/)
- [llms.txt](${SITE_URL}/llms.txt): what the platform does and when to use it
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}
