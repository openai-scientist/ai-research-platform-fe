/** What Accept and Send back say at each stage's review, so no stage describes another's hand-off. */
export interface AnswerCopy {
  description: string;
  leads_to: string;
}

export interface StageAnswerCopy {
  accept: AnswerCopy;
  sendBack: AnswerCopy;
}

/** The copy for the stage under review; `subject` names what it produced, such as "data card". */
export function stageAnswerCopy(
  stageKey: string | undefined,
  subject: string,
  continuesToDesign = true,
): StageAnswerCopy {
  switch (stageKey) {
    case "dataset":
      return {
        accept: { description: "Use this data card in the Hypothesis stage.", leads_to: "Hypothesis can begin" },
        sendBack: {
          description: "The agents rebuild the data card, following your note.",
          leads_to: "The data card runs again",
        },
      };
    case "hypothesis":
      return {
        accept: continuesToDesign
          ? { description: "Design the analyses for the hypotheses you pick.", leads_to: "Experiment design starts" }
          : { description: "They become this run's result.", leads_to: "The run is complete" },
        sendBack: {
          description: "The agents revise the hypotheses, following your note.",
          leads_to: "The hypotheses run again",
        },
      };
    case "experiment_design":
      return {
        accept: {
          description: "Pass the registered analyses and decision rules to Execution.",
          leads_to: "Execution can begin",
        },
        sendBack: {
          description: "The agents change the analysis plan, following your note.",
          leads_to: "Experiment design runs again",
        },
      };
    case "execution":
      return {
        accept: { description: "Record the results as they are; Writing can start.", leads_to: "Writing can start" },
        sendBack: {
          description: "Run Execution again on the same locked plan, following your note.",
          leads_to: "Execution runs again",
        },
      };
    default:
      return {
        accept: {
          description: `Use this published ${subject} in the next stage.`,
          leads_to: "The next stage can begin",
        },
        sendBack: {
          description: `The agents work on the ${subject} again, following your note.`,
          leads_to: `The ${subject} runs again`,
        },
      };
  }
}

/** What accepting means when Execution computed nothing. */
export const NO_RESULTS_ACCEPT: AnswerCopy = {
  description: "Ends Execution with no estimates.",
  leads_to: "Execution ends with no estimates",
};
