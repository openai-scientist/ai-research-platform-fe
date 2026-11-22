# Run Studio live views

Import from "@/lib/run-stream/live-views". The three mappers are synchronous, pure, and accept decoded data. They make no requests and do not mutate the input. The Dataset, Experiment design, and Execution scenes can compute their maps independently. Hypothesis and Writing use their existing models.

## Public API

| Export | Meaning |
| --- | --- |
| mapDatasetViews(input), DatasetViews | Eleven Dataset steps keyed by DatasetStepKey. |
| mapDesignViews(input), DesignViews | Three Experiment design steps keyed by DesignStepKey. |
| mapExecutionViews(input), ExecutionViews | Six Execution steps keyed by ExecutionStepKey. |
| DatasetStepKey, DesignStepKey, ExecutionStepKey | The stage-specific unions of the step keys in the tables below. Execution keys retain the "execution_" prefix used by the existing Run Studio. |
| LiveStepKey | Union of those step keys. |
| LiveViewInput | Optional events, artifacts, and syncing fields. |
| LiveStep&lt;Content&gt; | Common step envelope with a typed content payload specific to each step. |
| buildLiveSidePanel(views, active), LiveSidePanel | Text-only right-column model with the current title/explanation, stage sub-step states, next stop, and concise rules. |
| LiveStructureItem | A known structural label and its source; an optional upstream fact is only present when an upstream artifact publishes it. |
| LiveFinding | A display-safe observation with kind, text, and downstream usedBy step keys. |
| ReviewThread | Shared Dataset and Design review content. |

### Input and provenance

- **events** holds original PipelineEnvelope instances for the run and selected stage attempts. The mappers filter by stage_key and order by seq. In ApiRun these are available through receiveEnvelopes before PipelineAdapter collapses some detail. Dataset's independent stream can use its original events as well.
- **artifacts** is a schema-to-decoded-JSON mapping. Select the artifact version and stage_run_id with the existing fetchArtifacts helpers, including the review round where applicable. Only pass bodies received for this run and the selected or accepted upstream attempts. For each review, supply that stage's review.findings/v1 and revision.response/v1 separately. Keeping review artifacts scoped to the stage prevents cross-stage or cross-round replies.
- **syncing** records a gap the stream owner is reconciling. Use the existing history catch-up and clear it when the stream has caught up. The mappers cannot deduce a gap from stage-filtered sequence numbers. The current transport owns catch-up internally without exposing a sync callback to these pure mappers.
- **source** is "engine" when the step has observed content and "preview" when rendering the known procedure. A preview can still have an observed start, a completion event, or a recorded finding.
- **valueState** is "pending", "available", or "syncing". During syncing, show the syncing state and hide the cursor, while previously received values remain available. A pending value uses null or an empty collection. Zero and false are real values whenever present. Structural labels, the cursor index, and progress are UI metadata.
- **valueSources** identifies top-level content sections fed by "artifact", "event", or "mixed". The column descriptions below identify the source of individual fields inside mixed sections. A field with no recorded value may be null even when its section has a source. A value from the plan during Execution describes the expected design.
- **structure** is the ordered, display-safe outline already known for a step. Each item has a label and a source artifact or "known procedure". It may contain labels for columns, rules, question-map rows, split parts, hypotheses, DAG nodes/edges, analyses, estimands, decision rules, lock parts, or program slots. A `fact` may be included only for a numeric fact actually published upstream, with `source: "upstream"` and the artifact name. Structure is not a result.
- **values** is null until the selected step has its own event or artifact-backed values; otherwise it mirrors that step's typed `content`. This makes a structural preview explicit without treating labels as measured output. `content` remains available for existing scene adapters during migration.
- **phase** is "running", "waiting", or "recorded". A matching unresolved gate event sets "waiting" and puts its sanitized prompt in **question**. A terminal step event or completing artifact sets "recorded"; otherwise the step is "running", including a structure-only preview.
- **walk** is "structure" only when the UI can walk known structure while no step progress event/count is available. It is null when real progress, a gate, or completion takes precedence. A structure walk is a presentation cue, not engine progress.
- **progress** stays within 0–1. **progressFrom** is "artifact" when a completing artifact arrived, "event-state" for an engine step signal, "event-count" for reported counts, or "unavailable" for no progress signal. A terminal signal can coexist with unavailable content. Design's count is local to the reported diagnostic part. Execution's count is the number of preceding positions in the sealed pass, not the number of successful runs.
- **cursor** is a zero-based index. **cursorTarget** is "content" for design_work.content.hypotheses or execution_run.content.slots when the engine identifies the item. Dataset progress tasks can target a known phase in **procedure**, with cursorTarget "procedure". A null cursor means no matching signal, completion, waiting gate, or syncing. The components should avoid animating a target across a missing event range.
- **procedure** contains static descriptions of the known work. Use **structure** plus these descriptions to build a "Procedure preview". Leave empty value slots empty or show "Evaluating". Do not generate sample counts, estimates, fractions, point intervals, or prefilled findings.
- **findings** belongs to the step that produced its evidence. Each entry has kind "ok" for passing evidence, "flag" for an issue, or "note" for context, text for display, and usedBy for the consuming steps. Build "Found in this step" from the active step's findings. Build "Used in this step" by filtering other steps' findings on usedBy.includes(activeKey). The links represent known workflow consumers. The engine does not emit a per-finding usage graph.
- **content** contains structured fields for the scene. Only use sanitized view text in the UI. The mappers do not return operational identifiers or digest fields. Column names, ordinary file names, natural-language labels, and display ordinals are intended for rendering.

