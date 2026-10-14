# Frontend handoff: gaps between the FE and the research pipeline API (S1 + S2)

Date: 2026-10-14. Audience: the frontend team. Status: for information.

## How to read this file

- This file does not make decisions. Each gap lists facts and possible options. The frontend team chooses the option.
- The full API reference is `management/docs/frontend-api-handoff-6-research-pipeline.md`. This file does not repeat it. It lists only where the current FE code and the new API differ.
- Backend PR: https://github.com/openai-scientist/management/pull/7 (branch `refactor/feature-packages` into `dev`).
- Evidence uses `path:line`. FE paths are relative to `ai-research-platform-fe/`. BE paths are relative to `management/`.
- Facts come from a read of the code on 2026-10-14. Items marked "not verified" were not read in full.

## Summary of the new backend model

- A research run now runs a pipeline of stages: `hypothesis` (engine i2h), then `experiment_plan` (engine exd).
- Each stage has its own status, phase, step, gates, review rounds and artifacts.
- The researcher acts on a stage: answer a question gate, approve or comment at a review gate, accept the stage result.
- The run timeline is one event stream for all stages. Each event carries `class`, `stage_key`, `stage_run_id`, `step_key` and `phase`.
- The old run-level routes still work in S2. The handoff doc marks them legacy (removal at G3).

## Gaps

### G1. Run creation does not send the new fields

Facts:
- The FE sends only `topic`, `domains` and `review_mode` (`src/lib/run-stream/run-store.ts:106-110`).
- The BE also accepts `interaction_mode` and `budget_usd` (`src/management/research/schemas/runs.py:46-55`). `interaction_mode` overrides `review_mode` when engines are configured.
- The FE already has a `ReviewMode` type with `auto | light | copilot | full` (`src/lib/run-stream/contract.ts:42`), but the selector is hidden (`src/lib/run-stream/features.ts:7`, `SHOW_REVIEW_MODE = false`).
- The FE request type declares `budget_usd` (`src/lib/api/services/fetch-runs.ts:15`), but the create call does not send it.

Options:
- A. Keep the current body. The BE uses `review_mode` and the server default budget.
- B. Add `interaction_mode` to the create form. Show the selector.
- C. Add both `interaction_mode` and `budget_usd`.

Note: cost reporting from engines arrives in S4 (see G8). Until then a budget does not stop a run.

### G2. The FE run model is the Popper pipeline, not the stage pipeline

Facts:
- The FE models a run as Popper screens: `scope`, `search`, `screen`, `read`, `synthesize`, `hypothesize`, `map`, `experiment`, and others (`src/lib/run-stream/contract.ts:9-27`).
- The FE has no stage concept. A search for `i2h` or `exd` in `src/` has no match.
- The BE run detail has `current_stage` with `stage_run_id`, `stage_key`, `engine_key`, `status`, `phase`, `step_key`, `waiting_input`, `open_gate` and `cost_usd` (`src/management/research/schemas/runs.py:58-68`).
- The BE lists all stages with `GET /runs/{run_id}/stages` (`src/management/research/router/run_stages.py:86`). Each item adds `iteration`.
- Stage statuses come from the orchestrator: for example `RUNNING`, `COMPLETED`, `FAILED`, `ACCEPTED` (`src/management/research/orchestrator.py:39-41`).

Options:
- A. Add a stage layer above the current screens. Map i2h `step_key` values to the existing Popper screens where they match.
- B. Build a new stage view (stage list, current stage, phase, step) and keep the Popper studio for legacy runs only.
- C. Show stages as a simple list for S2 and defer a full studio redesign.

### G3. Gate answers use the legacy run-level route and body

Facts:
- The FE posts to `POST /runs/{run_id}/gates/{gate_id}` (`src/lib/api/services/fetch-runs.ts:85-87`) with `{option_id, note?, dropped?, kept?}` (`src/lib/run-stream/contract.ts:606-612`).
- The BE stage route is `POST /runs/{run_id}/stages/{stage_run_id}/gates/{gate_id}` (`src/management/research/router/run_stages.py:108-109`). The body is `{action, option_id?, text?}`. `action` is `answer`, `approve` or `comment` (`run_stages.py:51-53`).
- BE gate kinds are question gates and `artifact_review` gates (`src/management/research/contracts/base.py:47`). A question gate needs `answer`. A review gate needs `approve` or `comment` (`src/management/research/reviews.py:39-43`).
- The FE has no `comment` action on gates. The FE gate kinds are `scope | screen | hypotheses | decision | report | publish` (`src/lib/run-stream/contract.ts:44`).
- The legacy route stays registered in S2. The handoff doc says to use the stage route for pipeline runs.

Options:
- A. Move pipeline runs to the stage route. Keep the legacy route only for legacy runs.
- B. Add a thin adapter in `src/lib/run-stream/api-run.ts` that picks the route by run type.

Any option needs a new UI for `comment` at a review gate. In S2 a comment can target a section or a finding of the reviewed artifact (see the BE handoff doc, section "Gates, comments and acceptance").

