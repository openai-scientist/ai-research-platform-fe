import { describe, expect, it } from "vitest";

import type { GateOption } from "./contract";
import { stageChoices } from "./stage-choices";

const accept: GateOption = {
  id: "accept",
  label: "Accept",
  description: "",
  leads_to: "Next",
  confirm_label: "Accept",
  recommended: true,
};
const sendBack: GateOption = {
  id: "send_back",
  label: "Send back with a note",
  description: "",
  leads_to: "Again",
  confirm_label: "Send back",
  needsText: true,
};

describe("stageChoices", () => {
  it("lists every advertised option, with the recommended one primary", () => {
    const choices = stageChoices({ options: [accept, sendBack] });
    expect(choices.map((c) => c.id)).toEqual(["accept", "send_back"]);
    expect(choices.map((c) => c.primary)).toEqual([true, false]);
    expect(choices[1].needsNote).toBe(true);
  });

  it("leaves out the free-text catch-all", () => {
    const other: GateOption = { ...sendBack, id: "other" };
    expect(stageChoices({ options: [accept, other] }).map((c) => c.id)).toEqual(["accept"]);
  });

  it("does not ask a note of a lone send back", () => {
    expect(stageChoices({ options: [sendBack] })[0]).toMatchObject({ needsNote: false, primary: true });
  });

  it("makes send back primary when nothing was computed", () => {
    const choices = stageChoices({ options: [accept, sendBack] }, { noResults: true });
    expect(choices.find((c) => c.id === "accept")?.primary).toBe(false);
    expect(choices.find((c) => c.id === "send_back")?.primary).toBe(true);
  });

  it("keeps accept available when nothing was computed", () => {
    const choices = stageChoices({ options: [accept, sendBack] }, { noResults: true });
    expect(choices.find((c) => c.id === "accept")?.disabledReason).toBeUndefined();
  });

  it("says why send back cannot be used, and promotes nothing it cannot offer", () => {
    const reason = "Writing has started; stop or finish it before running Execution again.";
    const choices = stageChoices({ options: [accept, sendBack] }, { noResults: true, sendBackBlocked: reason });
    expect(choices.find((c) => c.id === "send_back")?.disabledReason).toBe(reason);
    expect(choices.some((c) => c.primary)).toBe(false);
  });

  it("uses the option's own reason when it is disabled, else a plain fallback", () => {
    const [withReason, without] = stageChoices({
      options: [
        { ...accept, disabled: true, disabledReason: "The plan check is still open." },
        { ...sendBack, disabled: true },
      ],
    });
    expect(withReason.disabledReason).toBe("The plan check is still open.");
    expect(without.disabledReason).toMatch(/not available/i);
  });

  it("says accepting ends Execution with no estimates when nothing was computed", () => {
    const [choice] = stageChoices({ options: [accept, sendBack] }, { noResults: true });
    expect(choice.description).toBe("Ends Execution with no estimates.");
    expect(choice.leadsTo).toBe("Execution ends with no estimates");
    expect(stageChoices({ options: [accept, sendBack] })[0].description).toBe(accept.description);
  });
});