### Side panel

`buildLiveSidePanel(views, activeKey)` returns `now` (a human title and one-line explanation), the active step's ordered procedure lines as `substeps` with recorded/current/waiting/upcoming state, the next stage stop as `nextStop`, and short `rules`. It uses fixed user-facing copy and mapped step phases only; it does not include span names, trace identifiers, event IDs, or artifact keys.

### Structure sources added for live previews

- **Dataset data_checks** combines variable names from the DataCard, dictionary columns, registered check/rule names, question-map labels, and split-part names from `dataset.snapshot/v1` and `dataset.data_card/v1`. Rule outcomes, anomaly values, coverage metrics and counts remain in values and are null until this step records them.
- Other **Dataset** steps outline source roles/names, table units and keys, profile columns, dictionary columns with types/roles, cleaning actions/requirements, mapped questions, split parts, fitness pairs/axes, DataCard variables/caveats, and review challenges. Their structure sources are the matching `dataset.snapshot/v1`, `dataset.data_card/v1`, `dataset.brief/v2`, or `review.findings/v1` fields.
- **Experiment design design_work** uses the upstream DataCard variables and snapshot dictionary/question map, then plan hypotheses, DAG nodes/edges, estimands and named decision rules when `experiment_design.plan/v1` is published. A structure-only preview has null values.
- **Experiment design design_review** outlines review challenges from `review.findings/v1`. **design_accept** lists the plan's analysis roles, estimands/method names, named rules and recorded lock parts. These come from `experiment_design.plan/v1` and `experiment_design.lock/v1`.
- **Execution execution_run** lists expected program slots, registered branches, hypotheses and estimands from the accepted upstream `experiment_design.plan/v1`. Slot state, run place, postings and result values are not inferred from that plan; they stay pending until execution events/artifacts arrive.
- Other **Execution** steps outline lock comparison parts from `experiment_design.lock/v1` (using the safe part names only), plan program slots, unseal prerequisites, decision-rule headings, and evidence-package sections from the accepted plan, execution check contract, or result package contract. No numbers are added to structure by these mappers.

## Dataset

The primary schema is dataset.data_card/v1. dataset.snapshot/v1 publishes supporting records. dataset.brief/v2 can supply the chosen question and alternatives. A matching dataset.item can supply a milestone without its artifact.

