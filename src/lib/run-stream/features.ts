// What a run covers for now. The run focuses on Popper's pipeline stages 1 to 9: from a topic to hypotheses and their map.

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
 * The map stage after the hypotheses (Popper's stage 9): the run drawn as a semantic graph (layered canvas and ego
 * graph) and a research canvas.
 */
export const SHOW_MAP_STAGE = true;
