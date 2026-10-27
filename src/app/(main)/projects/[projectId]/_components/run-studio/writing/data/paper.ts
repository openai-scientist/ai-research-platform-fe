import { CHECKS, EXCEPTIONS, FIT, FIT_RULES } from "./core";

/* ===== S11 · the manuscript text: a full research article, written only from the record ===== */

export const PAPER_TITLE =
  "First-semester results find more students at risk of dropping out: a pre-registered study at one polytechnic";

/* sentence pieces: text, a number from the ledger, a citation, a span that changes later, the wording you choose */
export interface NumPiece {
  n: string;
  /** the ledger row it comes from */
  e: string;
  id?: string;
  f?: string;
}
export interface RevPiece {
  r: string;
  /** draft, final and (for a second change) revised text */
  t: string;
  f: string;
  g?: string;
}
export type Piece = string | NumPiece | { c: number } | RevPiece | { v: string };
export interface Sentence {
  /** what the sentence does: a statement type or a move */
  p: string;
  x: Piece[];
  lab?: string;
  when?: string;
}
export interface Para {
  id: string;
  sec: string;
  /** subsection; k is the paragraph's place in it */
  n?: string;
  k?: number;
  sub?: string;
  w?: string;
  job?: string;
  uses?: string[];
  claim?: string;
  when?: string;
  blocked?: boolean;
  kind?: "table" | "table2" | "figure" | "excluded";
  s?: Sentence[];
}
export const N = (n: string, e: string, id?: string, f?: string): NumPiece => ({ n, e, id, f }),
  C = (c: number) => ({ c }),
  R = (id: string, t: string, f: string, g?: string): RevPiece => ({ r: id, t, f, g }),
  V = (k: string) => ({ v: k });

/* The spans that the read-back, the journal edit and the revision change, by id. */
export const REV: Record<string, RevPiece> = {
  absci: R("absci", " (gain 0.111; 95% CI 0.081 to 0.146 when courses are resampled)", ""),
  orig: R("orig", "nobody has tested", "to our knowledge, no study has tested"),
  rel: R("rel", "which is why their results are hard to compare", "so their results are hard to compare"),
  cd: R("cd", "[13]", "[1]"),
  ten: R("ten", "ten thousand", "10,000"),
  k60: R("k60", "", " (for GB-ES1, a learning rate of 0.05 in all five splits and at most 15 leaves in four)"),
  g1: R("g1", "finished", "eligible"),
  sc: R("sc", "any model built on enrolment data", "the same model without them"),
  strat: R(
    "strat",
    "",
    " Without the students who sat no first-semester evaluation, the gain was 0.122 (95% CI 0.100 to 0.143; row 41).",
  ),
  dis: R(
    "dis",
    "does not depend on whether a student was admitted with a low or a high grade",
    "does not depend on admission grade",
  ),
  drift: R("drift", " Boosting also ranks students better than logistic regression.", ""),
  om: R(
    "om",
    "",
    "Some of the students the model finds may already have stopped attending; the record shows only that they sat no evaluation, not when they left. ",
    "The gain holds without students who sat no first-semester evaluation (Section 4.1). ",
  ),
};
/* Light markup for a sentence: {value|source} a number from the ledger, [n] a citation, «id» a revisable span, ⟨k⟩ the wording chosen at stop 3. */
export function T(p: string, str: string, extra: { lab?: string; when?: string } = {}): Sentence {
  const x: Piece[] = [];
  const re = /\{([^|}]+)\|([^}]+)\}|\[(\d+)\]|«(\w+)»|⟨(\w+)⟩/g;
  let at = 0;
  let m: RegExpExecArray | null = re.exec(str);
  while (m) {
    if (m.index > at) x.push(str.slice(at, m.index));
    if (m[1]) x.push(N(m[1], m[2]));
    else if (m[3]) x.push(C(+m[3]));
    else if (m[4]) x.push(REV[m[4]]);
    else x.push(V(m[5]));
    at = re.lastIndex;
    m = re.exec(str);
  }
  if (at < str.length) x.push(str.slice(at));
  return { p, x, ...extra };
}