| Step | Content fields and Logos sources |
| --- | --- |
| sources | sources comes from snapshot.sources, falling back to card.source. Each row has filename, role, location, origin, tentative, format, rows, columns, member, sheet, license, citation, encoding, connectionKind, selection, and fetchedAt. The card fallback covers file/connection metadata, while roles and per-source sizes come from the snapshot. |
| table_model | tables is the published source shape, with filename, rows, columns, and role. unit is the card's unit_of_observation. keys are dictionary columns with role "key". Join cardinality and runtime key-validation counts are unavailable. |
| profile_quality | part, rows, and reason describe the snapshot.table_profile scope and availability. columns holds column, kind, measure, missingShare, stats, levels, and levelsNotListed from the exploration profile. cardAggregates holds name, summary, flags, and levels from the DataCard's separately published univariate summary. Keep those populations distinct. Stats fields are valid, missing, distinct, mean, sd, min, max, p25, median, and p75. Levels contain value, label, count, and missing. DataCard flags produce findings for checks and fitness. |
| dictionary | columns are the snapshot dictionary rows with column, type, meaning, unit, role, measure, and semanticType. sources tracks the origin of type, meaning, unit, role, and measure. timing has tier, source, and status from snapshot.timeline. cardVariables contains the same DataCard variable projection as disclosure. |
| cleaning_recipe | steps contains kind, column, reason, and changed where the snapshot cleaning recipe publishes them. requirements contains column, what, and reason from cleaning_recipe.plan_requirements. Requirements produce findings for Design. |
| question_map | mapping comes from snapshot.question_map. Each row has label, kind, column, coverage, coverageBy, levels, definedOutcome, population, complete, and table. chosenQuestion is the brief's chosen text. questions holds text, variables, rationale, and complete from the candidate questions in the brief. Coverage findings feed checks, fitness, and Design. |
| split | method and unit state the splitting procedure. total, complete, and counted describe the snapshot split's count basis. parts has name, count, and fraction for exploration, confirmation, and reserve. The card is a fallback for its recorded exploration and confirmation fields when the snapshot split is absent. Counts stay unavailable when the selected report withholds them. |
| data_checks | columns names the inputs for a rules-by-column matrix. rules has rule, columns, status, reason, source, min, max, tolerance, levels, when, allowed, rowsChecked, failingRows, below, and above from snapshot.data_checks and its run objects. anomalies has category, severity, columns, text, explanation, levels, named counts, and optional statistic with name, value, df, and p from snapshot.findings. coverage reuses the question-map rows. complete is the published split's complete-case count. leakage holds columns and flag from the explicit leakage checks. Counts are aggregates. No individual failing rows are available. |
| fitness | pairs contains exposure, outcome, claimCeiling, and axes from snapshot.pair_fitness. Axes entries have name, status, and reason for timing, measurement, sample strength, missingness, positivity, clustering, and generalisation. verdict, reasons, rules, and acceptedBy come from snapshot.fitness_verdict. |
| disclosure | header has title, description, unit, unitSource, rows, columns, minCell, disclosure, and source from the DataCard. variables has name, position, label, description, type, measure, role, kind, concept, blankMeans, flags, levels, missingValues, summary, and sources for label, measure, levels, and missing. split uses the published partition on the same basis as the split step. access records actor, what, rows, and detail. decisions records question, variables, label, note, and by. caveats, gaps, and sensitive hold published limitations and column, kind, and confirmed for each sensitive mark. |
| review | ReviewThread from review.findings/v1 and matching revision.response/v1. review.completed is a progress milestone. |

### ReviewThread

- **round** and **passed** come from the review artifact.
- **threads** holds one entry per recorded challenge. **challenge**, **severity**, and **suggestion** project a finding's issue, severity, and proposed fix. **resolved** is true when the finding is closed or the matching reply is fixed, false for a recorded open finding, and null when the artifact gives no answer. **reply** holds outcome and text from the matching revision item. A suggestion and a recorded reply have separate fields.

