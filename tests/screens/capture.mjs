import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// SCREENS_PORT: capture on another port when a real dev server already owns 3000.
const PORT = process.env.SCREENS_PORT ?? "3000";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const NODE_ID = "33333333-3333-4333-8333-333333333333";
const tagIndex = process.argv.indexOf("--tag");
const TAG = tagIndex >= 0 ? process.argv[tagIndex + 1] : "FE-S0";
// GUIDE-2: `--only tag1,tag2` captures just those routes (no Add data flows, no count check).
const onlyIndex = process.argv.indexOf("--only");
const ONLY = onlyIndex >= 0 ? process.argv[onlyIndex + 1].split(",") : null;
const OUTPUT = join(ROOT, "test-results", "screens", TAG);
const timestamp = "2026-11-13T12:00:00.000Z";
let forceEmptyDatasets = false;
// GUIDE-2: the Local Node last seen two days ago and no longer online.
let nodeOffline = false;
// GUIDE-2: Run Studio waiting on the Local Node ("offline") or for its release review ("review"). The run is the
// recorded logos run (read only, never edited): its first 40 events plus one event that parks it in that state.
let runScenario = null;
// FE-DS6: the Dataset stage runs of local-v3 ("running", "review", "done"), a node without the data-card family.
let ds6Runs = "none";
// FE-DS8: replay of the 30 stored events of RUN-FAEC up to this count (0 = off).
let ds8Upto = 0;
// FE-DS11: a finished stage that waits for the researcher to accept it.
let ds6Accept = false;
let studioDataset = null;
let studioAccepted = false;
let nodeNoCap = false;
let artifactSchema = null;
const DS6_RUN_ID = "44444444-4444-4444-8444-444444444444";
const ds6Card = {
  title: "Neighborhood Travel Diary",
  n_rows: 1980,
  n_columns: 5,
  unit_of_observation: "one household trip",
  min_cell: 10,
  disclosure: "standard",
  variables: [
    {
      name: "v4",
      type: "string",
      measure: "nominal",
      kind: "single",
      role: "input",
      summary: { n_valid: 1980, n_missing: 0, n_distinct: 6, mean: null, sd: null },
      flags: [],
    },
    {
      name: "v5",
      type: "date",
      measure: "ordinal",
      kind: "single",
      role: "partition",
      summary: { n_valid: 1900, n_missing: 80, n_distinct: 90, mean: null, sd: null },
      flags: ["possible_pii"],
    },
  ],
  caveats: ["Counts are rounded down to 10 on the Local Node."],
  gaps: ["No codebook was supplied."],
};
const ds6Brief = {
  questions: [
    { id: "Q1", text: "Does access to services explain commute time?", variables: ["access_score", "v1"] },
    { id: "Q2", text: "Do trip modes differ across the neighbourhood?", variables: ["v4", "v5"] },
  ],
  chosen: { question_id: "Q1", text: "Does access to services explain commute time?" },
};
function ds8Events() {
  const all = JSON.parse(readFileSync(join(ROOT, "tests/screens/fixtures/dataset-run-real-events.json"), "utf8"));
  return all.slice(0, ds8Upto).map((e) => ({ ...e, run_id: DS6_RUN_ID, stage_run_id: "stage-1" }));
}
function ds6Run() {
  const status =
    studioDataset === "accept"
      ? studioAccepted
        ? "running"
        : "awaiting_review"
      : { running: "running", review: "awaiting_review", offline: "paused", done: "completed" }[ds6Runs];
  return {
    ...runItem(),
    id: DS6_RUN_ID,
    ...(studioDataset === "cloud" ? { dataset_id: "remote-dataset", dataset_version_id: remoteV2.id } : {}),
    status,
    ...(ds6Accept
      ? { case: { problem: { text: "Does access to services explain commute time?", source: "researcher" } } }
      : {}),
    title:
      studioDataset === "cloud"
        ? "Explore dataset Commute and Service Access Survey"
        : "Explore dataset Neighborhood Travel Diary",
    pipeline_key: "dataset_first",
    created_at: "2026-11-13T11:30:00.000Z",
    finished_at: status === "completed" ? timestamp : null,
    tokens_used: 18400,
    token_budget: 200000,
    current_stage:
      status === "completed"
        ? null
        : {
            stage_run_id: "stage-1",
            stage_key: studioAccepted ? "hypothesis" : "dataset",
            status: ds6Accept ? "COMPLETED" : status === "running" ? "running" : "awaiting_review",
            phase: ds6Accept ? "published" : status === "running" ? "table_quality" : "release_review",
          },
  };
}
function studioDatasetEvents() {
  const events = ds7Events();
  const last = events.at(-1);
  const complete = { ...last, seq: last.seq + 1, type: "stage.status_changed", payload: { status: "COMPLETED" } };
  if (!studioAccepted) return [...events, complete];
  const accept = { ...complete, seq: complete.seq + 1, payload: { status: "ACCEPTED" } };
  const goals = {
    title: "Access to services and commute time",
    problem: "Does access to services explain commute time in the travel diary?",
    objective: "Estimate the association between service access and commute time.",
    scope: "Use the accepted travel diary data card to define variables and checks.",
    success: "State a testable hypothesis and specify the outcome and access measure.",
  };
  const scope = runEvents()
    .filter((event) => event.seq >= 6 && event.seq <= 14)
    .map((event, i) => ({
      ...event,
      run_id: DS6_RUN_ID,
      seq: accept.seq + i + 1,
      ...(event.type === "hypothesis.scope.goal"
        ? { payload: { ...event.payload, value: goals[event.payload.field] } }
        : {}),
    }));
  return [...events, complete, accept, ...scope];
}
// FE-DS7: the events a Dataset run stores, named as the dataset engine sends them (`dataset.item`, `dataset.review`,
// `dataset.progress`) with the lifecycle events around them. `ds6Runs` picks how far the run got.
function ds7Events() {
  let seq = 0;
  const ev = (type, payload = {}, extra = {}) => ({
    seq: ++seq,
    run_id: DS6_RUN_ID,
    ts: `2026-11-14T09:${String(seq).padStart(2, "0")}:00.000Z`,
    type,
    stage_key: "dataset",
    stage_run_id: "stage-1",
    step_key: null,
    phase: null,
    class: type.startsWith("dataset.") ? "activity" : "lifecycle",
    summary: null,
    refs: [],
    actor: type.startsWith("dataset.") ? "dataset" : null,
    payload,
    ...extra,
  });
  const item = (key, state, reason = "") =>
    ev(
      "dataset.item",
      { key, state, reason, spent_tokens: state === "green" ? 1800 : 0 },
      { summary: `${key}: ${state}`, step_key: "work", phase: "drafting" },
    );
  const wait = "Waiting for release review on the Local Node.";
  if (ds6Runs === "review") return [ev("dataset.progress", { kind: "release_review", text: wait }, { summary: wait })];
  const out = [
    ev("run.step_changed", { from: null }, { step_key: "work", phase: "drafting" }),
    item("sources", "green"),
    item("table_model", "green"),
    item("profile_quality", ds6Runs === "done" ? "green" : "red", "Profile of 5 columns is missing."),
  ];
  if (ds6Runs === "running")
    out.push(
      ev(
        "dataset.progress",
        { task: "reading", state: "running", seconds: 14 },
        { summary: "Reading the file and describing its columns: 14 s so far", step_key: "work" },
      ),
    );
  if (ds6Runs === "offline" || ds6Runs === "done")
    out.push(item("dictionary", ds6Runs === "done" ? "green" : "red", "Columns v1–v5 have no meaning yet."));
  if (ds6Runs === "offline")
    out.push(ev("run.phase_changed", { from: "drafting", reason: "runner_offline" }, { phase: "paused" }));
  if (ds6Runs === "done") {
    for (const key of ["cleaning_recipe", "question_map", "split", "data_checks", "fitness", "disclosure"])
      out.push(item(key, "green"));
    out.push(
      ev("run.step_changed", { from: "work" }, { step_key: "review", phase: "reviewing" }),
      ev(
        "dataset.review",
        { object: "data_card", round: 1, findings: 2, blocking: 0 },
        { summary: "Review round 1 of data_card: 0 blocking", step_key: "review", actor: "dataset" },
      ),
      ev("artifact.delivered", { artifact_id: "art-card", schema: "dataset.data_card/v1", version: 1, primary: true }),
      ev("run.published", { artifact_id: "art-card" }, { phase: "published" }),
    );
  }
  return out;
}
const RUN_ID = "78d5a948-f043-45bc-bbdf-35af42aa71fb";
function runEvents() {
  const all = readFileSync(join(ROOT, "src/lib/run-stream/fixtures/logos-run.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const head = all.slice(0, 40);
  const base = head[39];
  const parked =
    runScenario === "offline"
      ? { type: "run.phase_changed", payload: { from: "running", reason: "runner_offline" }, phase: "paused" }
      : {
          type: "hypothesis.progress",
          payload: { kind: "release_review", text: "Waiting for release review on the Local Node." },
          phase: null,
        };
  return [...head, { ...base, seq: base.seq + 1, step_key: null, ...parked }];
}
function runItem() {
  const events = runEvents();
  return {
    id: RUN_ID,
    project_id: PROJECT_ID,
    dataset_id: "local-dataset",
    dataset_version_id: "local-v3",
    dataset_version_number: 3,
    created_by_user_id: USER_ID,
    status: runScenario === "offline" ? "paused" : "running",
    auto_review: false,
    budget_usd: "0",
    cost_usd: "0",
    failure_message: null,
    created_at: "2026-11-13T11:00:00.000Z",
    started_at: "2026-11-13T11:00:05.000Z",
    finished_at: null,
    updated_at: timestamp,
    label: "RUN-78D5",
    title: "Does the commute time depend on access to services?",
    ...(runScenario ? { case: { problem: { text: "Does the commute time depend on access to services?" } } } : {}),
    pipeline_key: "logos",
    review_mode: "light",
    domains: ["urban planning"],
    last_seq: events[events.length - 1].seq,
  };
}
const sha = "a3b1c9d7e5f20468a3b1c9d7e5f20468a3b1c9d7e5f20468a3b1c9d7e5f20468";

const user = {
  id: USER_ID,
  email: "researcher@example.com",
  display_name: "Morgan Lee",
  avatar_url: null,
  status: "active",
  platform_role: "user",
  email_verified: true,
  onboarded: true,
  created_at: "2025-01-01T00:00:00.000Z",
};
const session = {
  created_at: timestamp,
  last_seen_at: timestamp,
  idle_expires_at: "2026-11-14T12:00:00.000Z",
  absolute_expires_at: "2026-12-13T12:00:00.000Z",
};
const project = {
  id: PROJECT_ID,
  name: "Urban Mobility Study",
  description: "A project workspace for transport and access research.",
  domain: "Urban planning",
  objective: "Understand how commuting patterns relate to access to public services.",
  tags: ["mobility", "survey"],
  status: "researching",
  owner_user_id: USER_ID,
  my_role: "project_manager",
  created_at: "2025-06-01T00:00:00.000Z",
  updated_at: timestamp,
};
const versionBase = {
  dataset_id: "remote-dataset",
  original_filename: "commute-survey.csv",
  size_bytes: 284_672,
  sha256: sha,
  row_count: 1842,
  column_names: ["respondent_id", "age_band", "commute_minutes", "mode", "access_score"],
  source_type: "upload",
  source: null,
  created_by_user_id: USER_ID,
  created_at: timestamp,
};
const remoteV1 = {
  ...versionBase,
  id: "remote-v1",
  version_number: 1,
  superseded_by_version: 2,
  stale: true,
  created_at: "2026-10-12T12:00:00.000Z",
};
const remoteV2 = {
  ...versionBase,
  id: "remote-v2",
  version_number: 2,
  original_filename: "commute-survey-clean.csv",
  size_bytes: 301_902,
  row_count: 1916,
  column_names: [...versionBase.column_names, "region"],
  source_type: "connection",
  source: {
    connection_id: "connection-google-sheets",
    connection_name: "Mobility survey workbook",
    connection_kind: "google_sheets",
    source: { type: "table", schema: "survey", name: "commute_responses" },
    fetched_at: "2026-11-02T12:00:00.000Z",
  },
  superseded_by_version: 3,
  created_at: "2026-10-25T12:00:00.000Z",
};
const remoteV3 = {
  ...versionBase,
  id: "remote-v3",
  version_number: 3,
  original_filename: "commute-survey-final.csv",
  size_bytes: 318_404,
  row_count: 1984,
  column_names: [...versionBase.column_names, "region", "survey_wave"],
  created_at: "2026-11-13T12:00:00.000Z",
};
const localCard = {
  variables: [
    {
      name: "v1",
      type: "numeric",
      measure: "scale",
      kind: "single",
      role: "input",
      summary: { n_valid: 1400, n_missing: 440, n_distinct: 70, mean: 32.6, sd: 14.2 },
      flags: ["high_missing"],
    },
    {
      name: "access_score",
      type: "numeric",
      measure: "scale",
      kind: "single",
      role: "target",
      summary: { n_valid: 1840, n_missing: 0, n_distinct: 70, mean: 61.3, sd: 18.7 },
      flags: ["numeric_with_text_codes"],
    },
    {
      name: "v3",
      type: "string",
      measure: "nominal",
      kind: "free_text",
      role: "none",
      summary: { n_valid: null, n_missing: null, n_distinct: null, mean: null, sd: null },
      flags: ["free_text"],
    },
  ],
  n_rows: 1840,
  split: {
    method: "random_rows",
    unit_column: null,
    seed: 42,
    exploration_fraction: 0.5,
    n_exploration: 920,
    n_confirmation: 920,
    mask_sha256: sha,
  },
  report: {
    gaps: [
      "Local Node disclosure: counts are rounded down to 10; small counts are withheld and means and standard deviations have two significant figures.",
      "The Local Node withholds category labels and user-missing codes; they are cell values.",
      "The Local Node withholds minimum, maximum and quantiles.",
    ],
  },
  disclosure: "standard",
};
const localVersion = {
  ...versionBase,
  id: "local-v1",
  dataset_id: "local-dataset",
  version_number: 1,
  superseded_by_version: 2,
  stale: true,
  original_filename: "neighborhood-travel.csv",
  column_names: ["v1", "access_score", "v3"],
  storage: "local",
  disclosure: "standard",
  runner_id: NODE_ID,
  local_card: localCard,
  row_count: 1840,
  created_at: "2026-10-30T12:00:00.000Z",
};
const localV2 = {
  ...localVersion,
  id: "local-v2",
  version_number: 2,
  superseded_by_version: 3,
  stale: false,
  row_count: 1910,
  created_at: "2026-11-05T12:00:00.000Z",
};
const localV3 = {
  ...localVersion,
  id: "local-v3",
  version_number: 3,
  superseded_by_version: null,
  stale: false,
  row_count: 1980,
  created_at: "2026-11-13T12:00:00.000Z",
};
const datasets = [
  {
    id: "remote-dataset",
    project_id: PROJECT_ID,
    name: "Commute and Service Access Survey",
    description: "Cleaned survey responses for the urban mobility study.",
    created_by_user_id: USER_ID,
    created_at: "2026-10-20T12:00:00.000Z",
    updated_at: timestamp,
    latest_version: remoteV3,
  },
  {
    id: "local-dataset",
    project_id: PROJECT_ID,
    name: "Neighborhood Travel Diary",
    description: "Participant-level travel records remain on the research computer.",
    created_by_user_id: USER_ID,
    created_at: "2026-10-30T12:00:00.000Z",
    updated_at: timestamp,
    latest_version: localV3,
  },
];
const node = {
  id: NODE_ID,
  name: "Mobility Lab · Research Station 04",
  created_at: "2026-08-14T12:00:00.000Z",
  last_seen_at: timestamp,
  online: true,
  revoked: false,
  paired_node: true,
  node_version: "0.9.4",
  release_count: 2,
  pending_reviews: 1,
  connection: "signed_in",
  approval: "approved",
  owner_email: "researcher@example.com",
  capabilities: {
    contract_version: "1",
    node_version: "0.9.4",
    families: [
      { family: "data_card", kind: "profile", scopes: ["whole"], max_calls: 1 },
      { family: "missingness_band", kind: "table", op: "missingness", scopes: ["whole", "exploration"], max_calls: 12 },
      {
        family: "rank_correlation",
        kind: "table",
        op: "rank_correlation",
        scopes: ["exploration", "confirmation"],
        max_calls: 8,
      },
    ],
    floors: { min_cell: 10, k_min: 5 },
    isolation: "appcontainer",
    runtime_pin_sha256: sha,
  },
};
const releases = [
  {
    release_id: "rel_01JCR7T8W7H6G5F4E3D2C1B0A9",
    sequence: 2,
    entry_hash: sha,
    previous_hash: sha,
    job_id: "job_01JCR7T8",
    dataset_version_id: "local-v1",
    stale: true,
    superseded_by_version: 2,
    snapshot_sha256: sha,
    result: { table: null, profile: { variables: localCard.variables } },
    received_at: "2026-10-31T12:00:00.000Z",
  },
  {
    release_id: "rel_01JCR6S7R6Q5P4O3N2M1L0K9J8",
    sequence: 1,
    entry_hash: sha,
    previous_hash: "0".repeat(64),
    job_id: "job_01JCR6S7",
    dataset_version_id: "local-v1",
    stale: false,
    superseded_by_version: null,
    snapshot_sha256: sha,
    result: { table: [{ rows: 1842, rounding_step: 10 }] },
    received_at: "2026-10-30T12:00:00.000Z",
  },
];
const access = {
  settings_version: 1,
  permissions: {
    can_invite: true,
    can_view_invite_candidates: true,
    can_manage_members: true,
    can_manage_settings: true,
    can_read_raw_datasets: true,
  },
  invitation: null,
};
const settings = {
  version: 1,
  updated_at: timestamp,
  updated_by_user_id: USER_ID,
  sections: Object.fromEntries(
    ["general", "access", "runs", "models", "literature", "review", "data", "spending", "notifications"].map((key) => [
      key,
      {},
    ]),
  ),
  capabilities: {},
};

function envelope(data, total = Array.isArray(data) ? data.length : null) {
  return {
    success: true,
    message: "OK",
    data,
    meta: { request_id: "fe-s0-mock", pagination: { total, limit: 100, offset: 0 } },
  };
}

function dataForPath(path) {
  if (path === "/auth/me")
    return envelope({
      user,
      session,
      memberships: [{ project_id: PROJECT_ID, project_name: project.name, role: "project_manager", archived: false }],
    });
  if (path === "/projects") return envelope([project]);
  if (path === `/projects/${PROJECT_ID}`) return envelope(project);
  if (path === `/projects/${PROJECT_ID}/access-context`) return envelope(access);
  if (path === `/projects/${PROJECT_ID}/settings`) return envelope(settings);
  if (path === `/projects/${PROJECT_ID}/datasets`) return envelope(forceEmptyDatasets ? [] : datasets);
  if (path === `/projects/${PROJECT_ID}/datasets/remote-dataset`) return envelope(datasets[0]);
  if (path === `/projects/${PROJECT_ID}/datasets/local-dataset`) return envelope(datasets[1]);
  if (path === `/projects/${PROJECT_ID}/datasets/remote-dataset/versions`)
    return envelope([remoteV3, remoteV2, remoteV1]);
  if (path === `/projects/${PROJECT_ID}/datasets/local-dataset/versions`)
    return envelope([localV3, localV2, localVersion]);
  const previewMatch = path.match(/^\/projects\/[^/]+\/datasets\/remote-dataset\/versions\/([^/]+)\/preview$/);
  if (previewMatch) {
    const version = previewMatch[1] === remoteV1.id ? remoteV1 : remoteV2;
    return envelope({
      dataset_id: "remote-dataset",
      version_id: version.id,
      columns: version.column_names,
      rows: [
        ["R-001", "25–34", "28", "Bus", "63", "North"],
        ["R-002", "35–44", "41", "Rail", "72", "Central"],
      ],
      truncated: false,
      masking_applied: false,
      masked_cells: 0,
      detection_status: "ready",
    });
  }
  if (path === `/projects/${PROJECT_ID}/runs`)
    return envelope(runScenario ? [runItem()] : ds6Runs === "none" ? [] : [ds6Run()]);
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}`) return envelope(ds6Run());
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/events`)
    return envelope(
      studioDataset === "accept"
        ? studioDatasetEvents()
        : ds8Upto
          ? ds8Events()
          : ds6Runs === "none"
            ? []
            : ds7Events(),
    );
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/artifacts`)
    return envelope(
      ds6Runs === "done" || ds6Accept
        ? [
            {
              id: artifactSchema === "dataset.brief/v2" ? "art-brief" : "art-card",
              run_id: DS6_RUN_ID,
              kind: "json",
              filename: "x.json",
              content_type: "application/json",
              size_bytes: 1,
              sha256: sha,
              created_at: timestamp,
              primary: true,
            },
          ]
        : [],
    );
  if (isDs13 && path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/artifacts/art-card/download`)
    return JSON.parse(readFileSync(join(ROOT, "tests/screens/fixtures/dataset-run-real-card.json"), "utf8"));
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/artifacts/art-brief/download` && isDs13)
    return { questions: [] };
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/artifacts/art-card/download`)
    return { ...ds6Card, variables: [...localCard.variables, ...ds6Card.variables] };
  if (path === `/projects/${PROJECT_ID}/runs/${DS6_RUN_ID}/artifacts/art-brief/download`) return ds6Brief;
  if (runScenario) {
    if (path === `/projects/${PROJECT_ID}/runs/${RUN_ID}`) return envelope(runItem());
    if (path === `/projects/${PROJECT_ID}/runs/${RUN_ID}/events`) return envelope(runEvents());
  }
  if (path === `/projects/${PROJECT_ID}/runners`)
    return envelope([
      nodeOffline
        ? { ...node, online: false, last_seen_at: "2026-11-11T12:00:00.000Z", pending_reviews: 0 }
        : nodeNoCap
          ? { ...node, capabilities: { ...node.capabilities, families: node.capabilities.families.slice(1) } }
          : (isDatasetLive || isDatasetStudio) && ds6Runs !== "review" && runScenario !== "review"
            ? { ...node, pending_reviews: 0 }
            : node,
    ]);
  if (path === `/projects/${PROJECT_ID}/runners/${NODE_ID}/releases`) return envelope(releases);
  if (path === "/datasets/file-types") return envelope(["text/csv", ".csv"]);
  return envelope({});
}