/* id · sec · n subsection (k paragraph in it) · sub heading · w writer · job · uses · when · s sentences */
export const PARAS: Para[] = [
  {
    id: "ABS",
    sec: "ABS",
    n: "",
    w: "d",
    job: "Structured abstract. Written last, from the finished paper.",
    uses: [],
    s: [
      T(
        "BG",
        "Many universities rank their students by the risk of dropping out, so that advisers can contact those most likely to leave. When the ranking should be made, and whether a flexible model is worth its cost over logistic regression, is rarely tested under a plan fixed in advance. ",
        { lab: "Background." },
      ),
      T(
        "RQ",
        "We asked whether first-semester results find more of the students who later drop out than data known at enrolment, whether that gain is larger for students admitted with lower grades, and whether gradient boosting outperforms logistic regression on enrolment data. ",
        { lab: "Objective." },
      ),
      T(
        "M",
        "Following a plan locked before any model was fit, we used the open records of 3,630 students who entered 17 degrees at one Portuguese polytechnic between 2008/09 and 2018/19. Over five stratified splits we measured recall at 20% flagged: the share of all dropouts among the fifth of students ranked most at risk. ",
        { lab: "Method." },
      ),
      T(
        "F1",
        "Adding first-semester results raised recall from 0.396 to 0.507«absci», close to the highest value the measure allows, 0.511. The gain was clear in both admission groups and was not larger below the median. On enrolment data, gradient boosting could not be told apart from logistic regression. ",
        { lab: "Results." },
      ),
      T(
        "C",
        "For entrants to this polytechnic, first-semester results are a better basis for early warning than enrolment data. The plan, the code, every trace and the results table are released, so every number can be recomputed.",
        { lab: "Conclusions." },
      ),
    ],
  },

  /* ---------- 1 · Introduction ---------- */
  {
    id: "INT-1",
    sec: "INT",
    n: "1.1",
    w: "d",
    job: "Why early warning matters, and what nobody has tested yet.",
    uses: ["Realinho et al., 2022", "Tinto, 1975"],
    s: [
      T(
        "GAP",
        "Many universities now rank their students by the risk of dropping out, so that a tutoring team can contact those most likely to leave; the record studied here was collected for such a tool [1]. ",
      ),
      T(
        "GAP",
        "Dropping out is costly for students and institutions alike, and it has long been understood as the outcome of how far a student becomes part of academic life [2]. ",
      ),
      T(
        "GAP",
        "Studies of dropout agree that early grades are informative [3][4][5], yet «orig», on open data and under a plan locked before any model was fit, whether first-semester results add to what is known at enrolment. ",
      ),
      T(
        "RQ",
        "We run that test, and with it a second one: whether the choice of model matters as much as the choice of inputs.",
      ),
    ],
  },
  {
    id: "INT-2",
    sec: "INT",
    n: "1.2",
    w: "d",
    job: "Why the timing of the ranking matters.",
    uses: ["Kaufman et al., 2012", "Kapoor & Narayanan, 2023", "REFORMS"],
    s: [
      T(
        "BG",
        "The timing of a ranking matters because information recorded later can leak the outcome into the prediction. A column updated after a student has stopped attending, such as unpaid fees, can make a model look accurate while telling advisers nothing they do not already know [6]. ",
      ),
      T(
        "BG",
        "Reviews of machine-learning-based science have found such leakage across many fields, where it led to overoptimistic results [7], and reporting standards now ask authors to show that each input would be available when the model is used [8]. ",
      ),
      T(
        "BG",
        "For early warning this is not a technicality. A ranking that relies on information from after the decision point cannot be produced at that point, however well it scores on a test set.",
      ),
    ],
  },
  {
    id: "INT-3",
    sec: "INT",
    n: "1.3",
    w: "d",
    job: "The second choice: which model.",
    uses: ["Grinsztajn et al., 2022", "Christodoulou et al., 2019", "Rudin, 2019"],
    s: [
      T(
        "BG",
        "The second choice is the model. Gradient-boosted trees are a standard choice for tabular data and often outperform more elaborate learners on it [9], and dropout studies have compared many such models [10][5]. ",
      ),
      T(
        "BG",
        "Comparisons with logistic regression are less flattering. In clinical prediction, a systematic review found no performance benefit of machine learning over logistic regression once comparisons at high risk of bias were set aside [11], and correcting leakage has removed reported advantages of complex models in other fields [7]. ",
      ),
      T(
        "BG",
        "When the predictions are about individual people, a model that performs as well and can be explained is preferable [12]. Whether boosting earns its place in a dropout ranking is therefore a question for each setting, not a default.",
      ),
    ],
  },
  {
    id: "INT-4",
    sec: "INT",
    n: "1.4",
    w: "d",
    job: "The data, and why they suit the question.",
    uses: ["Realinho et al., 2022", "Martins et al., 2021"],
    s: [
      T(
        "BG",
        "We study both choices on the record released by one Portuguese polytechnic [1]. It describes every student who entered one of 17 undergraduate degrees between 2008/09 and 2018/19: what was known at enrolment, their results in the first two semesters, and their status at the end of the normal duration of their course. ",
      ),
      T(
        "BG",
        "The same institution's earlier work used this kind of record to predict performance from data known at enrolment [13]. ",
      ),
      T(
        "BG",
        "The record suits the question because each input can be placed in time. Enrolment data, first-semester results and second-semester results arrive at different points, so the decision point can be fixed and every later input left out. Because the record is public, anyone can recompute what we report.",
      ),
    ],
  },
  {
    id: "INT-5",
    sec: "INT",
    n: "1.5",
    w: "d",
    job: "What this study does, and its three hypotheses.",
    uses: ["Data report B.3–B.7"],
    s: [
      T(
        "RQ",
        "This paper reports a test of both choices, run under a plan we locked before fitting any model [14]. We compare logistic regression and gradient boosting on data known at enrolment, and gradient boosting with first-semester results added. ",
      ),
      T(
        "M",
        "We measure recall at 20% flagged: the share of all dropouts among the fifth of students the model ranks most at risk, about as many as the advisers can contact. ",
      ),
      T(
        "RQ",
        "The plan named three primary hypotheses: that first-semester results raise recall by at least 0.05 (H1), that this gain is larger for students admitted with grades below the median (H2), and that on enrolment data boosting outperforms logistic regression (H4). ",
      ),
      T("RQ", "We report each as planned, including the two the data do not support."),
    ],
  },
  {
    id: "INT-6",
    sec: "INT",
    n: "1.6",
    w: "d",
    job: "The contributions, stated no wider than the claims.",
    uses: ["F1", "F2", "F3"],
    s: [
      T(
        "CTR",
        "The study makes three contributions. First, it measures how much first-semester results add to an early-warning ranking, on open data and with every input dated to the decision point. ",
      ),
      T(
        "CTR",
        "Second, it tests whether that gain is concentrated among students admitted with lower grades, which would tell advisers where to spend their time. ",
      ),
      T(
        "CTR",
        "Third, it adds a pre-registered comparison of boosting and logistic regression on enrolment data to the evidence on when flexible models pay off. ",
      ),
      T("CTR", "We release the plan, the deviation log, the code, the traces of all 20 runs and the results table."),
    ],
  },
  {
    id: "INT-7",
    sec: "INT",
    n: "1.7",
    w: "d",
    job: "Where each part of the paper is.",
    uses: [],
    s: [
      T(
        "ROAD",
        "Section 2 reviews dropout prediction, the timing of inputs, the case for and against flexible models, and how an early-warning list should be scored. Section 3 describes the data, the models, the planned analyses and the one change we made to the plan. ",
      ),
      T(
        "ROAD",
        "Section 4 reports the three findings in the order of the plan, then what the record does not allow us to report and the exploratory analyses. Section 5 interprets the findings and sets out their limits, and Section 6 concludes.",
      ),
    ],
  },

  /* ---------- 2 · Related work ---------- */
  {
    id: "REL-1",
    sec: "REL",
    n: "2.1",
    sub: "Predicting dropout",
    w: "m",
    job: "Dropout prediction, and the record this study uses.",
    uses: ["Realinho et al., 2022", "Martins et al., 2021"],
    s: [
      T(
        "REL",
        "Studies of dropout prediction differ in their institutions, their outcomes and the point at which they predict, «rel». ",
      ),
      T(
        "REL",
        "Realinho et al. describe the record we use and report a first three-class model on it «cd»; its permutation importances rank second- and first-semester approvals above anything known at enrolment. ",
      ),
      T("REL", "Their aim was a model for the institution's tutoring team, which is also the use we evaluate here."),
    ],
  },
  {
    id: "REL-2",
    sec: "REL",
    n: "2.1",
    k: 2,
    w: "m",
    job: "Early results as predictors, in two earlier studies.",
    uses: ["Dekker et al., 2009", "Aulck et al., 2016"],
    s: [
      T(
        "REL",
        "Earlier work points the same way. Dekker et al. predicted dropout in an engineering programme from pre-university and first-semester data, and found that simple classifiers already gave useful accuracy [3]. ",
      ),
      T(
        "REL",
        "Aulck et al. used the records of tens of thousands of students at a large university and found grades in early courses among the strongest predictors [10].",
      ),
    ],
  },
  {
    id: "REL-3",
    sec: "REL",
    n: "2.1",
    k: 3,
    w: "m",
    job: "Semester data in German studies, and what they leave open.",
    uses: ["Berens et al., 2019", "Kemper et al., 2020"],
    s: [
      T(
        "REL",
        "Berens et al. predicted dropout from administrative data at German universities and found that predictions improve as each semester's performance data are added [4]. Kemper et al. reached a similar conclusion at a German institute of technology, using examination data from the first semesters [5]. ",
      ),
      T(
        "GAP",
        "These studies agree that early results are informative. Most, however, report accuracy or the area under the ROC curve on splits chosen after the data were seen, and few state when each input becomes available.",
      ),
    ],
  },
  {
    id: "REL-4",
    sec: "REL",
    n: "2.2",
    sub: "Inputs known at the decision",
    w: "m",
    job: "Leakage, and what reporting standards ask.",
    uses: ["Kaufman et al., 2012", "Kapoor & Narayanan, 2023", "REFORMS"],
    s: [
      T(
        "REL",
        "Leakage occurs when a model is given information that would not be available when the prediction is made [6]. ",
      ),
      T(
        "REL",
        "Kapoor and Narayanan found it in 294 papers across 17 fields and showed that it leads to overoptimistic results [7]. ",
      ),
      T(
        "REL",
        "The REFORMS recommendations for machine-learning-based science ask authors to justify, among other things, that each input would be available in use [8].",
      ),
    ],
  },
  {
    id: "REL-5",
    sec: "REL",
    n: "2.2",
    k: 2,
    w: "m",
    job: "Why administrative records make leakage easy to miss.",
    uses: ["Gebru et al., 2021", "Data report C.5"],
    s: [
      T(
        "REL",
        "Administrative records make the problem easy to miss. A column such as unpaid fees or a scholarship may be updated after a student has stopped attending, and a data descriptor need not say when. ",
      ),
      T(
        "REL",
        "Datasheets for datasets ask the creators of a dataset to document how and when each field was collected [15]. Where that is missing, the analyst has to decide, and the decision belongs in the paper. ",
      ),
      T("M", "We kept such columns out of the primary models and report a sensitivity analysis with them added."),
    ],
  },
  {
    id: "REL-6",
    sec: "REL",
    n: "2.3",
    sub: "Flexible models and logistic regression",
    w: "m",
    job: "Why boosting is the expected winner on tabular data.",
    uses: ["Ke et al., 2017", "Grinsztajn et al., 2022"],
    s: [
      T(
        "REL",
        "Gradient-boosted trees, in histogram-based implementations such as LightGBM [16], are a standard choice for tabular data. On medium-sized tabular benchmarks, tree-based models often outperform deep networks [9]. ",
      ),
      T(
        "GAP",
        "Those benchmarks, however, do not compare against logistic regression, the model an institution is most likely to build first.",
      ),
    ],
  },
  {
    id: "REL-7",
    sec: "REL",
    n: "2.3",
    k: 2,
    w: "m",
    job: "Where logistic regression holds its own.",
    uses: ["Christodoulou et al., 2019", "Salganik et al., 2020", "Rudin, 2019"],
    s: [
      T(
        "REL",
        "Comparisons that include logistic regression are less flattering to flexible models. A systematic review of clinical prediction models found no performance benefit for machine learning in comparisons at low risk of bias [11], and after correcting leakage, Kapoor and Narayanan found complex models no better than logistic regression in the cases they re-examined [7]. ",
      ),
      T(
        "REL",
        "In a mass collaboration that predicted life outcomes from rich survey data, the best submissions were only slightly better than a simple benchmark [17]. ",
      ),
      T(
        "REL",
        "When two models perform alike, the case for the one that can be explained is strong in decisions about individuals [12].",
      ),
    ],
  },
  {
    id: "REL-8",
    sec: "REL",
    n: "2.4",
    sub: "Scoring a list for advisers",
    w: "m",
    job: "Why recall at a fixed share flagged.",
    uses: ["Saito & Rehmsmeier, 2015", "Brier, 1950"],
    s: [
      T(
        "REL",
        "Most dropout studies report accuracy or the area under the ROC curve. Neither matches how an early-warning list is used: advisers contact a fixed number of students, so what matters is how many of the eventual dropouts are among them. ",
      ),
      T(
        "REL",
        "With imbalanced outcomes, measures built on precision and recall are more informative than the ROC curve [18]. ",
      ),
      T(
        "M",
        "We therefore score each model by recall at a share flagged that is set by the advisers' capacity, and report AUROC and the Brier score [19] as secondary measures.",
      ),
    ],
  },
  {
    id: "REL-9",
    sec: "REL",
    n: "2.4",
    k: 2,
    w: "m",
    job: "Pre-registering an analysis of existing data.",
    uses: ["van den Akker et al., 2021"],
    s: [
      T(
        "REL",
        "Finally, most of this literature is exploratory in the sense that analysis choices were made after the data were seen. For existing data, where the analyst often knows the dataset before planning, van den Akker et al. propose a preregistration template that records what was known in advance [14]. ",
      ),
      T("M", "We followed it: the plan lists what we had seen of the data before it was locked."),
    ],
  },

  /* ---------- 3 · Method ---------- */
  {
    id: "MET-1",
    sec: "MET",
    n: "3.1",
    sub: "Data and population",
    w: "m",
    job: "The record, the outcome and who is analysed.",
    uses: ["analysis.json · data", "Data report C.1"],
    s: [
      T(
        "M",
        "We use the record released by Realinho et al. [1] in the UCI Machine Learning Repository (record 697, CC BY 4.0), unchanged. ",
      ),
      T(
        "M",
        "It holds {4,424|analysis.json} students and 36 attributes, with each student's status at the end of the normal duration of their course: {2,209|analysis.json} graduated, {1,421|analysis.json} dropped out and {794|analysis.json} were still enrolled. ",
      ),
      T(
        "M",
        "Students still enrolled were excluded because their outcome is not known, leaving {3,630|analysis.json} students, of whom {39.1%|analysis.json} dropped out. The outcome is binary: dropout or graduate.",
      ),
    ],
  },
  {
    id: "MET-1b",
    sec: "MET",
    n: "3.1",
    k: 2,
    w: "m",
    job: "Where the record comes from, and how it was checked.",
    uses: ["Data report C.2–C.4"],
    s: [
      T(
        "M",
        "The institution assembled the record from its academic management system, its teaching-support system, national admission records and annual macroeconomic figures [1]. ",
      ),
      T(
        "M",
        "It is anonymised, but gender, nationality, age, special needs and parents' occupations are personal attributes, and we report no result for a group smaller than 30 students. ",
      ),
      T(
        "M",
        "The descriptor reports no missing values. A check for impossible values, such as negative counts, grades outside 0–20 or admission grades outside 95–190, found none.",
      ),
    ],
  },
  {
    id: "MET-1c",
    sec: "MET",
    n: "3.1",
    k: 3,
    w: "m",
    job: "What the exclusion may do to the population.",
    uses: ["Plan §8"],
    s: [
      T(
        "M",
        "Excluding students still enrolled is expected to remove more students from recent cohorts than from early ones, because recent entrants have had less time to graduate or leave. ",
      ),
      T("LIM", "The record holds no entry year, so we could not check this. Section 5.2 returns to it."),
    ],
  },
  {
    id: "MET-2",
    sec: "MET",
    n: "3.2",
    sub: "Inputs and the decision point",
    w: "m",
    job: "Which inputs are known when the ranking is made.",
    uses: ["Plan §3", "EV-13"],
    s: [
      T(
        "M",
        "The ranking is made at the end of a student's first semester, and an input is used only if it is known by then. ",
      ),
      T(
        "M",
        "Inputs known at enrolment (group E) are demographic data, application and course, previous qualification and its grade, admission grade, parents' qualifications and occupations, and three macroeconomic indicators for the year of entry. ",
      ),
      T(
        "M",
        "First-semester inputs (group S1) are the six curricular-unit columns of the first semester: units credited, enrolled, evaluated, approved and without evaluation, and the mean grade.",
      ),
    ],
  },
  {
    id: "MET-2b",
    sec: "MET",
    n: "3.2",
    k: 2,
    w: "m",
    job: "The inputs left out, and why.",
    uses: ["Plan §3", "Data report C.5"],
    s: [
      T("M", "Second-semester columns were not used, because they arrive after the decision. "),
      T(
        "M",
        "Three columns, Debtor, Tuition fees up to date and Scholarship holder, carry no date in the descriptor. A student who stops attending may also stop paying fees, so these columns may record the dropout rather than predict it [6]. ",
      ),
      T(
        "M",
        "They are left out of the primary models. A sensitivity analysis adds them to the strongest model (Section 4.1).",
      ),
    ],
  },
  {
    id: "MET-3",
    sec: "MET",
    n: "3.3",
    sub: "Models and tuning",
    w: "m",
    job: "The three models compared.",
    uses: ["Plan §4", "Data report D.1"],
    s: [
      T(
        "M",
        "We compare three models. LR-E is logistic regression with an L2 penalty on group E, with categorical codes one-hot encoded and numeric columns standardised. ",
      ),
      T(
        "M",
        "GB-E is gradient boosting on group E, and GB-ES1 is gradient boosting on groups E and S1. Both use the histogram-based implementation in scikit-learn [20], which follows LightGBM [16]. ",
      ),
      T("M", "Every step of each model, including encoding and scaling, is fit on the training part of a split only."),
    ],
  },
  {
    id: "MET-3b",
    sec: "MET",
    n: "3.3",
    k: 2,
    w: "m",
    job: "How each model was tuned.",
    uses: ["Plan §5", "Data report D.3"],
    s: [
      T(
        "M",
        "Each model is tuned by five-fold stratified cross-validation inside the training part, on a grid fixed in the plan: C ∈ {0.1, 1, 10} for logistic regression; learning rate ∈ {0.05, 0.1}, maximum leaf nodes ∈ {15, 31} and L2 penalty ∈ {0, 1} for boosting. ",
      ),
      T(
        "M",
        "The grid point with the best cross-validated recall at 20% flagged is refit on the whole training part«k60». ",
      ),
      T("M", "The test part of a split is never used to fit, tune or choose anything."),
    ],
  },
  {
    id: "MET-4",
    sec: "MET",
    n: "3.4",
    sub: "Splits, measures and intervals",
    w: "m",
    job: "Splits, runs and traces.",
    uses: ["analysis.json · splits", "Data report D.4"],
    s: [
      T(
        "M",
        "Each of five splits holds out a stratified 20% of students, {726|analysis.json} students of whom {284|analysis.json} dropped out; seeds 1 to 5 fix the splits. ",
      ),
      T(
        "M",
        "Each model is fit once per split, which gives 15 runs, and five more runs serve the sensitivity analysis. ",
      ),
      T(
        "M",
        "Every run writes a trace that records its configuration, its seed, a fingerprint of its split, the settings tuning chose and the score of each test student, so any number in this paper can be traced to the runs that produced it.",
      ),
    ],
  },
  {
    id: "MET-4b",
    sec: "MET",
    n: "3.4",
    k: 2,
    w: "m",
    job: "The primary measure, and its ceiling.",
    uses: ["Plan §6", "Data report B.8"],
    s: [
      T(
        "M",
        "The primary measure is recall at 20% flagged: the share of all dropouts in the test part that are among the 20% of students the model ranks most at risk. Twenty per cent is roughly the number of students the advisers can contact. ",
      ),
      T(
        "M",
        "Because {39.1%|analysis.json} of students drop out, the highest possible value is {0.511|analysis.json}: even a perfect ranking leaves some dropouts unflagged. ",
      ),
      T("M", "AUROC and the Brier score are reported as secondary measures, without hypotheses."),
    ],
  },
  {
    id: "MET-4c",
    sec: "MET",
    n: "3.4",
    k: 3,
    w: "m",
    job: "How intervals are computed.",
    uses: ["Plan §7", "Data report B.9"],
    s: [
      T(
        "M",
        "Intervals come from a paired bootstrap with «ten» resamples of test students within each split, averaged over the five splits [21]. We report the mean difference and its 95% interval, and no p-values. ",
      ),
      T(
        "M",
        "Students in one course share teachers, timetables and often a cohort, so they are not fully independent. As the plan specified, each primary comparison is repeated with a bootstrap that resamples courses rather than students.",
      ),
    ],
  },
  {
    id: "MET-5",
    sec: "MET",
    n: "3.5",
    sub: "Hypotheses and analyses",
    w: "m",
    job: "The primary hypotheses and their analyses.",
    uses: ["Data report B.4", "G.1"],
    s: [
      T(
        "M",
        "The plan lists six hypotheses, three of them primary. H1 states that GB-ES1 has higher recall at 20% flagged than GB-E, by at least 0.05. H2 states that this gain is larger for students admitted with a grade below the median of the training part. H4 states that GB-E has higher recall than LR-E on the same inputs. ",
      ),
      T(
        "M",
        "Each primary hypothesis has one confirmatory analysis, A1 to A3, fixed in the plan with its measure, its comparison and its interval. ",
      ),
      T(
        "M",
        "The secondary hypotheses H3, H5 and H6 are deferred, and this paper does not test them: H3 needs an entry year the record lacks, and H6 uses second-semester results, which arrive after the decision.",
        { when: "notorphan" },
      ),
      T("M", "The secondary hypotheses H5 and H6 are deferred; Section 5.2 explains why H3 is not tested.", {
        when: "orphan",
      }),
    ],
  },
  {
    id: "MET-5b",
    sec: "MET",
    n: "3.5",
    k: 2,
    w: "m",
    job: "The decision rule, and the smallest gain the design could see.",
    uses: ["Plan §7", "Data report B.11"],
    s: [
      T(
        "M",
        "The decision rule was fixed in advance. H1 is supported if the interval lies above zero and the estimate is at least 0.05; H2 and H4 are supported if the interval lies above zero. An interval that includes zero is reported as no clear difference, never as evidence of no difference. ",
      ),
      T(
        "LIM",
        "The plan estimated that one split could detect a difference of about 0.06 with 80% power. This was an assumption, not a measurement, and gains smaller than that may be missed.",
      ),
    ],
  },
  {
    id: "MET-5c",
    sec: "MET",
    n: "3.5",
    k: 3,
    w: "m",
    job: "Exploratory analyses, and why no correction.",
    uses: ["Data report G.2"],
    s: [
      T(
        "M",
        "Analyses that the plan did not name as confirmatory are reported as exploratory and support no claim. The plan named one, A4: recall by course, for courses with at least 30 test students. ",
      ),
      T(
        "M",
        "A second, A5, was added after the first run and is labelled as such: of the dropouts GB-ES1 flags, how many sat no first-semester evaluation (Section 4.5). ",
        { when: "a4" },
      ),
      T(
        "M",
        "A second exploratory analysis, added after the first run, is not reported, at the authors' decision; its row remains in the released results table. ",
        { when: "a4drop" },
      ),
      T(
        "M",
        "We apply no correction for multiple comparisons, because the three confirmatory analyses test three distinct hypotheses, each stated in advance with its direction.",
      ),
    ],
  },
  {
    id: "MET-6",
    sec: "MET",
    n: "3.6",
    sub: "Changes to the plan",
    w: "m",
    job: "When the plan was locked, and the one change made to it.",
    uses: ["Data report H.1", "Timeline", "D1"],
    s: [
      T(
        "M",
        "The plan was locked on 27 October 2026 at 10:50 UTC, before any model was fit. It lists what we had seen of the data beforehand: the descriptor, the column list and the class counts. ",
        { when: "notlate" },
      ),
      T(
        "M",
        "The plan was locked on 27 October 2026 at 22:40 UTC, after the first runs had started; Section 5.2 sets out what this means for our claims. ",
        { when: "late" },
      ),
      T(
        "M",
        "We made one change, recorded as deviation D1 two minutes after the first run began. The plan specified one-hot encoding for every model, but the boosting runs used the implementation's own handling of categorical codes. ",
      ),
      T(
        "M",
        "We kept those runs and repeated them exactly as planned. The verdicts did not change: A1 was 0.115 (95% CI 0.097 to 0.134) as planned against 0.111 as run, and A2 and A3 showed no clear difference either way. We report the runs as made; the planned runs are released with them.",
      ),
    ],
  },
  {
    id: "MET-7",
    sec: "MET",
    n: "3.7",
    sub: "Reproducibility",
    w: "m",
    job: "What is released, and how to recompute every number.",
    uses: ["Data report A.3", "F.1–F.2"],
    s: [
      T(
        "M",
        "We release the plan with its lock record, the deviation log, the pinned environment, the script that rebuilds every run, table and figure from the data file, the 20 traces and the results table. ",
      ),
      T(
        "M",
        "The table has one row per reported quantity, and each row names the traces it was computed from. Every number in Sections 4 and 5 cites its row, so a reader can recompute it. ",
      ),
      T(
        "M",
        "The data file is available from the UCI repository under CC BY 4.0; its fingerprint is in the plan, so a reader can confirm they hold the same file.",
      ),
    ],
  },

  /* ---------- 4 · Results ---------- */
  {
    id: "RES-0",
    sec: "RES",
    n: "4",
    w: "r",
    job: "How the results are reported.",
    uses: ["Table 1"],
    s: [
      T(
        "M",
        "We report the three confirmatory analyses in the order of the plan. Values are means over the five splits, intervals are 95% paired-bootstrap intervals over test students unless stated otherwise, and every number names the row of the results table it comes from. ",
      ),
      T(
        "M",
        "Table 1 gives each model's scores, and Table 2 at the end of the section lists each hypothesis with its outcome. Section 4.4 states what the record does not allow us to report, and Section 4.5 holds the exploratory analyses, apart from the confirmatory results.",
      ),
    ],
  },
  {
    id: "RES-1",
    sec: "RES",
    n: "4.1",
    sub: "First-semester results",
    w: "r",
    job: "Finding 1: first-semester results against enrolment data.",
    uses: ["rows 6–15", "row 21"],
    claim: "F1",
    s: [
      T(
        "F1",
        "Across five splits of {726|row 1} «g1» students each, adding first-semester results found more of the students who dropped out than «sc». ",
      ),
      T(
        "F1",
        "Recall at 20% flagged rose from {0.396|rows 6–10} with GB-E to {0.507|rows 11–15} with GB-ES1, a gain of {0.111|row 21} (95% CI {0.092 to 0.129|row 21}; Table 1).«strat» ",
      ),
      T("F1", "The gain exceeds the 0.05 the plan required, so A1 supports H1."),
    ],
  },
  { id: "TAB1", sec: "RES", kind: "table" },
  {
    id: "RES-1b",
    sec: "RES",
    n: "4.1",
    k: 2,
    w: "r",
    job: "Finding 1, split by split, and the ceiling.",
    uses: ["row 21", "analysis.json"],
    claim: "F1",
    s: [
      T(
        "F1",
        "The gain was steady across splits, from {0.092|analysis.json} in the smallest case to {0.130|analysis.json} in the largest. ",
      ),
      T(
        "F1",
        "GB-ES1 came within {0.004|rows 11–15} of the highest recall the measure allows, {0.511|analysis.json}, so nearly every student it flagged went on to drop out. ",
      ),
      T("M", "Because the comparison is paired, each split scores both models on the same students."),
    ],
  },
  {
    id: "RES-1c",
    sec: "RES",
    n: "4.1",
    k: 3,
    w: "r",
    job: "Finding 1 with courses resampled.",
    uses: ["row 24"],
    claim: "F1",
    s: [
      T(
        "F1",
        "Resampling courses rather than students, as the plan specified for students who share a course and a cohort, widens the interval to {0.081 to 0.146|row 24}. ",
      ),
      T(
        "F1",
        "It still excludes zero and still lies mostly above 0.05, so the support for H1 does not rest on treating students as independent.",
      ),
    ],
  },
  {
    id: "RES-1d",
    sec: "RES",
    n: "4.1",
    k: 4,
    w: "r",
    job: "The secondary measures for the same comparison.",
    uses: ["rows 6–15"],
    s: [
      T(
        "F1",
        "The secondary measures agree. AUROC rose from {0.788|rows 6–10} to {0.923|rows 11–15}, and the Brier score fell from {0.179|rows 6–10} to {0.097|rows 11–15}, so the scores of GB-ES1 also serve better as probabilities. ",
      ),
      T("M", "The plan set no hypothesis on these measures, and we give them without intervals."),
    ],
  },
  {
    id: "RES-1e",
    sec: "RES",
    n: "4.1",
    k: 5,
    w: "r",
    job: "Sensitivity: the undated columns added.",
    uses: ["row 26", "rows 16–20"],
    s: [
      T(
        "F1",
        "Adding the three undated columns to GB-ES1 changed recall by {0.002|row 26} (95% CI {−0.001 to 0.008|row 26}). ",
      ),
      T(
        "F1",
        "Once first-semester results are in the model, the fee and scholarship columns add almost nothing to the ranking, so leaving them out costs little. ",
      ),
      T("M", "This is a sensitivity analysis, not a test, and it supports no claim of its own."),
    ],
  },
  {
    id: "RES-2",
    sec: "RES",
    n: "4.2",
    sub: "By admission grade",
    w: "r",
    job: "Finding 2: the gain in each admission group.",
    uses: ["rows 39–40"],
    claim: "F2",
    s: [
      T(
        "F2",
        "The gain appeared in both admission groups: {0.098|row 39} (95% CI {0.058 to 0.128|row 39}) for students admitted below the median grade and {0.129|row 40} ({0.091 to 0.176|row 40}) for those above it (Figure 2).",
      ),
    ],
  },
  { id: "FIG2", sec: "RES", kind: "figure" },
  {
    id: "RES-2b",
    sec: "RES",
    n: "4.2",
    k: 2,
    w: "r",
    job: "Finding 2: the difference and its interval.",
    uses: ["row 22"],
    claim: "F2",
    s: [
      T("F2", "The difference between the two gains was {−0.031|row 22} (95% CI {−0.109 to 0.027|row 22}). "),
      T(
        "F2",
        "Its interval includes zero, so A2 does not support H2: the gain was not larger for students admitted with lower grades. ",
      ),
      T("F2", "The estimate points the other way, but the interval is wide, and we do not read the sign as a finding."),
    ],
  },
  {
    id: "RES-2c",
    sec: "RES",
    n: "4.2",
    k: 3,
    w: "r",
    job: "How the groups were formed, and what they may stand for.",
    uses: ["analysis.json · splits", "Toulmin F2"],
    claim: "F2",
    s: [
      T(
        "M",
        "Each split used the median admission grade of its own training part, between {126.3|analysis.json} and {126.8|analysis.json}, fixed before any result was seen. ",
      ),
      T(
        "LIM",
        "Admission grade is linked to the course a student entered, because courses differ in their entry requirements, so the two groups also differ in their mix of courses. We did not separate the two.",
      ),
    ],
  },
  {
    id: "RES-3",
    sec: "RES",
    n: "4.3",
    sub: "Boosting and logistic regression",
    w: "r",
    job: "Finding 3: no clear gain from boosting on enrolment data.",
    uses: ["rows 1–10", "row 23"],
    claim: "F3",
    s: [
      T(
        "F3",
        "On enrolment data, we found no clear gain from boosting over logistic regression: recall at 20% flagged was {0.396|rows 6–10} for GB-E and {0.392|rows 1–5} for LR-E, a difference of {0.004|row 23} (95% CI {−0.007 to 0.021|row 23}).",
      ),
    ],
  },
  {
    id: "RES-3b",
    sec: "RES",
    n: "4.3",
    k: 2,
    w: "r",
    job: "Finding 3: what A3 says about H4.",
    uses: ["row 23", "row 25"],
    claim: "F3",
    s: [
      T("F3", "The interval includes zero, so A3 does not support H4. "),
      T(
        "F3",
        "Its upper end lies well below the 0.06 the plan expected to detect, so a large gain is unlikely; a small one cannot be ruled out, and we do not conclude that the two models are equal. ",
      ),
      T("F3", "Resampling courses gives a similar interval, {−0.005 to 0.024|row 25}."),
    ],
  },
  {
    id: "RES-3c",
    sec: "RES",
    n: "4.3",
    k: 3,
    w: "r",
    job: "The secondary measures for the same comparison.",
    uses: ["rows 1–10"],
    claim: "F3",
    s: [
      T(
        "F3",
        "The secondary measures tell the same story. AUROC was {0.783|rows 1–5} for logistic regression and {0.788|rows 6–10} for boosting, and the Brier scores were {0.182|rows 1–5} and {0.179|rows 6–10}. ",
      ),
      T("F3", "On these inputs the two models rank and score students alike."),
    ],
  },
  {
    id: "RES-4",
    sec: "RES",
    n: "4.4",
    sub: "Change across cohorts",
    w: "r",
    job: "Whether the gain holds for later cohorts.",
    uses: [],
    blocked: true,
    s: [],
  },
  { id: "FIG4", sec: "RES", kind: "excluded" },
  {
    id: "RES-5",
    sec: "RES",
    n: "4.5",
    sub: "Exploratory analyses",
    w: "r",
    job: "A4, exploratory: recall by course.",
    uses: ["rows 28–38"],
    s: [
      T(
        "EXP",
        "This section is exploratory. A4, named in the plan without a hypothesis, gives the recall of GB-ES1 for the 11 courses with at least 30 test students in every split. ",
      ),
      T(
        "EXP",
        "In ten of them it ranged from {0.328|row 30} to {0.690|row 38}. In course 171, with about {34|row 28} test students per split, no dropout was among the flagged students in any split ({0.0|row 28}). ",
      ),
      T(
        "EXP",
        "Because flags are set over the whole test part, a course whose dropouts look less at risk than other courses' students can be missed entirely. We cannot say from the record whether this reflects the course, its students or how few dropouts it holds.",
      ),
    ],
  },
  {
    id: "RES-5b",
    sec: "RES",
    n: "4.5",
    k: 2,
    w: "r",
    job: "A5, exploratory: flagged dropouts with no evaluation.",
    uses: ["row 27"],
    when: "a4",
    s: [
      T(
        "EXP",
        "A second exploratory analysis, A5, was added after the first run. Of the dropouts GB-ES1 flagged, {22%|row 27} had sat no evaluation in the first semester. ",
      ),
      T(
        "EXP",
        "These students may have stopped attending before the ranking is made, and for them the list arrives late. We report this as a caveat on Section 4.1, not as a finding.",
      ),
    ],
  },
  {
    id: "RES-6",
    sec: "RES",
    n: "4.6",
    sub: "The hypotheses in summary",
    w: "r",
    job: "Each primary hypothesis and what became of it.",
    uses: ["A1–A3", "Table 2"],
    s: [
      T(
        "C",
        "Table 2 lists each primary hypothesis with its analysis and its outcome. One of the three was supported: first-semester results found more of the students who dropped out (H1). ",
      ),
      T("F2", "The gain was not larger below the median admission grade (H2). "),
      T(
        "F3",
        "On enrolment data, boosting showed no clear gain over logistic regression (H4). No secondary hypothesis was tested.",
      ),
    ],
  },
  { id: "TAB2", sec: "RES", kind: "table2" },

  /* ---------- 5 · Discussion ---------- */
  {
    id: "DIS-1",
    sec: "DIS",
    n: "5.1",
    sub: "What the findings mean",
    w: "d",
    job: "What the results mean for an early-warning list.",
    uses: ["Findings 1–3"],
    claim: "C",
    s: [
      T(
        "C",
        "These results ⟨f1⟩ that first-semester results find more of the students who drop out, and ⟨f2⟩ that the gain «dis». ",
      ),
      T(
        "F3",
        "Because we find ⟨f3⟩ from boosting on enrolment data, we read the gain as coming from the inputs rather than from the model.",
      ),
      T("X", "«drift»"),
    ],
  },
  {
    id: "DIS-1b",
    sec: "DIS",
    n: "5.1",
    k: 2,
    w: "d",
    job: "Why the first semester adds what enrolment data cannot.",
    uses: ["F1", "Tinto, 1975"],
    claim: "C",
    s: [
      T(
        "C",
        "The first semester adds what enrolment data cannot: how a student is actually doing. Units approved and grades earned reflect effort, attendance and fit with the course, which is close to what integration accounts of dropout describe [2] and to what earlier studies found most predictive [3][4][5]. ",
      ),
      T(
        "C",
        "Enrolment data carry some of this through prior grades, but only as a forecast made before the student has sat a single course.",
      ),
    ],
  },
  {
    id: "DIS-1c",
    sec: "DIS",
    n: "5.1",
    k: 3,
    w: "d",
    job: "Why the model mattered less, and what was not tested.",
    uses: ["F3", "Christodoulou et al., 2019"],
    claim: "C",
    s: [
      T(
        "C",
        "The model mattered less. On enrolment data a flexible learner added nothing we could detect over logistic regression, in line with comparisons in clinical prediction [11] and with corrected comparisons in other fields [7]. ",
      ),
      T(
        "C",
        "Where the inputs are few and mostly categorical, as here, there may be little structure for boosting to find that a linear model misses. ",
      ),
      T(
        "LIM",
        "We did not fit logistic regression to first-semester results, so we cannot say whether boosting adds anything once they are included.",
      ),
    ],
  },
  {
    id: "DIS-1d",
    sec: "DIS",
    n: "5.1",
    k: 4,
    w: "d",
    job: "How close the ranking came to its ceiling.",
    uses: ["rows 11–15", "analysis.json"],
    claim: "C",
    s: [
      T(
        "C",
        "The size of the gain also limits what further models could show. GB-ES1 came within 0.004 of the highest recall the measure allows, so at a 20% flag rate a better model on the same inputs could add little. ",
      ),
      T(
        "LIM",
        "Differences between models would show more clearly at a smaller flag rate, which the plan did not include.",
      ),
    ],
  },
  {
    id: "DIS-1e",
    sec: "DIS",
    n: "5.1",
    k: 5,
    w: "d",
    job: "What the findings do not show.",
    uses: ["SP-13 blocked", "Salganik et al., 2020"],
    s: [
      T(
        "LIM",
        "The findings concern the ranking, not what advisers do with it. A list that finds more dropouts helps only if contact changes what students do, and nothing in this record measures that. ",
      ),
      T(
        "LIM",
        "The ranking also says who is at risk, not why: it supports no claim about causes, and predicting an outcome well is not the same as understanding it [17].",
      ),
    ],
  },
  {
    id: "DIS-2",
    sec: "DIS",
    n: "5.2",
    sub: "Limitations",
    w: "d",
    job: "Limits of this study.",
    uses: ["SP-14", "SP-15", "SP-16"],
    s: [
      T(
        "LIM",
        "We study one polytechnic over 11 cohorts, and students share courses and cohorts, so we also report intervals that resample courses. ",
      ),
      T("LIM", "«om»"),
      T("LIM", "The record has no entry year, so we make no claim about change across cohorts."),
      T("LIM", " H3 was planned as a primary hypothesis but was not run; we report it as not tested.", {
        when: "orphan",
      }),
      T("LIM", " Our analysis plan was fixed after the first runs, so every analysis here is exploratory.", {
        when: "late",
      }),
    ],
  },
  {
    id: "DIS-2b",
    sec: "DIS",
    n: "5.2",
    k: 2,
    w: "d",
    job: "How far the conclusion reaches.",
    uses: ["SP-14", "K04"],
    s: [
      T(
        "LIM",
        "The students of one Portuguese polytechnic in 2008/09–2018/19 may differ from those of other institutions, countries or later years in how they are admitted, taught and assessed. ",
      ),
      T(
        "LIM",
        "We therefore limit our conclusion to entrants to this polytechnic in those years, and make no claim about use elsewhere.",
      ),
    ],
  },
  {
    id: "DIS-2c",
    sec: "DIS",
    n: "5.2",
    k: 3,
    w: "d",
    job: "Who the exclusion leaves out.",
    uses: ["MET-1c", "Plan §8"],
    s: [
      T(
        "LIM",
        "Excluding the 794 students still enrolled removes those whose outcome was unknown when the record closed. They are likely to come from recent cohorts and to include slow but persistent students. ",
      ),
      T(
        "LIM",
        "The analysed population therefore leans toward earlier cohorts and clearer outcomes, and recall among students like those excluded could be lower.",
      ),
    ],
  },
  {
    id: "DIS-2d",
    sec: "DIS",
    n: "5.2",
    k: 4,
    w: "d",
    job: "The change to the plan, and the columns left out.",
    uses: ["Deviation D1", "row 26"],
    s: [
      T(
        "LIM",
        "The boosting runs we report handled categorical codes differently from the plan (D1); repeating them as planned left every verdict unchanged. ",
      ),
      T(
        "LIM",
        "We kept three undated columns out of the primary models. Adding them changed little here, but a model built without knowing their timing could look better on a test set than it would be in use.",
      ),
    ],
  },
  {
    id: "DIS-2e",
    sec: "DIS",
    n: "5.2",
    k: 5,
    w: "d",
    job: "The flag rate and the outcome definition.",
    uses: ["Plan §6", "Data report B.8"],
    s: [
      T(
        "LIM",
        "We report one flag rate, 20%, the one the plan named. A smaller rate would test the ranking harder and might separate models that look alike here. ",
      ),
      T(
        "LIM",
        "The outcome is each student's status at the end of the normal duration of their course, as the institution recorded it; we could not check how transfers between courses were counted.",
      ),
    ],
  },
  {
    id: "DIS-3",
    sec: "DIS",
    n: "5.3",
    sub: "Implications",
    w: "d",
    job: "What the institution can take from this.",
    uses: ["SP-12"],
    claim: "C",
    s: [
      T(
        "IMP",
        "For this institution, the results support producing the ranking after the first semester rather than at enrolment, and contacting the fifth of students it flags. On enrolment data, logistic regression ranked students as well as boosting did. ",
      ),
      T(
        "LIM",
        "About a fifth of the dropouts found had sat no first-semester evaluation, so part of the list may reach students who have already left; attendance data could reach them sooner.",
        { when: "a4" },
      ),
      T("LIM", "Whether the list reaches students in time is a question this record cannot answer.", {
        when: "a4drop",
      }),
    ],
  },
  {
    id: "DIS-3b",
    sec: "DIS",
    n: "5.3",
    k: 2,
    w: "d",
    job: "What evaluation practice can take from this.",
    uses: ["Plan §3", "Saito & Rehmsmeier, 2015"],
    s: [
      T(
        "IMP",
        "For evaluation practice, two points carry beyond this study. First, an early-warning model should be scored the way it is used: at the share of students advisers can contact, against the highest value that share allows. ",
      ),
      T(
        "IMP",
        "Second, every input should be dated to the decision point before any model is fit. The three undated columns here are the kind a later reader cannot check, and the paper should say what was done with them.",
      ),
    ],
  },

  /* ---------- 6 · Conclusion ---------- */
  {
    id: "CON-1",
    sec: "CON",
    n: "6.1",
    w: "d",
    job: "The take-away in two sentences.",
    uses: ["Conclusion"],
    s: [
      T(
        "C",
        "For entrants to this polytechnic, first-semester results find more of the students who later drop out than data known at enrolment. ",
      ),
      T("F3", "Whether boosting adds anything over logistic regression on enrolment data remains open."),
    ],
  },
  {
    id: "CON-2",
    sec: "CON",
    n: "6.2",
    w: "d",
    job: "What the study set out to do, and what it found.",
    uses: ["F1", "F2", "F3"],
    s: [
      T(
        "C",
        "We set out to test, under a plan locked before any model was fit, when an early-warning ranking should be made and which model should make it. ",
      ),
      T(
        "C",
        "Waiting for the first semester raised recall at 20% flagged by {0.111|row 21}, and the gain was clear in both admission groups. The choice between boosting and logistic regression on enrolment data made no difference we could detect.",
      ),
    ],
  },
  {
    id: "CON-3",
    sec: "CON",
    n: "6.3",
    w: "d",
    job: "What should be done next.",
    uses: ["Plan · deferred hypotheses"],
    s: [
      T(
        "IMP",
        "Three lines of work follow. The deferred hypotheses need data this record lacks: an entry year, to test whether a model trained on earlier cohorts holds for later ones. A study of what advisers do with the list would show whether better recall matters to students. ",
      ),
      T(
        "IMP",
        "And the same protocol, with dated inputs and a measure set by advisers' capacity, can be applied to other institutions' records, which would show whether these findings belong to the first semester or to this polytechnic.",
      ),
    ],
  },
];

