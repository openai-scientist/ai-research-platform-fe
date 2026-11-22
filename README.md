# ai-research-platform-fe

Frontend for the **AI Research Experimentation Platform** — a workspace where researchers go from dataset and hypothesis to validated findings with AI assistance.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4 and shadcn/ui.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run Studio mock

Set `DATASET_STAGE_MOCK=1` in `.env.development.local` and start the development server.
Open [Run Studio mock](http://localhost:3000/dev/dataset-stage) to enter at the Local Node release.
After simulated approval, the preview shows the Dataset checks and their results as they arrive.
Accept the Data card and open **Hypothesis** from the stage bar to replay the existing Logos recording in the same workspace.
The recording uses a separate research topic. Use the **Dataset** tab to revisit the accepted Data card.
After you accept the Hypothesis selection, Experiment design builds a mock analysis plan for the hypotheses you kept.
Use **Skip step** to advance. The demo pauses to confirm estimands, choose an evidence strategy and set a practical threshold.
The final decision records an exploratory plan or a conditional confirmatory commitment in the demo. Production approvals and Core Lock are separate.
Protocol, Robustness and Diagnose show the paired analysis, exploratory checks and a synthetic twin rehearsal.
Design and Execution link each accepted claim back to its conditions, cited evidence cards and independent review from the Hypothesis recording.
Execution distinguishes a recorded program result, statistical verdict and claim assessment from the synthetic scoring example.
Once Design is recorded, **Open Execution rehearsal** to follow Verify, Prepare, Run, Check, Seal, Deliver and Readout.
The active agent points to the evidence it is working on. Open completed steps from the stage bar or use **Replay Execution**
to watch the synthetic analysis again.
**Restart demo** returns to the Local Node release. The mock is available only in development with the flag enabled.

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