let backendRequests = 0;
const backendPaths = [];
const backend = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://mock.local");
  const path = url.pathname.replace(/^\/api\/v1/, "");
  artifactSchema = url.searchParams.get("schema");
  backendRequests += 1;
  backendPaths.push(path);
  const body = JSON.stringify(dataForPath(path));
  response.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  response.end(body);
});

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  return server.address().port;
}

function playwrightRequire() {
  const paths = process.env.PATH.split(process.platform === "win32" ? ";" : ":");
  const nodeModules = paths.map((entry) => resolve(entry, ".."));
  for (const base of nodeModules) {
    try {
      return createRequire(join(base, "playwright", "package.json"))("playwright");
    } catch {
      // Try the next npx-provided package location.
    }
  }
  throw new Error("Playwright package not found. Run through the documented npx --package command.");
}

async function waitForApp() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.status < 500) return;
    } catch {
      // The dev server may still be starting.
    }
    await delay(1000);
  }
  throw new Error(`Next.js did not become ready at ${BASE_URL}`);
}

async function appAlreadyRunning() {
  try {
    return (await fetch(BASE_URL)).status < 500;
  } catch {
    return false;
  }
}

function startDevServer(apiPort) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const bundler = TAG === "FE-DS4" || process.env.SCREENS_WEBPACK ? ["--webpack"] : [];
  return spawn(npm, ["run", "dev", "--", ...bundler, "--hostname", "127.0.0.1", "--port", PORT], {
    cwd: ROOT,
    env: { ...process.env, API_URL: `http://127.0.0.1:${apiPort}` },
    stdio: "inherit",
    windowsHide: true,
    shell: process.platform === "win32",
  });
}

