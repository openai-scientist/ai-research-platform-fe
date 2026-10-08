# ai-research-platform-fe

Frontend for the **AI Research Experimentation Platform** — a workspace where researchers go from dataset and hypothesis to validated findings with AI assistance.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4 and shadcn/ui.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google Sheets and Drive source picker

Google connections use Google Picker to select a spreadsheet or folder. Configure
`GOOGLE_PICKER_API_KEY` and `GOOGLE_PICKER_APP_ID` in the backend's `.env.local`, enable
Google Picker API in the OAuth client's Cloud project, and restart the backend.
No Google secrets or Picker environment variables are needed in the frontend.
See the [Google connection handoff](docs/api/handoff/frontend-api-handoff-4-google-connections-handoff.md#8-chạy-local)
for API key restrictions and local setup.

## Demo accounts

Authentication currently uses mock data (no backend required). All accounts use the password `123456`.

| Role | Email | Lands on |
| --- | --- | --- |
| System Admin | `admin@gmail.com` | `/admin` |
| Project Manager | `manager@gmail.com` | `/projects` (or last opened project) |
| Researcher | `researcher@gmail.com` | `/projects` (or last opened project) |
| Reviewer | `reviewer@gmail.com` | `/reviews` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Lint with Biome |
| `npm run check` | Lint and format check with Biome |
| `npm run format` | Format with Biome |

## Project structure

- `src/app/(main)/projects` — project list and project workspace
- `src/app/(main)/admin` — system administration
- `src/app/(main)/reviews` — reviewer queue
- `src/components/ui` — shadcn/ui components
- `docs/` — BRD and PRD
