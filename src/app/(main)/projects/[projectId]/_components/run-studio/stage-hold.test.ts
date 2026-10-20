import { describe, expect, it } from "vitest";

import { MAX_HOLD_MS, mayMoveOn, QUIET_MS } from "./stage-hold";

describe("mayMoveOn", () => {
  const at = { busy: 0, quietMs: QUIET_MS, heldMs: 0, hidden: false };

  it("waits while text is still typing, even when nothing new arrives", () => {
    expect(mayMoveOn({ ...at, busy: 1, quietMs: 5000 })).toBe(false);
  });

  it("waits for the last change to settle", () => {
    expect(mayMoveOn({ ...at, quietMs: QUIET_MS - 1 })).toBe(false);
    expect(mayMoveOn(at)).toBe(true);
  });

  it("never holds a finished stage past the limit, or while nobody watches", () => {
    expect(mayMoveOn({ ...at, busy: 2, quietMs: 0, heldMs: MAX_HOLD_MS })).toBe(true);
    expect(mayMoveOn({ ...at, busy: 2, quietMs: 0, hidden: true })).toBe(true);
  });
});