async function stopDevServer(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

const isDs4 = TAG === "FE-DS4";
const isDs5 = TAG === "FE-DS5";
const isDs6 = TAG === "FE-DS6";
const isDs7 = TAG === "FE-DS7";
const isDs10 = TAG === "FE-DS10";
const isDs11 = TAG === "FE-DS11" || TAG === "FE-DS13";
const isDs13 = TAG === "FE-DS13";
const isDs8 = TAG.startsWith("FE-DS8") || isDs10;
const isDs9 = TAG === "FE-DS9";
const isRun1 = TAG === "FE-RUN1";
const isDatasetLive = TAG.startsWith("dataset-live-");
const isDatasetStudio = TAG === "dataset-studio";
const verifyDatasetLive = TAG === "dataset-live-after";
// E2E journey set: desktop light and mobile dark only, viewport captures.
const isE2e = TAG === "E2E";
const sizes = isRun1
  ? [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ]
  : isDs11
    ? [
        { name: "desktop", width: 1440, height: 900 },
        { name: "laptop", width: 1280, height: 800 },
        { name: "mobile", width: 390, height: 844 },
      ]
    : isDs4 || isDs5 || isE2e
      ? [
          { name: "desktop", width: 1440, height: 900 },
          { name: "tablet", width: 1100, height: 800 },
          { name: "mobile", width: 390, height: 844 },
        ]
      : [
          { name: "desktop", width: 1440, height: 900 },
          { name: "mobile", width: 390, height: 844 },
        ];
const themes = ["light", "dark"];

async function hideDialogCaptureControls(page) {
  await page.addStyleTag({
    content: `
      body:has([data-slot="dialog-content"]) nextjs-portal,
      body:has([data-slot="dialog-content"]) [data-capture-hidden="true"] {
        display: none !important;
      }
    `,
  });
  await page.evaluate(() => {
    for (const element of document.body.querySelectorAll("*")) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const inBottomCorner = rect.left <= 100 || rect.right >= window.innerWidth - 100;
      if (
        style.position === "fixed" &&
        rect.width >= 28 &&
        rect.width <= 100 &&
        rect.height >= 28 &&
        rect.height <= 100 &&
        rect.bottom >= window.innerHeight - 120 &&
        inBottomCorner
      )
        element.setAttribute("data-capture-hidden", "true");
    }
  });
}

