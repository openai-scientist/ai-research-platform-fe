# AGENTS.md

## Project overview

OpenAI Scientist is the web app of an AI research platform: projects, datasets, data connections, research runs and their review. It is built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui, starting from the Studio Admin template; routes under `src/app/(main)/dashboard/` are template demos.

This repository uses the shadcn `radix-nova` style. The shadcn CLI reports `base: "radix"`, which refers to Radix UI. Always inspect the local components in `src/components/ui/` because individual wrappers may use different primitives.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## shadcn skill

Use the shadcn skill for all work involving shadcn/ui components, styling, composition, registries, presets, or `components.json`.

If the skill is not available, install it with:

```bash
npx skills add shadcn/ui
```

The skill contains the component, styling, composition, accessibility, and CLI rules. Do not duplicate those rules here. Always inspect the local component source before using it.

Do not modify files inside `src/components/ui/` or `src/components/calendar/`. Keep these components intact and apply styling or customization where they are used.

## Setup

This project uses npm.

```bash
npm install
npm run dev
```

Available commands:

```bash
npm run build
npm test
npm run test:api
npm run lint
npm run format
npm run check
npm run check:fix
npm run generate:presets
```

Vitest tests run with `npm test`; live backend checks run separately with `npm run test:api`. Run tests, build, lint, check, or other validation commands only when the user explicitly requests that validation.

## Co-location-based structure

Keep feature code close to the route that owns it.

- Dashboard routes: `src/app/(main)/dashboard/<screen>/page.tsx`
- Screen-specific components, data, and schemas: `src/app/(main)/dashboard/<screen>/_components/`
- Shared dashboard components: `src/app/(main)/dashboard/_components/`
- Shared application components: `src/components/`
- Local shadcn components: `src/components/ui/`
- Shared hooks and utilities: `src/hooks/` and `src/lib/`
- Theme presets: `src/styles/presets/`

Keep a component inside its route until it is reused by another feature. Do not move screen-specific code into a shared directory preemptively.

## Creating or extending a screen

1. Inspect the closest current screen before writing code. Finance, Infrastructure, CRM, and Analytics are useful references. Do not use routes under `(legacy)` as references for new screens unless maintaining a legacy route.
2. When reproducing a UI from a screenshot or image, follow its visual direction closely, including layout, hierarchy, spacing, component structure, and important details. Implement it with the project's existing components and semantic theme tokens rather than copying raw color values. If the design needs a color that is not available through the existing theme tokens, or the user explicitly requests a non-theme color, use a named color from Tailwind's default palette. Do not use arbitrary hex, RGB, HSL, or OKLCH values.
3. Reuse the existing dashboard shell, local components, layout controls, and theme tokens.
4. Break each new page into focused components inside the route's `_components/` directory. Keep `page.tsx` small and focused on composing those pieces.
5. Keep `page.tsx` as a Server Component by default. Move interactive or browser-dependent code into a dedicated Client Component.
6. Add the screen to `src/navigation/sidebar/sidebar-items.ts` when it should appear in the dashboard navigation.
7. Decide the information hierarchy before choosing widgets. Let the content determine the page structure.
8. Keep the established visual rhythm where it fits: compact spacing, clear typography hierarchy, responsive action rows, and grids that collapse cleanly on smaller screens.
9. Widget selection is not a fixed formula. Try different arrangements of cards, resource rows, meters, charts, tabs, empty states, and actions, then keep the version that communicates the content clearly and feels consistent with the project.
10. Match nearby screens in card density, borders, radius, spacing, content width, and responsive behavior.
11. Use semantic theme tokens so new screens work with light mode, dark mode, and the existing theme presets.
12. Handle relevant loading, empty, error, disabled, and overflow states.
13. Keep screens accessible with semantic HTML, keyboard support, visible focus states, labels, and appropriate ARIA attributes.
14. Do not build product screens on the template's generic widgets, such as the dashboard `Users` table. Remove what the template brings that the screen does not use: row checkboxes without a bulk action, list/grid toggles, pagination for a handful of rows, "0 selected" bars.
15. Menu items, buttons and tab labels stay on one line. Give menus enough width instead of letting labels wrap.
16. Check every screen you change at desktop and phone width (about 390 px, no horizontal scroll) and in dark mode before handing it over.