### G4. No stage acceptance in the FE

Facts:
- The BE has `POST /runs/{run_id}/stages/{stage_run_id}/accept` (`run_stages.py:208-209`). The body has `selection` (a map from a key to a list of ids) and `note` (`run_stages.py:61-62`).
- The hypothesis stage needs at least one selected hypothesis, otherwise 422 `INVALID_SELECTION` (`src/management/research/orchestrator.py:421`).
- Accept on a stage that is not `COMPLETED` gives 409 `STAGE_STATE_CONFLICT` (`run_stages.py:228`).
- The FE has no call to this route.

Options:
- A. Add an accept step at the end of each stage, with hypothesis selection for the `hypothesis` stage.
- B. Reuse the current "hypotheses" gate UI for the selection and post it to the accept route.

### G5. Event types in the reducer do not match the new events

Facts:
- The FE SSE client already matches the BE frames: `run-event`, `run-ended` and `session-ended` (`src/lib/realtime/run-events.ts:119-146`). Paging uses `after` and `limit` (`run-events.ts:77`).
- The FE reducer switches on Popper event types, for example `run.status`, `gate.opened`, `gate.resolved`, `plan.locked`, `decision.committed` (`src/lib/run-stream/reducer.ts:37-50`, `contract.ts:711-878`).
- The BE emits engine lifecycle events (`run.phase_changed`, `run.step_changed`, `run.gate_opened`, `run.gate_closed`, `review.completed`, `artifact.delivered`, `run.cost`, `run.published`, `run.failed`, `run.cancelled`), engine activity events (`i2h.*`, `exd.*`) and Platform events (`stage.status_changed`, `decision.recorded`, `attention.required`). Source: BE handoff doc, section "Timeline and attention"; `src/management/research/stage_runs.py:8-15`.
- Each event has `class`: `lifecycle`, `activity` or `platform` (`src/management/research/schemas/runs.py:112-113`).
- `GET /runs/{run_id}/events` accepts `stage_run_id` to filter by stage (`src/management/research/router/runs.py:303-313`). With a filter, `seq` has gaps. Use the largest received `seq` as `after`.
- `run-ended` can carry `stopped` and `budget_exceeded` in addition to `completed` and `failed`.

Options:
- A. Add reducer cases for the new lifecycle and Platform events. Show activity events as generic timeline rows (`summary`, `actor`, `step_key`).
- B. Write a separate reducer for pipeline runs and keep the Popper reducer for legacy runs.
- C. For S2, render the event list as a plain timeline and derive state only from `current_stage`.

### G6. Review history and artifact fields are not used

Facts:
- The BE has `GET /runs/{run_id}/stages/{stage_run_id}/reviews` (`run_stages.py:194`). Each item has `review_round` and `artifacts` (`src/management/research/schemas/reviews.py:10-12`).
- Artifact items now include `stage_run_id`, `schema_id`, `version`, `primary` and `review_round` (`src/management/research/router/run_artifacts.py:25-38`). The list and download paths did not change.
- The FE artifact type does not declare these fields (`src/lib/api/services/fetch-artifacts.ts:10-19`). Not verified: which artifact fields FE components read.
- The two engines differ on `primary` and version numbering (open item for contract 1.2.0). Do not rely on one rule for both engines yet.

Options:
- A. Group artifacts by stage and review round. Mark the primary artifact.
- B. Keep a flat list and add only a stage label.

### G7. Frame reviews are legacy

Facts:
- The FE uses `GET/POST /runs/{run_id}/frame-review` and `GET /runs/{run_id}/frame-reviews` (`src/lib/api/services/fetch-frame-reviews.ts:39-59`). Signals are `approve`, `edit`, `reject`, `unknown` (`src/types/enums.ts:42-46`).
- The BE handoff doc says to use artifact review gates and stage review history instead. The routes are removed at G3.
- The run detail page opens the frame-review tab when a run is `awaiting_review` (`src/app/(main)/projects/[projectId]/_components/run-details.tsx:74`).

Options:
- A. Replace the frame-review tab with the stage review gate (G3) and review history (G6).
- B. Keep the tab for legacy runs and hide it for pipeline runs.

### G8. Cost and budget show values that stay at zero

Facts:
- The FE shows `cost_usd` and `budget_usd` in several places (`run-details.tsx:183-185`, `run-studio/run-studio.tsx:410`, `budget-usage-card.tsx:89`, `manager-dashboard-data.ts:65-66`, admin usage screen `admin-usage-screen.tsx:69-70`).
- Engines do not report usage to the Platform yet. This is scheduled for S4. Until then `cost_usd` is `0` and the budget does not stop a run.
- `current_stage.cost_usd` also exists (`schemas/runs.py:68`).

Options:
- A. Keep the displays. Add a note "cost tracking not available yet" until S4.
- B. Hide cost for pipeline runs until S4.
- C. Keep as is.

### G9. Notification text and link for `run_awaiting_review`