async function verifyDatasetRunControls(page, scenario, width) {
  const workspace = page.getByRole("region", { name: /Dataset run/ });
  if (scenario === "cloud-question" || scenario === "dataset-accept") {
    const gate = workspace.getByRole("dialog");
    await gate.getByRole("button", { name: "Hide to look at the work" }).click();
    await gate.waitFor({ state: "hidden" });
    await workspace.getByRole("button", { name: "View", exact: true }).click();
    await gate.waitFor();
    await page.keyboard.press("Escape");
    await gate.waitFor({ state: "hidden" });
    return;
  }
  if (scenario !== "local-running") return;

  const track = workspace.getByRole("list", { name: "Steps of the Dataset stage" });
  await track.getByRole("button", { name: "Dictionary", exact: true }).click();
  const focused = workspace.locator("#dataset-focused-step");
  await focused.getByText("Write the dictionary", { exact: true }).waitFor();
  await focused.getByRole("button", { name: "Back to the current step" }).click();
  await focused.getByText("Check data quality", { exact: true }).waitFor();

  await workspace.getByRole("button", { name: "Stop", exact: true }).click();
  const confirm = page.getByRole("alertdialog", { name: /Stop RUN-/ });
  await confirm.getByRole("button", { name: "Cancel" }).click();

  let panel;
  if (width < 1024) {
    await workspace.getByRole("button", { name: "Steps and activity" }).click();
    panel = page.getByRole("dialog", { name: "Steps and activity" });
  } else {
    const toggle = workspace.getByRole("button", { name: "Show or hide the side panel" });
    panel = workspace.locator("aside");
    await toggle.click();
    await panel.waitFor({ state: "hidden" });
    await toggle.click();
  }
  await panel.getByRole("tab", { name: /Activity/ }).click();
  await panel
    .getByRole("tabpanel")
    .getByText(/Reading the file/)
    .waitFor();
  await panel.getByRole("tab", { name: "Now" }).click();
  await panel.getByRole("button", { name: /Rules the Dataset stage never bends/ }).click();
  await panel.getByText("Rows stay on the Local Node.", { exact: true }).waitFor();
  if (width < 1024) await page.keyboard.press("Escape");
}

async function expectExpandedStage(workspace, name) {
  const pipeline = workspace.getByRole("navigation", { name: "Pipeline stages" });
  await pipeline.getByRole("button", { name, exact: true, expanded: true }).waitFor();
  if ((await pipeline.locator("button[aria-expanded=true]").count()) !== 1) {
    throw new Error("Exactly one pipeline stage should be expanded");
  }
  return pipeline;
}