/* ACM style, in order of first citation; 21 cited, 1 quarantined at S02 and never cited */
export const REFS: string[] = [
  "Realinho, V., Machado, J., Baptista, L., Martins, M. V. (2022). Predicting student dropout and academic success. Data 7(11), 146.",
  "Tinto, V. (1975). Dropout from higher education: A theoretical synthesis of recent research. Review of Educational Research 45(1), 89–125.",
  "Dekker, G. W., Pechenizkiy, M., Vleeshouwers, J. M. (2009). Predicting students drop out: A case study. Proceedings of the 2nd International Conference on Educational Data Mining, 41–50.",
  "Berens, J., Schneider, K., Görtz, S., Oster, S., Burghoff, J. (2019). Early detection of students at risk: Predicting student dropouts using administrative student data from German universities and machine learning methods. Journal of Educational Data Mining 11(3), 1–41.",
  "Kemper, L., Vorhoff, G., Wigger, B. U. (2020). Predicting student dropout: A machine learning approach. European Journal of Higher Education 10(1), 28–47.",
  "Kaufman, S., Rosset, S., Perlich, C., Stitelman, O. (2012). Leakage in data mining: Formulation, detection, and avoidance. ACM Transactions on Knowledge Discovery from Data 6(4), 15.",
  "Kapoor, S., Narayanan, A. (2023). Leakage and the reproducibility crisis in machine-learning-based science. Patterns 4(9), 100804.",
  "Kapoor, S., Cantrell, E. M., Peng, K., et al. (2024). REFORMS: Consensus-based recommendations for machine-learning-based science. Science Advances 10(18), eadk3452.",
  "Grinsztajn, L., Oyallon, E., Varoquaux, G. (2022). Why do tree-based models still outperform deep learning on typical tabular data? NeurIPS Datasets and Benchmarks.",
  "Aulck, L., Velagapudi, N., Blumenstock, J., West, J. (2016). Predicting student dropout in higher education. arXiv:1606.06364.",
  "Christodoulou, E., Ma, J., Collins, G. S., Steyerberg, E. W., Verbakel, J. Y., Van Calster, B. (2019). A systematic review shows no performance benefit of machine learning over logistic regression for clinical prediction models. Journal of Clinical Epidemiology 110, 12–22.",
  "Rudin, C. (2019). Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead. Nature Machine Intelligence 1(5), 206–215.",
  "Martins, M. V., Tolledo, D., Machado, J., Baptista, L. M. T., Realinho, V. (2021). Early prediction of student’s performance in higher education: A case study. Trends and Applications in Information Systems and Technologies, Springer, 166–175.",
  "van den Akker, O. R., Weston, S., Campbell, L., et al. (2021). Preregistration of secondary data analysis: A template and tutorial. Meta-Psychology 5, MP.2020.2625.",
  "Gebru, T., Morgenstern, J., Vecchione, B., Wortman Vaughan, J., Wallach, H., Daumé III, H., Crawford, K. (2021). Datasheets for datasets. Communications of the ACM 64(12), 86–92.",
  "Ke, G., Meng, Q., Finley, T., Wang, T., Chen, W., Ma, W., Ye, Q., Liu, T.-Y. (2017). LightGBM: A highly efficient gradient boosting decision tree. Advances in Neural Information Processing Systems 30.",
  "Salganik, M. J., Lundberg, I., Kindel, A. T., et al. (2020). Measuring the predictability of life outcomes with a scientific mass collaboration. Proceedings of the National Academy of Sciences 117(15), 8398–8403.",
  "Saito, T., Rehmsmeier, M. (2015). The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets. PLOS ONE 10(3), e0118432.",
  "Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. Monthly Weather Review 78(1), 1–3.",
  "Pedregosa, F., Varoquaux, G., Gramfort, A., et al. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research 12, 2825–2830.",
  "Efron, B., Tibshirani, R. J. (1993). An Introduction to the Bootstrap. Chapman & Hall/CRC.",
];

