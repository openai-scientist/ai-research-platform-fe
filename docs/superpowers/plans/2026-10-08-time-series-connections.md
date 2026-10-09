# Time series connections implementation

Implement `docs/api/handoff/frontend-api-handoff-5-time-series-connections.md` on
`feat/time-series-connections`, preserving the current connection wizard, semantic
theme tokens, project permissions and Sonner feedback.

1. Extend connection/source/column types and add the cancellable live API call.
2. Add Prometheus and InfluxDB providers, URL/authentication forms and transport guidance.
3. Reuse the wizard with a default-schema metric/measurement picker and time series
   controls. Validate field/tag limits, timezone conversion, aggregation and the
   Prometheus point limit; require a nonempty preview before import.
4. Add a separate polling hook and chart. Replace each complete window, preserve
   gaps/nulls, use response bounds and stop/pause/retry as specified in the handoff.
5. Display immutable source metadata and open a prefilled preview/import form for
   dataset refresh, retaining the existing reconciliation for uncertain imports.
6. Add focused regression coverage for source validation, chart conversion and
   polling lifecycle. Leave changes uncommitted for user review.

Validation execution is deferred: AGENTS.md requires an explicit user request for
tests, build, lint, check and other validation commands. Browser QA and screenshots
are likewise pending. The provided handoff is the approved implementation scope;
no additional design approval or dependencies are needed.

Implemented: provider grouping and credentials, default-schema browsing, shared
time series controls, preview/import guards, polling and chart conversion, saved
source metadata and prefilled version refresh. Regression files cover contracts,
credentials, selection rules, UTC reconciliation and polling cancellation/errors.

Manual review decisions:
- Keep backend error messages in Sonner; HTTP credential transport and truncated
  live windows are informational callouts rather than inline error panels.
- Compare time series timestamps by instant when reconciling an uncertain import,
  since the backend normalizes UTC strings. Field/tag order remains significant.
- Preserve the original value strings in live chart tooltips without rounding.
- Reuse existing contributor/archive access checks; dataset history stays readable.
- Tests, build, lint and browser screenshots have not been executed.