async function verifyStudioDataset(page, scenario) {
  if (scenario.tag === "dataset-deep-link") {
    const direct = page.getByRole("region", { name: /Dataset run/ });
    await direct.getByRole("link", { name: "Open in Run Studio" }).waitFor();
    await direct.getByRole("list", { name: "Steps of the Dataset stage" }).waitFor();
    return;
  }
  const workspace = page.getByRole("region", { name: /Research run/ });
  const pipeline = await expectExpandedStage(workspace, "Dataset");
  if (scenario.tag === "hypothesis-locked") {
    await pipeline.getByRole("button", { name: "Hypothesis", exact: true }).click();
    await expectExpandedStage(workspace, "Hypothesis");
    await pipeline.getByRole("list", { name: "Steps of the Hypothesis stage" }).waitFor();
  }
  if (scenario.tag === "dataset-accept")
    await workspace.getByRole("dialog", { name: "Accept the data card" }).waitFor();
  else await workspace.getByText(scenario.marker).locator("visible=true").first().waitFor();
  if (scenario.tag === "dataset-local-running") {
    const agent = workspace.locator("[data-dataset-agent]");
    await agent.waitFor();
    const overlaps = await agent.evaluate((chip) => {
      const label = [...chip.parentElement.children].find((item) => item.textContent === "Code check · no AI");
      if (!label) throw new Error("Code check label is missing");
      const a = chip.getBoundingClientRect();
      const b = label.getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    if (overlaps) throw new Error("Steward chip overlaps the code check label");
  }
  if (scenario.tag === "dataset-cloud-running") {
    await workspace.getByText("Commute and Service Access Survey", { exact: true }).first().waitFor();
    const track = pipeline.getByRole("list", { name: "Steps of the Dataset stage" });
    if (await track.getByRole("button", { name: "Release", exact: true }).count())
      throw new Error("Cloud has a release step");
    if (await workspace.getByText("Running on your Local Node", { exact: true }).count())
      throw new Error("Cloud is labelled as a Local Node run");
  }
  await page.waitForFunction(
    () => {
      const run = document.querySelector('section[aria-label^="Research run"]');
      return run && run.scrollWidth <= document.documentElement.clientWidth;
    },
    undefined,
    { timeout: 4000 },
  );
}

async function captureDatasetHandoff(page, size, theme) {
  const workspace = page.getByRole("region", { name: /Research run/ });
  const capture = async (tag) => {
    const path = `${tag}-${size.name}-${theme}.png`;
    await page.screenshot({ path: join(OUTPUT, path), animations: "disabled" });
    return path;
  };
  await workspace
    .getByRole("dialog", { name: "Accept the data card" })
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await workspace
    .getByText(/Hypothesis stage starting/)
    .first()
    .waitFor();
  await workspace.getByRole("dialog", { name: "Accept the data card" }).waitFor({ state: "hidden" });
  await expectExpandedStage(workspace, "Dataset");
  const handoff = await capture("dataset-handoff");

  await workspace.getByRole("heading", { name: "Scope the question" }).scrollIntoViewIfNeeded();
  const pipeline = await expectExpandedStage(workspace, "Hypothesis");
  await pipeline.getByRole("list", { name: "Steps of the Hypothesis stage" }).waitFor();
  const scope = await capture("hypothesis-scope");
  await pipeline.getByRole("button", { name: "Dataset", exact: true, expanded: false }).click();
  await expectExpandedStage(workspace, "Dataset");
  await workspace.getByRole("heading", { name: /^Dataset Stage/ }).waitFor();
  if ((await pipeline.getByRole("button", { name: "Hypothesis", exact: true }).getAttribute("aria-current")) !== "step")
    throw new Error("Hypothesis stopped being marked live during Dataset review");
  await workspace.getByRole("link", { name: "Open the Data card" }).waitFor();
  const steps = pipeline.getByRole("list", { name: "Steps of the Dataset stage" });
  const release = steps.getByRole("button", { name: "Release", exact: true });
  await release.waitFor();
  await page.waitForFunction(() => {
    const list = document.querySelector('[aria-label="Steps of the Dataset stage"]');
    const expanding = list?.parentElement?.parentElement;
    return expanding?.style.height === "auto";
  });
  const review = await capture("dataset-finished-review");
  await release.click();
  await workspace.getByText("Reviewed", { exact: true }).waitFor();
  let panel = workspace.locator("aside");
  if (size.width < 1024) {
    await workspace.getByRole("button", { name: "Steps and activity" }).click();
    panel = page.getByRole("dialog", { name: "Steps and activity" });
  }
  await panel.getByRole("tab", { name: /Activity/ }).click();
  await panel
    .getByRole("tabpanel")
    .getByText(/Review round 1/)
    .waitFor();
  return [handoff, scope, review];
}

async function capture() {
  const { chromium } = playwrightRequire();
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const names = [];
  try {
    for (const size of sizes) {
      if (process.env.SCREENS_SIZE && size.name !== process.env.SCREENS_SIZE) continue;
      for (const theme of themes) {
        if (isE2e && !((size.name === "desktop" && theme === "light") || (size.name === "mobile" && theme === "dark")))
          continue;
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          colorScheme: theme,
          ...(isDatasetStudio && theme === "dark" ? { reducedMotion: "reduce" } : {}),
        });
        const page = await context.newPage();
        await context.addCookies([
          { name: "platform_session", value: "fe-s0-session", url: BASE_URL, httpOnly: true, sameSite: "Lax" },
          { name: "theme_mode", value: theme, url: BASE_URL, sameSite: "Lax" },
        ]);
        await page.route("**/api/v1/**", async (route) => {
          const url = new URL(route.request().url());
          artifactSchema = url.searchParams.get("schema");
          if (
            studioDataset === "accept" &&
            url.pathname.endsWith(`/runs/${DS6_RUN_ID}/stages/stage-1/accept`) &&
            route.request().method() === "POST"
          ) {
            studioAccepted = true;
            await route.fulfill({ json: envelope({ status: "ACCEPTED" }) });
            return;
          }
          const body = dataForPath(url.pathname.replace(/^\/api\/v1/, ""));
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
        });

        const common = `projects/${PROJECT_ID}`;
        const studioRoutes = [
          { tag: "dataset-local-running", runs: "running", studio: "local", marker: "Running on your Local Node" },
          {
            tag: "hypothesis-locked",
            runs: "running",
            studio: "local",
            marker: "Starts after the Dataset stage is accepted",
          },
          { tag: "dataset-release-wait", runs: "review", studio: "release", marker: /Waiting for release review/ },
          { tag: "dataset-accept", runs: "done", studio: "accept", accept: true, marker: "Accept the data card" },
          { tag: "dataset-cloud-running", runs: "running", studio: "cloud", marker: "Check data quality" },
        ]
          .map((item) => ({ ...item, url: `${common}/experiments?run=${DS6_RUN_ID}` }))
          .concat([
            {
              tag: "dataset-deep-link",
              runs: "running",
              studio: null,
              url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
            },
          ]);
        const datasetLiveRoutes = [
          { tag: "local-running", marker: /Reading the file/, runs: "running" },
          { tag: "local-release", marker: /Waiting for release review/, runs: "review" },
          { tag: "local-offline", marker: /Waiting for the Local Node/, runs: "offline", offline: true },
          { tag: "local-done", marker: /Hypothesis next/, runs: "done" },
          { tag: "cloud-replay", marker: /Write the dictionary/, runs: "running", ds8: 12 },
          { tag: "cloud-question", marker: /Link the question/, runs: "running", ds8: 29 },
          { tag: "dataset-accept", marker: /Dataset stage outcome/, runs: "review", ds8: 275, accept: true },
        ]
          .map((item) => ({
            ...item,
            url: `${common}/datasets/${item.tag.startsWith("local") ? "local" : "remote"}-dataset/runs/${DS6_RUN_ID}`,
          }))
          .concat([{ tag: "research-stage", url: `${common}/experiments?run=${RUN_ID}`, run: "review" }]);
        const routes = isRun1
          ? [
              { tag: "launcher-no-dataset", url: `${common}/experiments` },
              {
                tag: "launcher-local-offline",
                url: `${common}/experiments?dataset_id=local-dataset&dataset_version_id=local-v3#start-run`,
                offline: true,
              },
              { tag: "dataset-local-cta", url: `${common}/datasets/local-dataset` },
            ]
          : isE2e
            ? [
                { tag: "datasets-cards", url: `${common}/datasets`, view: "Cards" },
                { tag: "dataset-local-workspace", url: `${common}/datasets/local-dataset` },
                { tag: "dataset-remote-workspace", url: `${common}/datasets/remote-dataset` },
                { tag: "dataset-history", url: `${common}/datasets/local-dataset`, history: true },
              ]
            : isDs11
              ? [
                  { tag: "dataset-profile", url: `${common}/datasets/local-dataset` },
                  { tag: "dataset-profile-open", url: `${common}/datasets/local-dataset`, open: "v1" },
                  { tag: "dataset-review", url: `${common}/datasets/local-dataset?view=review`, runs: "done" },
                  { tag: "dataset-versions", url: `${common}/datasets/local-dataset?view=versions` },
                  {
                    tag: "dataset-accept",
                    url: `${common}/datasets/local-dataset?view=review`,
                    runs: "review",
                    accept: true,
                  },
                  {
                    tag: "dataset-launcher",
                    url: `${common}/datasets/local-dataset?view=review`,
                    runs: "review",
                    accept: true,
                    expand: "Run the stage again",
                  },
                ]
              : isDs10
                ? [
                    { tag: "stage-outcome", runs: "review", marker: /cannot hand off yet/ },
                    {
                      tag: "stage-outcome-minimized",
                      runs: "review",
                      marker: /Accept the Dataset stage/,
                      minimize: true,
                    },
                    { tag: "stage-accepted", runs: "done", marker: /Hypothesis next/ },
                  ].map((r) => ({
                    ...r,
                    ds8: 275,
                    url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                  }))
                : isDs9
                  ? [
                      { tag: "import-files", url: `${common}/datasets` },
                      { tag: "import-connection", url: `${common}/datasets?mode=connection` },
                      { tag: "import-local", url: `${common}/datasets?mode=local` },
                    ]
                  : isDs8
                    ? [
                        ["running", 6, /20 s so far/],
                        ["checks", 12, /Write the dictionary/],
                        ["describing", 22, /Check data quality|Passed/],
                        ["gate", 29, /Confirm what a model said/],
                      ]
                        .map(([name, upto, marker]) => ({
                          tag: `dataset-run-${name}`,
                          url: `${common}/datasets/remote-dataset/runs/${DS6_RUN_ID}`,
                          runs: "running",
                          ds8: upto,
                          marker,
                        }))
                        .concat(
                          [
                            {
                              tag: "dataset-run-gate-minimized",
                              ds8: 29,
                              marker: /Confirm what a model said/,
                              minimize: true,
                            },
                            {
                              tag: "dataset-run-question",
                              ds8: 29,
                              marker: /Link the question/,
                              step: "Link the question",
                            },
                            {
                              tag: "dataset-run-quality",
                              ds8: 12,
                              marker: /Check data quality/,
                              step: "Check data quality",
                            },
                          ].map((r) => ({
                            ...r,
                            url: `${common}/datasets/remote-dataset/runs/${DS6_RUN_ID}`,
                            runs: "running",
                          })),
                        )
                        .concat([
                          {
                            tag: "dataset-run-release-review",
                            url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                            runs: "review",
                            marker: /Release gate/,
                          },
                        ])
                    : isDs7
                      ? [
                          {
                            tag: "dataset-run-profiling",
                            url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                            runs: "running",
                          },
                          {
                            tag: "dataset-run-waiting-release",
                            url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                            runs: "review",
                          },
                          {
                            tag: "dataset-run-node-offline",
                            url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                            runs: "offline",
                            offline: true,
                          },
                          {
                            tag: "dataset-run-done",
                            url: `${common}/datasets/local-dataset/runs/${DS6_RUN_ID}`,
                            runs: "done",
                          },
                          {
                            tag: "run-studio-waiting-node",
                            url: `${common}/experiments?run=${RUN_ID}`,
                            offline: true,
                            run: "offline",
                          },
                          {
                            tag: "run-studio-waiting-review",
                            url: `${common}/experiments?run=${RUN_ID}`,
                            run: "review",
                          },
                        ]
                      : isDs6
                        ? [
                            { tag: "stage-empty", url: `${common}/datasets/local-dataset`, view: "Dataset stage" },
                            { tag: "card-empty", url: `${common}/datasets/local-dataset`, view: "Data card" },
                            {
                              tag: "stage-running",
                              url: `${common}/datasets/local-dataset`,
                              view: "Dataset stage",
                              runs: "running",
                            },
                            {
                              tag: "stage-waiting-approval",
                              url: `${common}/datasets/local-dataset`,
                              view: "Dataset stage",
                              runs: "review",
                            },
                            {
                              tag: "stage-node-offline",
                              url: `${common}/datasets/local-dataset`,
                              view: "Dataset stage",
                              offline: true,
                            },
                            {
                              tag: "stage-no-capability",
                              url: `${common}/datasets/local-dataset`,
                              view: "Dataset stage",
                              nocap: true,
                            },
                            {
                              tag: "card-done",
                              url: `${common}/datasets/local-dataset`,
                              view: "Data card",
                              runs: "done",
                            },
                          ]
                        : isDs4
                          ? [
                              { tag: "dataset-remote-workspace", url: `${common}/datasets/remote-dataset` },
                              { tag: "dataset-local-workspace", url: `${common}/datasets/local-dataset` },
                            ]
                          : isDs5
                            ? [
                                { tag: "datasets-cards", url: `${common}/datasets`, view: "Cards" },
                                { tag: "datasets-table", url: `${common}/datasets`, view: "Table" },
                                { tag: "datasets-empty", url: `${common}/datasets`, view: "Cards", empty: true },
                              ]
                            : [
                                { tag: "dataset-library", url: `${common}/datasets` },
                                { tag: "dataset-remote-version", url: `${common}/datasets/remote-dataset` },
                                { tag: "dataset-local-data-card", url: `${common}/datasets/local-dataset` },
                                {
                                  tag: "dataset-remote-version-timeline",
                                  url: `${common}/datasets/remote-dataset`,
                                  history: true,
                                },
                                {
                                  tag: "dataset-local-version-timeline",
                                  url: `${common}/datasets/local-dataset`,
                                  history: true,
                                },
                                {
                                  tag: "dataset-superseded-version",
                                  url: `${common}/datasets/remote-dataset`,
                                  superseded: true,
                                },
                                {
                                  tag: "settings-local-nodes-stale-release",
                                  url: `${common}/settings?tab=local-nodes`,
                                  releases: true,
                                },
                                {
                                  tag: "settings-local-nodes-offline",
                                  url: `${common}/settings?tab=local-nodes`,
                                  offline: true,
                                },
                                {
                                  tag: "run-studio-waiting-node",
                                  url: `${common}/experiments?run=${RUN_ID}`,
                                  offline: true,
                                  run: "offline",
                                },
                                {
                                  tag: "run-studio-waiting-review",
                                  url: `${common}/experiments?run=${RUN_ID}`,
                                  run: "review",
                                },
                              ];
        for (const item of isDatasetStudio ? studioRoutes : isDatasetLive ? datasetLiveRoutes : routes) {
          if (ONLY && !ONLY.includes(item.tag)) continue;
          forceEmptyDatasets = isDs5 && item.empty === true;
          nodeOffline = item.offline === true;
          runScenario = item.run ?? null;
          ds6Runs = item.runs ?? "none";
          ds8Upto = item.ds8 ?? 0;
          ds6Accept = item.accept === true;
          studioDataset = item.studio ?? null;
          studioAccepted = false;
          nodeNoCap = item.nocap === true;
          let response;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            response = await page.goto(`${BASE_URL}/${item.url}`, {
              waitUntil: isRun1 ? "domcontentloaded" : "networkidle",
              timeout: isDs4 || process.env.SCREENS_WEBPACK ? 240_000 : 60_000,
            });
            if (response && response.status() < 400) break;
            await page.waitForTimeout(750 * (attempt + 1));
          }
          if (!response || response.status() >= 400)
            throw new Error(
              `${item.tag} returned ${response?.status() ?? "no response"} after ${backendRequests} API requests: ${backendPaths.join(", ")}`,
            );
          await page.waitForFunction(
            (expectedTheme) =>
              document.documentElement.getAttribute("data-theme-mode") === expectedTheme &&
              document.documentElement.classList.contains("dark") === (expectedTheme === "dark"),
            theme,
            { timeout: 10_000 },
          );
          const themeApplied = await page.evaluate(
            (expectedTheme) => ({
              mode: document.documentElement.getAttribute("data-theme-mode"),
              darkClass: document.documentElement.classList.contains("dark"),
              expectedDark: expectedTheme === "dark",
            }),
            theme,
          );
          if (themeApplied.mode !== theme || themeApplied.darkClass !== themeApplied.expectedDark) {
            throw new Error(
              `${item.tag}: expected ${theme} theme, got mode=${themeApplied.mode}, dark=${themeApplied.darkClass}`,
            );
          }
          if (!isDatasetLive && !isDatasetStudio)
            await page
              .getByRole("heading", {
                name: /Commute and Service Access Survey|Neighborhood Travel Diary|Datasets|Local Nodes|Version history/,
              })
              .first()
              .waitFor({ timeout: 20_000 })
              .catch(() => {
                // Some routes do not expose a matching page heading.
              });
          if (item.superseded) {
            await page.getByRole("button", { name: "History" }).click();
            await page.getByRole("button", { name: "Show version 1 in the preview" }).click();
            // The first match can sit in a hidden copy of the version list; wait for a visible one.
            await page.getByText("Superseded by v2").locator("visible=true").first().waitFor({ timeout: 10_000 });
          }
          if (item.history) {
            await page.getByRole("button", { name: "History" }).click();
            await page.getByRole("button", { name: "Show version 1 in the preview" }).waitFor({ timeout: 10_000 });
          }
          if (item.run) {
            // The run opens in its workspace from `?run=`; wait for the message the state is about.
            await page
              .getByText(
                item.run === "offline"
                  ? "Waiting for the Local Node."
                  : "Waiting for release review on the Local Node.",
              )
              .locator("visible=true")
              .first()
              .waitFor({ timeout: 30_000 });
          }
          if (isDatasetLive && item.marker) {
            const workspace = page.getByRole("region", { name: /Dataset run/ });
            await workspace.getByText(item.marker).locator("visible=true").first().waitFor({ timeout: 30_000 });
            const fitsViewport = await workspace.evaluate(
              (element) => element.scrollWidth <= document.documentElement.clientWidth,
            );
            if (!fitsViewport) throw new Error(`${item.tag}: Dataset workspace overflows the viewport`);
            if (verifyDatasetLive && ["cloud-question", "dataset-accept"].includes(item.tag)) {
              await workspace.getByRole("dialog").waitFor();
            }
          }
          if (isDatasetStudio) await verifyStudioDataset(page, item);
          if (isRun1) {
            if (item.tag === "dataset-local-cta") {
              await page.getByText("Use in a research run").first().waitFor({ timeout: 30_000 });
              await page
                .getByText(
                  "Start a research run with this dataset. Your Local Node will run the Dataset stage on your computer.",
                )
                .waitFor({ timeout: 30_000 });
            }
            if (item.tag === "launcher-no-dataset") {
              await page.getByRole("combobox", { name: "Dataset" }).waitFor({ timeout: 30_000 });
              await page.getByText("No dataset").first().waitFor({ timeout: 30_000 });
            }
            if (item.tag === "launcher-local-offline") {
              await page.getByText("The run will wait for your Local Node.").waitFor({ timeout: 30_000 });
            }
          }
          if (isDs11) {
            await page.getByText("Neighborhood Travel Diary").first().waitFor({ timeout: 60_000 });
            if (item.expand) await page.locator("summary", { hasText: item.expand }).first().click();
            if (item.open)
              await page
                .getByRole("button", { name: new RegExp(`^${item.open}`) })
                .first()
                .click();
            await page.waitForTimeout(1500);
          }
          if (isDs9) {
            // The new bar at HEAD does not exist; both trees wait for the library to load.
            await page.getByText("Commute and Service Access Survey").first().waitFor({ timeout: 60_000 });
            await page.waitForTimeout(500);
          }
          if (isDs8) {
            await page.getByRole("region", { name: /Dataset run/ }).waitFor({ timeout: 30_000 });
            await page.getByText(item.marker).locator("visible=true").first().waitFor({ timeout: 30_000 });
            if (item.minimize || item.step)
              await page
                .getByRole("button", { name: /Hide to look at the work/ })
                .click({ timeout: 3000 })
                .catch(() => undefined);
            if (item.step)
              await page
                .getByRole("button", { name: new RegExp(item.step) })
                .last()
                .click();
            await page.waitForTimeout(1800);
          }
          if (isDs7 && item.url.includes("/runs/")) {
            await page.getByRole("region", { name: /Dataset run/ }).waitFor({ timeout: 30_000 });
            await page
              .getByText(
                {
                  "dataset-run-profiling": /Reading the file/,
                  "dataset-run-waiting-release": /Waiting for release review/,
                  "dataset-run-node-offline": /Waiting for the Local Node/,
                  "dataset-run-done": /Data card ready/,
                }[item.tag],
              )
              .locator("visible=true")
              .first()
              .waitFor({ timeout: 30_000 });
          }
          if (isDs6) {
            await page
              .getByRole("tab", { name: item.view, exact: true })
              .click({ timeout: 20_000 })
              .catch(async (error) => {
                await page.screenshot({ path: join(OUTPUT, `debug-${item.tag}.png`) });
                throw error;
              });
            const marker = {
              "stage-empty": "Run dataset stage",
              "card-empty": "No data card for v3 yet",
              "card-done": "Does access to services explain commute time?",
            }[item.tag];
            await page
              .getByText(marker ?? /Waiting|In progress|offline|cannot build|approval/i)
              .locator("visible=true")
              .first()
              .waitFor({ timeout: 20_000 });
          }
          if (item.releases) {
            await page.getByRole("button", { name: "Release log" }).click();
            await page.getByText("Stale", { exact: true }).first().waitFor({ timeout: 10_000 });
          }
          if ((isDs5 && !item.empty) || (isE2e && item.view))
            await page.getByRole("button", { name: item.view, exact: true }).click();
          await page.waitForTimeout(350);
          if (isDs4 && item.tag.includes("remote")) {
            await page.waitForFunction(
              () =>
                [...document.querySelectorAll('button[data-column-kind="number"]')].some((button) =>
                  button.textContent?.includes("commute_minutes"),
                ),
              undefined,
              { timeout: 10_000 },
            );
          }
          await page.addStyleTag({
            content: `
              nextjs-portal,
              [data-capture-hidden="true"] {
                display: none !important;
              }
            `,
          });
          await page.evaluate(() => {
            const floatingBottomRight = [...document.body.querySelectorAll("*")]
              .filter((element) => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return (
                  style.position === "fixed" &&
                  rect.width >= 28 &&
                  rect.width <= 100 &&
                  rect.height >= 28 &&
                  rect.height <= 100 &&
                  rect.right >= window.innerWidth - 100 &&
                  rect.bottom >= window.innerHeight - 100
                );
              })
              .sort(
                (a, b) =>
                  a.getBoundingClientRect().width * a.getBoundingClientRect().height -
                  b.getBoundingClientRect().width * b.getBoundingClientRect().height,
              )[0];
            floatingBottomRight?.setAttribute("data-capture-hidden", "true");
          });
          const filename = `${item.tag}-${size.name}-${theme}.png`;
          await page.screenshot({
            path: join(OUTPUT, filename),
            fullPage: !isDs4 && !isDs5 && !isE2e && !isDatasetStudio,
            animations: "disabled",
          });
          names.push(filename);
          if (verifyDatasetLive) await verifyDatasetRunControls(page, item.tag, size.width);
          if (isDatasetStudio && item.tag === "dataset-accept") {
            names.push(...(await captureDatasetHandoff(page, size, theme)));
          }
          if (isDs4 && item.tag.includes("remote")) {
            const selected = "dataset-remote-selected-column";
            await page
              .getByRole("button", { name: /commute_minutes/ })
              .first()
              .click();
            const inferredColumn =
              size.width >= 1280
                ? page.getByText("Number · inferred from preview", { exact: true })
                : page.getByText(/commute_minutes · Number · inferred from preview/);
            await inferredColumn.waitFor({ timeout: 10_000 });
            await page.screenshot({
              path: join(OUTPUT, `${selected}-${size.name}-${theme}.png`),
              fullPage: false,
              animations: "disabled",
            });
            names.push(`${selected}-${size.name}-${theme}.png`);
          }
        }
        if (isE2e) {
          // Add data: two files read in the browser, as in the default capture.
          const addPage = await page.goto(`${BASE_URL}/projects/${PROJECT_ID}/datasets`, {
            waitUntil: "networkidle",
            timeout: 60_000,
          });
          if (!addPage || addPage.status() >= 400) throw new Error("dataset-add-data returned an error");
          // The source tiles replaced the single drop button; "Upload files" opens the dialog.
          await page.getByRole("button", { name: /Upload files/ }).click();
          await hideDialogCaptureControls(page);
          await page
            .getByLabel("Choose CSV or Excel files")
            .setInputFiles([
              join(ROOT, "tests/screens/fixtures/commute-preview.csv"),
              join(ROOT, "tests/screens/fixtures/mobility-sheets.xlsx"),
            ]);
          await page.getByRole("button", { name: /Stations ~/ }).waitFor({ timeout: 20_000 });
          const addName = `dataset-add-data-${size.name}-${theme}.png`;
          await page.screenshot({ path: join(OUTPUT, addName), fullPage: false, animations: "disabled" });
          names.push(addName);
          await context.close();
          continue;
        }
        if (isDs4 || isDs6 || isDs7 || isDatasetLive || isDatasetStudio || ONLY) {
          await context.close();
          continue;
        }
        if (isDs5) {
          await context.close();
          continue;
        }
        const datasetPage = await page.goto(`${BASE_URL}/projects/${PROJECT_ID}/datasets`, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        if (!datasetPage || datasetPage.status() >= 400) throw new Error("dataset-add-dialog returned an error");
        // The source tiles replaced the single drop button; "Upload files" opens the dialog.
        const openAddData = async () => page.getByRole("button", { name: /Upload files/ }).click();
        await openAddData();
        await hideDialogCaptureControls(page);
        await page
          .getByLabel("Choose CSV or Excel files")
          .setInputFiles([
            join(ROOT, "tests/screens/fixtures/commute-preview.csv"),
            join(ROOT, "tests/screens/fixtures/mobility-sheets.xlsx"),
          ]);
        await page.getByRole("button", { name: /Stations ~/ }).waitFor({ timeout: 20_000 });
        await page.getByRole("button", { name: /Weather ~/ }).waitFor({ timeout: 20_000 });
        const filesPreview = `dataset-add-files-${size.name}-${theme}.png`;
        await page.screenshot({ path: join(OUTPUT, filesPreview), fullPage: true, animations: "disabled" });
        names.push(filesPreview);

        await page.keyboard.press("Escape");
        await page.goto(`${BASE_URL}/projects/${PROJECT_ID}/datasets`, { waitUntil: "networkidle", timeout: 60_000 });
        await openAddData();
        await hideDialogCaptureControls(page);
        await page
          .getByLabel("Choose CSV or Excel files")
          .setInputFiles(join(ROOT, "tests/screens/fixtures/broken.xlsx"));
        await page.getByText("The file is empty.", { exact: true }).waitFor({ timeout: 20_000 });
        const filesError = `dataset-add-error-${size.name}-${theme}.png`;
        await page.screenshot({ path: join(OUTPUT, filesError), fullPage: true, animations: "disabled" });
        names.push(filesError);

        await page.waitForTimeout(5_000);
        await page.getByRole("tab", { name: "Connection" }).click();
        await page.getByText("Import from a connected source").waitFor({ timeout: 10_000 });
        const connectionTab = `dataset-add-connection-${size.name}-${theme}.png`;
        await page.screenshot({ path: join(OUTPUT, connectionTab), fullPage: true, animations: "disabled" });
        names.push(connectionTab);

        await page.getByRole("tab", { name: "Local Node" }).click();
        await page.getByRole("heading", { name: "Must the rows stay on your computer?" }).waitFor({ timeout: 10_000 });
        const localNodeTab = `dataset-add-local-node-${size.name}-${theme}.png`;
        await page.screenshot({ path: join(OUTPUT, localNodeTab), fullPage: true, animations: "disabled" });
        names.push(localNodeTab);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const expected = isDatasetStudio
    ? 36
    : isDatasetLive
      ? 32
      : isRun1
        ? 12
        : isE2e
          ? 10
          : isDs4
            ? 18
            : isDs5
              ? 18
              : isDs6
                ? 28
                : isDs7
                  ? 24
                  : 56;
  if (!ONLY && names.length !== expected) throw new Error(`Expected ${expected} screenshots, wrote ${names.length}`);
  if (isDs4) {
    for (const size of sizes) {
      for (const theme of themes) {
        const base = await readFile(join(OUTPUT, `dataset-remote-workspace-${size.name}-${theme}.png`));
        const selected = await readFile(join(OUTPUT, `dataset-remote-selected-column-${size.name}-${theme}.png`));
        if (createHash("sha256").update(base).digest("hex") === createHash("sha256").update(selected).digest("hex")) {
          throw new Error(`Remote selected-column screenshot matches workspace: ${size.name}-${theme}`);
        }
      }
    }
  }
  console.log(`Captured ${names.length} route screenshots in ${OUTPUT}`);
  for (const name of names) console.log(`- test-results/screens/${TAG}/${name}`);
}

const ownServer = !(await appAlreadyRunning());
let child;
let apiPort;
try {
  apiPort = await listen(backend);
  if (ownServer) {
    child = startDevServer(apiPort);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) console.error(`Next.js dev server exited with code ${code}`);
    });
  }
  await waitForApp();
  await capture();
  if (backendRequests === 0 && ownServer) throw new Error("The local mock API received no server-side requests");
} finally {
  await stopDevServer(child);
  await new Promise((resolveClose) => backend.close(resolveClose));
}
