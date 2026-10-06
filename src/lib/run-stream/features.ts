// What a run covers for now. The run focuses on Popper's pipeline stages 1 to 8: from a topic to hypotheses.

/** The data check and clean stage, and the dataset step when starting a run. */
export const SHOW_DATA_STAGE = false;

/** Asking how often to stop when starting a run. When hidden, runs use Copilot. */
export const SHOW_REVIEW_MODE = false;

/**
 * Where a run ends. `hypotheses` ends it once the first set of hypotheses is picked (pipeline stage 8);
 * `paper` runs experiments, the report and the paper too.
 */
export const RUN_ENDS_AT: "hypotheses" | "paper" = "hypotheses";

/**
 * Where runs come from. `mock` plays a scripted run in the browser; `api` starts and follows real runs on the
 * backend. Set `NEXT_PUBLIC_RUN_STREAM_SOURCE=api` once the backend serves run events.
 */
export const RUN_SOURCE: "mock" | "api" = process.env.NEXT_PUBLIC_RUN_STREAM_SOURCE === "api" ? "api" : "mock";