## Code conventions

- TypeScript strict mode is enabled. Use precise types and avoid `any`.
- Use the existing `@/` import aliases.
- Follow the Biome configuration: double quotes, semicolons, two-space indentation, sorted imports, and a 120-character line width.
- Avoid unnecessary dependencies.
- Keep changes focused and do not refactor unrelated files.
- Run `biome check --write` only on the files you changed. Running it on a folder re-sorts imports in other people's files.

## Talking to the backend

- The browser calls the API only through this app's own origin at `/api/v1/*`; `next.config.mjs` rewrites it to the backend. Use `getApiBaseUrl()` from `src/lib/api/config.ts`.
- Server code (route handlers, server components, `src/server/`) uses `getServerApiBaseUrl()` from `src/lib/api/server-config.ts`. Never put the backend URL in a `NEXT_PUBLIC_*` variable or in client code.
- Upload bodies pass through the rewrite; the limit is `experimental.proxyClientMaxBodySize` in `next.config.mjs`.

## Toasts

- Success toasts are written here and say what was acted on. A short name fits one line: `Dataset "Survey 2024" deleted.` A name that can be long (an email, a person, a file) goes in the description under a short title: `toast.success("Invitation cancelled", { description: email })`. `perform()` in `projects/[projectId]/_components/workspace-ui.tsx` accepts `{ title, description }` for this.
- Bulk actions give a count: `3 datasets deleted.`
- Toasts that answer the user's own action use the default position (top centre). News that arrives on its own (realtime notifications, a run that needs a decision, finishes or stops) passes `position: "bottom-right"`.
- Pick the type by meaning: `success`, `error`, `warning` (something needs the user), `info`. The colour and icon come from the type; do not style toasts one by one.

## Branding and metadata

- The product is **OpenAI Scientist**. Read the name, tagline and the independence line ("Independent project. Not affiliated with OpenAI.") from `APP_CONFIG` in `src/config/app-config.ts`; never hard-code them.
- Show the logo with `<BrandMark />` from `src/components/brand-mark.tsx`. It takes the current text colour, so it works in both themes and every preset.
- Favicon, app icons, the manifest and the share images are Next.js file conventions in `src/app/` (`favicon.ico`, `icon.svg`, `apple-icon.png`, `manifest.webmanifest`, `opengraph-image.png`, `twitter-image.png`). Replace those files to change them.
- Absolute URLs (share previews, sitemap) use `SITE_URL` from `src/config/site-url.ts`, which reads the `SITE_URL` environment variable.

## Product language and error feedback

- This is an English-language platform. All user-facing application copy must be in English, including labels, buttons, loading states, empty states, accessibility text, and toast notifications.
- Display errors only through the existing Sonner toast system. Do not render inline error messages, error banners, or error panels in forms or screens. This also applies to frontend validation errors.
- For API errors, prefer the backend response's `message` as the error toast text. Preserve this message rather than translating it. Use an English fallback when no API message is available or a network error occurs.
- Branch on `error.code` for error handling; do not branch on the message text. Respect `Retry-After` for rate-limited requests.
- Preserve the project's existing design system. Reuse local components, their built-in variants, and semantic theme tokens; do not introduce a separate visual style.

## Test data and secrets

- Never read, print or commit `.env` files or keys.
- Test accounts and seeded records use `@example.com` addresses, so nothing reaches a real inbox. Do not invite or email real people while testing.
- Remove the data you created for a test when you are done.

## Contributions

- Use conventional commit prefixes such as `feat:`, `fix:`, `refactor:`, `docs:`, and `chore:`.
- Include screenshots for new screens and material visual changes. Include mobile and dark-theme states when relevant.
- Explain new reusable patterns or dependencies in the pull request.
- Follow `CONTRIBUTING.md` for the contribution workflow.
