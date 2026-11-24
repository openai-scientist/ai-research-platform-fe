/**
 * Why a Local run's claim stays inconclusive. On a Local Node, Logos never receives an independent recomputation: it
 * sets the second path to "unproven" right after the main estimate, so the claim assessment reads inconclusive with
 * the code `not_computed` even when the statistical verdict is supported. Said plainly, next to the claim, and apart
 * from the freshness reason. Read from fields, never from prose; nothing about a verdict is changed.
 */

export const LOCAL_RECOMPUTE_NOTICE =
  "Local runs have no independent recomputation yet, so the claim cannot be confirmed here. The statistical result above still stands.";

/** A claim that waits for a second computation reads one of these. */
const WAITING_CLAIM = new Set(["inconclusive", "not_computed"]);
/** The second path as the evidence records spell it, and as the package manifest does. Only a Local run is left here. */
const UNPROVEN_SECOND_PATH = new Set(["unproven", "not run"]);

export interface ClaimBasis {
  /** The claim assessment value. */
  claim?: string | null;
  /** The assessment codes; `not_computed` marks a missing recomputation. Checked only when given. */
  codes?: readonly string[] | null;
  /** The second path status of the main result (`second_path`), or the manifest's `second_computation`. */
  secondPath?: string | null;
  /** Whether the run is known to have run on a Local Node. `false` rules the notice out; unknown relies on the status. */
  local?: boolean;
}

/** The plain explanation when this claim is inconclusive only for lack of a recomputation on a Local Node, else null. */
export function localRecomputeNotice(basis: ClaimBasis): string | null {
  if (basis.local === false) return null;
  if (!basis.claim || !WAITING_CLAIM.has(basis.claim)) return null;
  if (!basis.secondPath || !UNPROVEN_SECOND_PATH.has(basis.secondPath)) return null;
  if (basis.codes && !basis.codes.includes("not_computed")) return null;
  return LOCAL_RECOMPUTE_NOTICE;
}
