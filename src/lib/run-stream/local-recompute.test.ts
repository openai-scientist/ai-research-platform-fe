import { describe, expect, it } from "vitest";

import { LOCAL_RECOMPUTE_NOTICE, localRecomputeNotice } from "./local-recompute";
import { plainNote } from "./plain-notes";

describe("localRecomputeNotice", () => {
  it("explains an inconclusive claim whose second path is unproven (RUN-D953 record)", () => {
    expect(localRecomputeNotice({ claim: "inconclusive", codes: ["not_computed"], secondPath: "unproven" })).toBe(
      LOCAL_RECOMPUTE_NOTICE,
    );
  });

  it("explains the package manifest's 'not run' second computation", () => {
    expect(localRecomputeNotice({ claim: "inconclusive", codes: ["not_computed"], secondPath: "not run" })).toBe(
      LOCAL_RECOMPUTE_NOTICE,
    );
  });

  it("says nothing when a recomputation agreed or differed", () => {
    expect(localRecomputeNotice({ claim: "inconclusive", codes: ["not_computed"], secondPath: "equal" })).toBeNull();
    expect(localRecomputeNotice({ claim: "inconclusive", codes: ["not_computed"], secondPath: "agreed" })).toBeNull();
  });

  it("says nothing for a supported claim or another reason for inconclusive", () => {
    expect(localRecomputeNotice({ claim: "supported", codes: [], secondPath: "unproven" })).toBeNull();
    expect(localRecomputeNotice({ claim: "inconclusive", codes: ["not_fresh"], secondPath: "unproven" })).toBeNull();
  });

  it("is ruled out when the run is known not to be local, and works when codes are absent", () => {
    expect(
      localRecomputeNotice({ claim: "inconclusive", codes: ["not_computed"], secondPath: "unproven", local: false }),
    ).toBeNull();
    expect(localRecomputeNotice({ claim: "inconclusive", secondPath: "unproven" })).toBe(LOCAL_RECOMPUTE_NOTICE);
    expect(localRecomputeNotice({})).toBeNull();
  });

  it("is worded apart from the freshness reason", () => {
    const fresh = plainNote("the claim is not fresh: 1 earlier run on this file already saw its result");
    expect(fresh).toContain("second look");
    expect(LOCAL_RECOMPUTE_NOTICE).not.toContain("second look");
    expect(LOCAL_RECOMPUTE_NOTICE).toMatch(
      /^Local runs have no independent recomputation yet, so the claim cannot be confirmed here\./,
    );
    expect(LOCAL_RECOMPUTE_NOTICE).toMatch(/The statistical result above still stands\.$/);
  });
});
