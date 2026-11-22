/* ===== The words a newcomer reads the writing stage by: each screen's plain name, why a paper needs it, what to check
   there, and the terms of the trade ===== */

export interface ScreenCopy {
  /** The plain name, in the track and the header. */
  name: string;
  /** The technical name, second and small. */
  tech: string;
  /** Why a paper needs this step, in one line. */
  why: string;
  /** What to look at here, once the step is done. */
  check: string;
  /** What the stage does, in one line. */
  what?: string;
  /** The methods it follows, by short name; the long account is behind the info mark. */
  method?: string;
}

export const SCREEN_COPY: Record<string, ScreenCopy> = {
  handoff: {
    name: "Check the handover",
    tech: "Intake",
    why: "A paper can report only what the experiment really delivered; what is missing is named, never filled in.",
    check: "Read the red and amber rows in “What the paper cannot use”: none of them reaches the paper.",
    what: "Checks every part the experiment handed over against the locked protocol.",
    method: "The locked protocol and the result package's own checks.",
  },
  frame: {
    name: "Set the writing frame",
    tech: "Journal rules · moves · style",
    why: "How the paper will be written, set from the journal profile before any writing.",
    check: "Look at the four choices at the end: they are what you can change.",
    what: "Reads the journal profile: its rules, the moves of each section and the sentence style.",
    method: "Gastel & Day (the journal's instructions) · Swales (the moves of an Introduction) · Schimel (OCAR).",
  },
  report: {
    name: "Describe the study",
    tech: "Data report",
    why: "Reviewers expect a standard account of the data, the plan and the analysis; a missing part becomes a stated limit, never a guess.",
    check: "Read the claim ceiling and the fields marked partial or qualified.",
    what: "Lays the study into a standard data-science report and sets how strongly the paper may claim.",
    method: "REFORMS · NeurIPS checklist · Datasheets for Datasets · pre-registration templates.",
  },
  evidence: {
    name: "Collect numbers & quotes",
    tech: "Evidence ledger",
    why: "Every number and quote in the paper must trace to a source; the writers may print nothing outside this ledger.",
    check: "Check the conflicts, the quarantined sources and any number that differs on recompute.",
    what: "Resolves every source, gives every number and quote a ledger entry, and recomputes the numbers.",
    method: "Lookup at Crossref, DataCite and OpenAlex · recomputation from the run records.",
  },
  statements: {
    name: "Sort the statements",
    tech: "Axis 4",
    why: "A reader must see which sentences the study established and which it only suggests.",
    check: "Check the status of each finding and any statement that is blocked.",
    what: "Gives every statement a type and a status: how firmly the paper may write it.",
    method: "Statement types and epistemic status · hedging: saying no more than the evidence warrants (Hyland, 1998).",
  },
  debate: {
    name: "Test each claim",
    tech: "Debate",
    why: "Reviewers will question the claims; meeting their questions first keeps the paper from saying more than the record shows.",
    check: "Read what each claim conceded: it is the wording the paper will use.",
    what: "Four critics question each claim; a Proponent answers and a Judge rules. Each concession narrows the claim.",
    method: "Argumentation schemes and their critical questions (Walton, Reed & Macagno, 2008).",
  },
  reasoning: {
    name: "Claim anatomy",
    tech: "Toulmin",
    why: "Shows what supports each claim, how far it reaches and what could undo it, before the claims are joined into one argument.",
    check: "Look at the warrants marked reconstructed: no source states them.",
    what: "Draws each claim in six parts: data, warrant, backing, qualifier, rebuttal and the claim itself.",
    method: "Toulmin's model · The Craft of Research on warrants.",
  },
  map: {
    name: "Argument map",
    tech: "AIF · ASPIC+",
    why: "The paper may state only the claims that survive every attack on them, and no more strongly than the design allows.",
    check: "Check which claims are IN and the wording each one is locked with.",
    what: "Joins the claims into one argument, keeps only the claims nothing defeats, and locks them.",
    method: "AIF (the argument graph) · ASPIC+ (which claims survive).",
  },
  journal: {
    name: "Join frame & argument",
    tech: "Join",
    why: "A statement with no section to go in, or a required move with nothing to carry, would leave a hole in the paper.",
    check: "Read the three checks first, then where each statement goes.",
    what: "Checks that the writing frame and the locked argument fit, then places each statement in its section.",
    method: "Gastel & Day (what each section carries).",
  },
  blueprint: {
    name: "Outline",
    tech: "Story · paragraphs · sentences",
    why: "The writers write inside this plan, so no sentence can say more than a locked claim allows.",
    check: "Read the story, then the paragraphs marked high risk.",
    what: "Plans the story, then every paragraph and sentence, from the locked claims.",
    method: "Schimel (OCAR) · The Craft of Research (reasons, acknowledgments, warrants).",
  },
  paper: {
    name: "Write the paper",
    tech: "Section drafting · front matter · assembly",
    why: "The paper is written section by section, each from its paragraph plans: what the study found first, then what frames it, the title and abstract last, from the finished text. You choose the writing kept of each section where it stands in the paper.",
    check:
      "Read the paper as it comes. Where it waits for you, read its writings on the page and compare them before you keep one; a paragraph's number opens its plan, its checks and its sources.",
  },
};