## Experiment design

Read experiment_design.plan/v1, experiment_design.design_diagnosis/v1, experiment_design.lock/v1, and the Design review artifacts.

| Step | Content fields and Logos sources |
| --- | --- |
| design_work | hypotheses contains a display hypothesis ordinal and statement. adjustment contains set from dag.adjustment_set or program.covariates, notes from covariate_notes, and optional backdoor. The backdoor object holds nodes with name and measured, edges with from and to, residualConfounders, barredConfounders, and limitations from the recorded causal diagram. simulation reads the diagnosis artifact, falling back to plan.design_diagnosis. It has light, sesoi, alpha, metric, powerPoints, diagnostics, and notes. powerPoints uses the actual reported sesoi_sensitivity.points, with effect, power, and standardizedEffect. The points are calculator sensitivity, while diagnostics.powerAtSesoi is the Monte Carlo estimate. The other diagnostic values are bias, coverage, and falsePositiveRate. powerReplicates, powerMcse, simulatedRows, plantedReplicates, falsePositiveReplicates, and falsePositiveMeasuredOn identify their bases. simulationPart, count, and cursor are from experiment_design.progress with phase "power". |
| design_review | ReviewThread on the same basis as Dataset review, for the Design attempt. |
| design_accept | header has title, question, version, lockedAt, lockedBy, and hypotheses count. Title and question are available in the result package's protocol specification, with the brief's chosen question as an earlier fallback. The plan itself has no title/question fields. analyses has hypothesis ordinal, role, statement, estimand, method, multiplicity, and decision. The main rule has direction, SESOI, unit, alpha, and interpretation statements in conditions. Forks and controls only carry the fields the plan names. rules has multiplicity, alpha, gatekeeping, description, ifThen, and openGaps. Each ifThen entry holds signal, threshold, branch, rule, and status. lockParts lists what the received Lock pins by name: the plan, programs, reference outputs, snapshot version, and split. It does not compare them with Execution's inputs. |

## Execution

Read the accepted upstream experiment_design.plan/v1 and experiment_design.lock/v1 plus execution.bundle/v1, evidence.records/v1, and platform.experiment_result/v1 from the Execution attempt. Use the execution.item and execution.progress envelopes unchanged.

| Step | Content fields and Logos sources |
| --- | --- |
| execution_verify | structure lists safe part names from the upstream Plan Lock. parts has name, state, and text for the plan, programs, reference outputs, snapshot, dataset file, and split. A green lock item establishes a clean comparison. A named mismatch in a red lock item's reason establishes that part changed. Other parts stay null on a red item because Logos may truncate its problem list. reason is the scrubbed event reason. |
| execution_prepare | rehearsal.design names the inputs the rehearsal repeats. rehearsal.now and rehearsal.reason reflect the rehearsal item. dryRun.state and dryRun.reason come from the dry_run item. dryRun.programs comes from the published bundle flow diagram and holds an optional programIndex into the run slots and steps with text and rows. |
| execution_run | slots contains hypothesis ordinal, program label, envelope, method, detail, state, place, and reason. The accepted plan supplies expected slots and their method/detail, execution.progress identifies the started program and its place, the bundle's envelope log establishes posts, and result-package runs establish completion, skips or failures and their reason. The current cursor follows the actual sealed progress event, excluding post-unseal reruns. branches projects the plan's signal, threshold, powerFloor, branch, rule, and status. Thresholds stay pending in a procedure preview. branchDeviations carries text and reason for the published drift/merge deviations. observedBranches records the Freedman–Lane start when there is a real progress event or post. confirmatory and robustness come from their group-check events. Sealed estimates never enter this view. |
| execution_unseal | opened is established by the bundle's unseal record or the corresponding item; an ended-blind bundle records false. openedAt, approvedBy, and resultCount come from the published unseal log. prerequisites contains each name and status from the lock, rehearsal, confirmatory, and robustness items. |
| execution_check | verdicts holds hypothesis ordinal, programIndex, verdict, reason, assessment, assessmentReason, metric, estimate, low, high, intervalLevel, n, sesoi, sesoiUnit, direction, p, adjustedP, alpha, and gate. Verdicts come from the bundle, result package, or evidence records. Estimates and intervals come from evidence records, published comparisons, or bundle results. SESOI and direction come from the matched plan decision rule. Adjusted p and gate come from the bundle verdict. multiplicity comes from the plan's family structure. |
| execution_deliver | status is the package's "complete", "partial", or "blocked"; null means the package is unavailable. version is the published package version. reason for a blocked package uses a published reason, a recorded failure or packaging reason, then the producer's no-verdict rule. parts contains human section names and available counts for plans, design jobs, runs, comparisons, verdicts, robustness, exploration, figures, artifacts, and quality gates. missing contains item and action from quality.validation.missing_items. |

