import { describe, expect, it } from "vitest";

import { describeRuns } from "./run-breakdown";

describe("describeRuns", () => {
  it("lists the statuses that occur, most active first", () => {
    expect(describeRuns({ completed: 5, running: 2 })).toBe("2 running, 5 completed");
    expect(describeRuns({ stopped: 5, paused: 1, failed: 3 })).toBe("1 paused, 3 failed, 5 stopped");
  });

  it("words the less obvious statuses plainly", () => {
    expect(describeRuns({ awaiting_review: 1, budget_exceeded: 2 })).toBe("1 awaiting review, 2 over budget");
  });

  it("returns null when there are no runs, and keeps a status it does not know", () => {
    expect(describeRuns({})).toBeNull();
    expect(describeRuns({ running: 0 })).toBeNull();
    expect(describeRuns({ archived_run: 2 } as never)).toBe("2 archived run");
  });
});
