import { describe, expect, it } from "vitest";

import { type LivePanelEntry, livePanelOf, publishLivePanel } from "./live-panel";
import { pickStep } from "./live-run-card";
import { usedIn } from "./live-steps";
import { known, nameOf } from "./live-ui";
import { pickArtifact } from "./use-live-input";

const item = (id: string, created_at: string, stage_run_id: string | null) =>
  ({ id, created_at, stage_run_id }) as Parameters<typeof pickArtifact>[0][number];

describe("live run card helpers", () => {
  it("picks the newest artifact of the stage attempt, or of any stage when unscoped", () => {
    const list = [item("a", "1", "s1"), item("b", "2", "s2"), item("c", "3", "s1")];
    expect(pickArtifact(list, "s1", true)?.id).toBe("c");
    expect(pickArtifact(list, "s1", false)?.id).toBe("c");
    expect(pickArtifact(list, "s3", true)).toBeUndefined();
  });
  it("shows the asked step, else the first one not complete", () => {
    const views = { design_work: { progress: 1 }, design_review: { progress: 0 }, design_accept: { progress: 0 } };
    const keys = ["design_work", "design_review", "design_accept"] as const;
    expect(pickStep(keys, views, "design_accept")).toBe("design_accept");
    expect(pickStep(keys, views, null)).toBe("design_review");
  });
  it("lists earlier findings that name the step as a consumer", () => {
    const used = usedIn("design_work", {
      fitness: {
        findings: [
          { kind: "note", text: "x", usedBy: ["design_work"] },
          { kind: "ok", text: "y", usedBy: [] },
        ],
      },
    });
    expect(used.map((f) => f.text)).toEqual(["x"]);
  });
  it("reads known structure by source and drops the type and role from a variable label", () => {
    const step = {
      structure: [
        { label: "score · number · outcome", source: "dataset.snapshot/v1 dictionary" },
        { label: "Range", source: "dataset.snapshot/v1 data_checks" },
        { label: "Range", source: "dataset.snapshot/v1 data_checks" },
      ],
    };
    expect(known(step, /dictionary/)).toEqual(["score · number · outcome"]);
    expect(known(step, /data_checks/)).toEqual(["Range"]);
    expect(nameOf("score · number · outcome")).toBe("score");
  });
  it("lets a stage's live card publish its side panel and withdraws only its own entry", () => {
    const entry: LivePanelEntry = {
      panel: { now: { title: "t", explanation: "e" }, substeps: [], nextStop: null, rules: [] },
      stage: "Dataset stage",
      position: 1,
      count: 11,
      actor: "steward",
    };
    const stop = publishLivePanel("dataset", entry);
    const later = publishLivePanel("dataset", { ...entry, position: 2 });
    stop();
    expect(livePanelOf("dataset")?.position).toBe(2);
    later();
    expect(livePanelOf("dataset")).toBeUndefined();
  });
});