Facts:
- The BE now sends `run_awaiting_review` when a gate opens or a stage becomes `COMPLETED` or `FAILED`, in manual modes only. It is not sent in `auto`. Reviewers do not receive it. Source: BE handoff doc, "Timeline and attention"; `src/management/research/orchestrator.py:330-339`.
- The handoff doc asks to show it as "research needs attention", because it includes failed stages.
- The FE links this notification to the frame-review tab (`src/lib/notification-content.ts:46-48`).
- Notifications arrive by SSE at `notifications/stream` (`src/lib/realtime/signalr.ts:101`). This did not change.

Options:
- A. Change the text to "Research needs attention" and link to the run's current stage.
- B. Keep the text and change only the link.

### G10. Admin model and integration screens are static mocks

Facts:
- The FE admin "Models & Providers" and settings pages show hard-coded values (`src/app/(main)/admin/_components/platform-pages.tsx:33-37, 169-182`; `admin-data.ts:137-141`; `settings-page.tsx:65-66`). They call no API.
- The BE has `GET /admin/models`, `PUT /admin/models/{role}` (`role` is `stage` or `review`), `GET /admin/integrations`, `PUT /admin/integrations/{name}`, `DELETE /admin/integrations/{name}` (`src/management/research/router/admin_models.py:62-160`). Writes need CSRF.
- Model input: `provider` (`openai_compatible` or `bedrock`), `model`, optional `base_url`, `api_key`, `extra`, `input_usd_per_mtok`, `output_usd_per_mtok`. A blank key keeps the saved key. Responses give `has_api_key`, never the key.
- A run cannot start without both models: 409 `MODELS_NOT_CONFIGURED`. The review model must differ from the stage model: 422 `REVIEW_MODEL_SAME_AS_STAGE`.

Options:
- A. Build the two forms (models, integrations) on the existing admin pages.
- B. Build only the model form now. Configure integrations by API until later.

Today an administrator can configure models only through the API. Without this screen, a new environment cannot start a pipeline run from the UI.

### G11. Legacy run actions

Facts:
- The FE calls `pause`, `resume`, `sync` and `abandon` (`src/lib/api/services/fetch-runs.ts:63-96`).
- The BE keeps them registered in S2 but marks them legacy (BE handoff doc, "Legacy route migration and G3 removal"). Pipeline stop arrives in S3. Pause and resume for pipelines arrive in S3. Explicit sync is replaced by background reconciliation in S4.
- The handoff doc says: do not show send-back, rerun, stop, mode change or budget update controls in S2.

Options:
- A. Hide these actions for pipeline runs in S2.
- B. Keep them and accept that they act only at run level.

### G12. New error codes

Facts: the stage routes return these codes. The FE handles generic codes in `src/lib/api/core.ts:83-116` and shows `message`.

| Code | HTTP | When |
|---|---|---|
| `GATE_ACTION_INVALID` | 422 | Wrong action for the gate kind |
| `GATE_OPTION_INVALID` | 422 | Option is not one of the gate's options |
| `GATE_NOT_OPEN` | 409 | Gate was already answered |
| `ENGINE_UNAVAILABLE` | 503 | Engine could not be reached |
| engine code, e.g. `token_allowance_exhausted` | 409 or 422 | Engine refused the answer. `message` is `Engine rejected the answer: <reason>` (`run_stages.py:170-178`) |
| `STAGE_STATE_CONFLICT` | 409 | Accept on a stage that is not completed |
| `INVALID_SELECTION` | 422 | Accept with no hypothesis selected |
| `ARTIFACT_NOT_READY` | 409 | Published artifact not delivered yet |
| `SCHEMA_MISMATCH` | 409 | Next engine does not accept the artifact |
| `MODELS_NOT_CONFIGURED`, `PROVIDER_NOT_SUPPORTED`, `INTEGRATION_MISSING`, `ENGINE_CONTRACT_MISMATCH` | 409 / 422 | Run start checks |

Options:
- A. Show `message` as is (it already carries the engine reason).
- B. Map selected codes to friendly text, and keep `message` as detail.

`RUN_ACTIVE` still exists. The FE uses it to find the running run (`src/lib/run-stream/run-store.ts:115-118`).

## What did not change

- Base URL and `/api/v1` prefix, cookie session, CSRF header and envelope parsing (`src/lib/api/config.ts:3-4`, `src/lib/api/core.ts:21-52`).
- Run list and detail routes, artifact list and download routes, run comments routes (`/runs/{run_id}/comments`).
- The SSE frame names for run events and notifications.

## Open questions for the frontend team

1. Do legacy (Popper) runs need to stay visible after G3, or can the FE show only pipeline runs?
2. Which review mode selector (G1) do researchers need in S2: `auto`, `light`, `copilot`, or all of them?
3. Is the admin model screen (G10) needed before the first shared environment, or is API setup acceptable?

## Not verified

- Which `RunItem` and artifact fields FE components read (only the declared types were read).
- SignalR provider files after line 120 of `src/lib/realtime/signalr.ts`.
- Response shapes of the gate and accept routes beyond the BE handoff doc.
