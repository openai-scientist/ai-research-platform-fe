import type { Gate, GateOption } from "./contract";

export interface StageChoice {
  id: string;
  label: string;
  description: string;
  leadsTo: string;
  confirmLabel: string;
  /** The answer needs the researcher's own words. */
  needsNote: boolean;
  /** The one filled button; the others are outlined. */
  primary: boolean;
  /** Why it cannot be chosen now, shown beside the button. */
  disabledReason?: string;
}

const NOT_AVAILABLE = "This choice is not available right now.";
/** Choices that carry on with the stage as it stands. */
const CONTINUES = new Set(["accept", "approve"]);

/**
 * Every answer a stage review advertises, with the recommended one primary. When Execution computed nothing, accepting
 * is not the primary answer: the researcher is pointed to sending it back.
 */
export function stageChoices(
  gate: Pick<Gate, "options">,
  { noResults = false, sendBackBlocked = null }: { noResults?: boolean; sendBackBlocked?: string | null } = {},
): StageChoice[] {
  const options = gate.options.filter((option) => option.id !== "other");
  const choices = options.map((option: GateOption): StageChoice => {
    const reason = option.id === "send_back" && sendBackBlocked ? sendBackBlocked : option.disabledReason;
    return {
      id: option.id,
      label: option.label,
      description: option.description,
      leadsTo: option.leads_to,
      confirmLabel: option.confirm_label,
      needsNote: (Boolean(option.needsText) || option.id === "send_back") && options.length > 1,
      primary: false,
      ...(option.disabled || reason ? { disabledReason: reason ?? NOT_AVAILABLE } : {}),
    };
  });
  const usable = choices.filter((choice) => !choice.disabledReason);
  const demoted = (choice: StageChoice) => noResults && CONTINUES.has(choice.id);
  const advised = options.find((option) => option.recommended)?.id;
  const primary =
    usable.find((choice) => choice.id === advised && !demoted(choice)) ?? usable.find((choice) => !demoted(choice));
  return choices.map((choice) => ({ ...choice, primary: choice === primary }));
}