The package contract permits "complete". The current Logos execution producer chooses "partial" when it has verdicts and "blocked" when it has none.

## Modules

- index.ts exports the public API.
- dataset.ts, design.ts, and execution.ts contain the stage-specific mappers and inferred return types.
- shared.ts carries the public models and internal mapping utilities. body and record decode object fields. list and rows select arrays and rows. present, raw, number, and bool perform shape checks. human, label, and texts project display text. stageEvents and itemEvent select original events. stepFor builds the common envelope. finding produces typed observations. reviewContent builds the shared review thread.
- live-views.test.ts covers every step mapping, preview, cursor and progress, syncing, withheld counts, and a blocked delivery.

## Gaps between the prototypes and the published data

- Dataset per-action cursor positions, exact local and rounded released counts side by side, sample row values, failing row identities, duplicate and key counts, join metrics, and the full raw quality profile are absent from the published artifacts used here. The available profile and DataCard aggregates remain separate. Row samples must stay on the Local Node.
- The design report publishes sensitivity calculator points and one Monte Carlo power estimate at the registered SESOI. A dense simulated power curve, per-point intervals, and streaming intermediate diagnostics are absent. The plan may carry no causal graph or no simulation, for example when diagnosis is light or a data host cannot compute the release. The independent-review artifact can have challenges without any reply.
- The full execution lock problem list, design-versus-now rehearsal values, unposted program dry runs, exact per-branch gauge observations, and complete branch trace are held in the workspace. They are absent from the web publications. The published flow figure contains only available row-count steps. Program-start progress supplies a cursor but does not certify a post. The envelope log and adjudicated results generally arrive with the bundle at handoff. Some Local Node-only detail requires release and is unavailable to the web.
- Some prototype structure has no source until its upstream artifact is published: Dataset rule names and the full rules-by-columns matrix are absent without the `data_checks` field in `dataset.snapshot/v1`; a causal graph is absent when the plan has no DAG; and Execution can list only programs registered in the accepted plan. Dry-run internals and branch-by-branch trace structure are not available before their web artifacts/events arrive.
- A disconnected transport can reconcile event history, but the current frontend transport does not expose a syncing callback. Pass syncing when the integration has that signal. Sequence numbering includes events from other stages and cannot establish a gap in a filtered view.

## Validation report

The view model additions are covered by the focused mapper suite and source-only typecheck. Changes are limited to the live-view mapper modules, their tests and documentation, and the live input hook.

| Command | Result |
| --- | --- |
| `npx biome check` on the seven changed TypeScript files | Passed with no diagnostics. |
| `npx vitest run src/lib/run-stream/live-views/live-views.test.ts` | All 14 mapper tests passed. |
| `npx tsc --noEmit --project &lt;temporary source-only config&gt;` | Passed. The config extended the repository tsconfig and selected source files plus generated Next.js types, excluding test snapshots. |
| `npx vitest run --reporter=dot` | 610 passed; four known baseline failures remain (the missing Prettier import suite startup, route registry mismatch, and two claim-scope assertions). No new failures from this task. |