/** The terms of the writing stage, each in one sentence, for the hover definitions on the screens. */
export const GLOSSARY: Record<string, string> = {
  "results package": "Everything the experiment hands over: the protocol, data, runs, results, deviations and figures.",
  "protocol lock": "The plan was fixed before any run, so the planned tests count as confirmatory.",
  deviation: "Something run differently from the plan; the paper must report it.",
  "claim ceiling": "The strongest wording the paper may use, set from the study's design (for example “indicate”).",
  qualified:
    "A field the record states, but a rule of the frame narrows what it supports; the paper reports it as a limit.",
  partial: "A field the record does not state; the paper says it is missing and never fills it in.",
  ledger: "The list of every number and quote the paper may print, each with its source.",
  "cite-only": "A source with no text to quote: it can be cited by its title only.",
  unresolved: "A reference the lookup services could not reach or read: it is never cited until it resolves.",
  quarantined: "A reference whose identifier did not resolve at its registry: it is never cited.",
  recompute: "Re-deriving a number from the records behind it to confirm the package's value.",
  statement: "One sentence-level unit of the paper: background, gap, hypothesis, finding, limitation and so on.",
  status: "How firmly a statement may be written: established, supported, inconclusive, exploratory, bounded…",
  "axis 4": "The fourth axis of the writing frame: the type and epistemic status of every scientific statement.",
  "critical question":
    "A standard challenge an argument of a given kind must answer; “CQ 2/2” means both were answered.",
  concession: "A point the claim's defender gives up; it narrows the claim's wording.",
  ruling: "The Judge's decision on one exchange of the debate.",
  toulmin: "A way to draw one argument in six parts: data, claim, warrant, backing, qualifier and rebuttal.",
  data: "The facts a claim rests on: ledger values and statements of the record.",
  warrant: "Why the data support the claim.",
  backing: "What makes the warrant trustworthy: a source, a check or the protocol lock.",
  qualifier: "How far the claim reaches: the limits the debate conceded.",
  rebuttal: "A condition under which the claim would not hold.",
  reconstructed: "A warrant the AI inferred because no source states it; it is never shown as a quote.",
  aif: "The Argument Interchange Format: a standard way to draw arguments as linked statements.",
  "i-node": "One statement in the argument map.",
  ra: "An inference: these premises support that conclusion.",
  ca: "A conflict: one statement attacks another.",
  pa: "A preference: one argument is preferred over another.",
  "aspic+": "Rules that decide which claims survive the attacks on them.",
  in: "The claim survives every attack: the paper may write it.",
  out: "The claim is defeated: the paper does not write it.",
  undec: "Undecided: the paper may only hedge it.",
  "frozen graph": "The locked set of claims the paper is planned from; any sentence that says more is sent back.",
  "writing contract": "The journal's rules merged into one contract every writer follows.",
  "placement map": "Which section each statement of the paper goes in.",
  moves: "The standard order of steps inside a section, such as territory → niche → occupy in an Introduction.",
  writing: "One version of a section, written from its paragraph plans; option A and B follow other strategies.",
  verifier: "Reads each sentence against its premises alone and drops the ones that say more than they may.",
  "front matter": "The title, abstract and keywords, written last from the finished sections.",
  "paragraph risk":
    "How much a paragraph carries: claims, qualifiers, deviations and new citations; 6 or more means review it first.",
};