/* ---------- the draft measured as written, so every count shown elsewhere is the text's own ---------- */
export const PAPER_STATS = (() => {
  const base: Record<string, boolean> = { notorphan: true, notlate: true, a4: true };
  const on = (x: { when?: string }) => !x.when || base[x.when];
  const piece = (x: Piece) =>
    typeof x === "string" ? x : "n" in x ? x.n : "c" in x ? "" : "r" in x ? x.t : "indicate";
  const words = (p: Para) =>
    (p.s ?? [])
      .filter(on)
      .map((s) => s.x.map(piece).join(""))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
  const sec: Record<string, number> = {};
  const lens: number[] = [];
  let cites = 0;
  for (const p of PARAS) {
    if (!p.s?.length || !on(p)) continue;
    const w = words(p);
    sec[p.sec] = (sec[p.sec] ?? 0) + w;
    if (p.sec !== "ABS") lens.push(w);
    cites += p.s.filter(on).reduce((n, s) => n + s.x.filter((x) => typeof x !== "string" && "c" in x).length, 0);
  }
  lens.sort((a, b) => a - b);
  const total = Object.values(sec).reduce((a, b) => a + b, 0);
  return {
    sec,
    total,
    body: total - sec.ABS,
    abs: sec.ABS,
    paras: lens.length,
    median: lens[lens.length >> 1],
    cites: cites / lens.length,
  };
})();
{
  const P = PAPER_STATS;
  const pct = (k: string) => Math.round((P.sec[k] / P.body) * 1000) / 10;
  const set = (k: string, v: number) => {
    const row = FIT.find((r) => r[0] === k);
    if (row) row[7] = v;
  };
  for (const [name, k] of [
    ["Introduction", "INT"],
    ["Related work", "REL"],
    ["Method", "MET"],
    ["Results", "RES"],
    ["Discussion", "DIS"],
  ])
    set(name, pct(k));
  set("Paragraph length", P.median);
  set("Citations", Math.round(P.cites * 10) / 10);
  const len = `${P.total.toLocaleString("en-US")} of 9,000 words`;
  FIT_RULES[0][1] = len;
  FIT_RULES[1][1] = `structured, ${P.abs} of 250 words`;
  FIT_RULES[5][1] = `ACM style, ${REFS.length} cited`;
  CHECKS[0][1] = len;
  CHECKS[1][1] = `${P.abs} of 250 words, structured`;
  CHECKS[3][1] = `${REFS.length + 1} checked · ${REFS.length} cited · 1 quarantined since S02`;
  /* every value outside the journal's usual range is reported with its reason, never forced into it */
  const why: Record<string, string> = {
    "Related work": "Reported, not cut; a reviewer may ask.",
    Results: "Only the three planned analyses are findings; nothing was added to fill the space.",
    Method: "The plan, the dated inputs and the change to the plan all need stating.",
    Introduction: "The gap is argued from three strands: early results, leakage and the choice of model.",
    "Paragraph length": "Each paragraph does one job from its contract; merging would mix jobs.",
  };
  EXCEPTIONS.length = 0;
  for (const [k, unit, , , q1, q3, , v] of FIT) {
    if ((v < q1 || v > q3) && why[k])
      EXCEPTIONS.push([`${k} is ${v}${unit.startsWith("%") ? "%" : ` ${unit}`}`, `Typical is ${q1}–${q3}. ${why[k]}`]);
  }
  EXCEPTIONS.push([
    "Discussion has no comparison move",
    "No prior result uses this protocol, so there is nothing to compare with.",
  ]);
}
