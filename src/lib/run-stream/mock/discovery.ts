// Example data for pipeline stages 1 to 8 of the mock run: scoping the question, finding and reading the
// literature, and debating hypotheses. Every value here is what Popper would report through the event stream.

import type {
  Cluster,
  DebateTurn,
  Estimate,
  EstimateCheck,
  FeasibilityCheck,
  Gap,
  GoalField,
  KnowledgeCard,
  LiteratureSource,
  NoveltyCheck,
  Opportunity,
  RejectedPaper,
  ScopeRisk,
  ScreenPoint,
  SearchQuery,
  SearchStrategy,
  ShortlistPaper,
  Skill,
  SourceRecord,
  SubQuestion,
  Tension,
  TestDesign,
  TopicScores,
} from "../contract";

// ---------- skills matched per screen ----------

export const SKILLS: Record<string, Skill[]> = {
  scope: [
    { id: "domain/sleep-cognition", name: "Sleep and cognition", category: "domain", matched: ["sleep", "exam"] },
    {
      id: "experiment/observational",
      name: "Observational designs",
      category: "experiment",
      matched: ["undergraduates", "survey"],
    },
    { id: "tooling/compute-profile", name: "Compute profiler", category: "tooling", matched: [] },
  ],
  search: [
    { id: "tooling/academic-query", name: "Academic query engineering", category: "tooling", matched: [] },
    { id: "tooling/scholarly-apis", name: "Scholarly search connectors", category: "tooling", matched: [] },
  ],
  screen: [{ id: "domain/gatekeeper", name: "Domain gatekeeper", category: "domain", matched: ["sleep", "students"] }],
  read: [{ id: "writing/evidence-extraction", name: "Evidence extraction", category: "writing", matched: [] }],
  synthesize: [
    { id: "writing/dialectical-synthesis", name: "Dialectical synthesis", category: "writing", matched: [] },
    { id: "domain/sleep-cognition", name: "Sleep and cognition", category: "domain", matched: ["memory", "stress"] },
  ],
  hypothesize: [
    { id: "experiment/falsifiability", name: "Popperian falsifiability", category: "experiment", matched: [] },
    { id: "experiment/debate", name: "Perspective debate", category: "experiment", matched: [] },
    { id: "tooling/novelty", name: "Novelty check", category: "tooling", matched: [] },
  ],
  experiment: [
    {
      id: "experiment/regression",
      name: "Regression and mediation",
      category: "experiment",
      matched: ["exam score", "stress"],
    },
    { id: "tooling/sandbox", name: "Python sandbox", category: "tooling", matched: [] },
  ],
};

// ---------- stage 1: topic init ----------

export const DOMAINS = ["Sleep science", "Educational psychology", "Survey statistics"];

export const COMPUTE = {
  label: "CPU sandbox · 4 cores · 16 GB · no GPU",
  detail: "Regression, mediation and bootstraps finish in minutes. Nothing in this question needs a GPU.",
};

export const GOAL: { field: GoalField; label: string; value: string }[] = [
  {
    field: "title",
    label: "Working title",
    value: "Sleep, Stress and Study Time: What Links Sleep to Exam Scores in Undergraduates",
  },
  {
    field: "problem",
    label: "Problem",
    value:
      "Students who sleep more tend to score higher, but the same students also study more and report less stress. It is unclear how much of the link is sleep itself.",
  },
  {
    field: "objective",
    label: "Objective",
    value:
      "Estimate the exam-score gap between students sleeping 7 h or more and those sleeping less, and how much of it runs through stress and study time.",
  },
  {
    field: "scope",
    label: "Scope",
    value: "Everything that could explain the link, including caffeine, exam timing and diet.",
  },
  {
    field: "success",
    label: "Success criteria",
    value:
      "Each sub-question gets one number with a 95% range, and the write-up says plainly what that number does and doesn't show.",
  },
];

export const SCOPE_ADJUSTED = {
  field: "scope" as const,
  to: "Sleep, stress, study time and screen time in undergraduates. Caffeine, diet and exam timing become stated limits.",
  reason: "Each of those is a literature of its own and would triple the search without answering your topic.",
};

export const ESTIMATES: Estimate[] = [
  { id: "E1", text: "Sleep accounts for roughly a quarter of the variation in grades." },
  { id: "E2", text: "Short sleepers score about 10 points lower." },
];

export const ESTIMATE_CHECKS: (EstimateCheck & { after: string })[] = [
  {
    estimate_id: "E1",
    status: "verified",
    source: "Okano et al., 2019",
    note: "Sleep measures explained nearly 25% of the variance in grades.",
    after: "okano2019",
  },
  {
    estimate_id: "E2",
    status: "unsupported",
    note: "No shortlisted paper reports a gap this size on a 0–100 exam. Dropped; the run will measure it instead.",
    after: "dewald2010",
  },
];

// ---------- stage 2: problem decompose ----------

export const SUB_QUESTIONS: SubQuestion[] = [
  {
    id: "SQ1",
    text: "Do students who sleep 7 h or more score higher, once study, stress and screen time are held equal?",
    tests: "Exam score, 7 h or more vs less, others held equal",
    priority: 1,
    covers: ["more sleep go with higher exam scores", "our undergraduates"],
  },
  {
    id: "SQ2",
    text: "Does stress carry part of the link?",
    tests: "Sleep → stress → exam score",
    priority: 2,
    covers: ["what explains it"],
  },
  {
    id: "SQ3",
    text: "Does study time carry part of the link?",
    tests: "Sleep effect with and without study time",
    priority: 3,
    covers: ["what explains it"],
  },
  {
    id: "SQ4",
    text: "Do other habits, like screen time, explain scores on their own?",
    tests: "Exam score against daily screen time",
    priority: 4,
    covers: ["what explains it"],
  },
];

export const RISKS: ScopeRisk[] = [
  { id: "R1", sq_id: "SQ1", text: "Strong students may simply sleep more", level: "medium" },
  { id: "R2", sq_id: "SQ2", text: "Stress and sleep are usually asked at the same time", level: "high" },
  { id: "R3", sq_id: "SQ3", text: "Study hours are usually self-reported", level: "low" },
  { id: "R4", sq_id: "SQ4", text: "Screen time is often guessed, not logged", level: "low" },
];

/**
 * How each finding bears on the claim of its school of thought. Dewald 2010 contradicts part of C1: in its pooled
 * studies, sleep length mattered less than sleepiness and quality.
 */
export const EVIDENCE_LINKS: {
  card: string;
  claim: string;
  relation: "supports" | "contradicts";
  rationale: string;
}[] = [
  { card: "okano2019", claim: "C1", relation: "supports", rationale: "Sleep explained nearly a quarter of grades." },
  { card: "gilbert2010", claim: "C1", relation: "supports", rationale: "Poorer sleep went with lower GPA." },
  { card: "curcio2006", claim: "C1", relation: "supports", rationale: "Sleep loss weakened academic results." },
  { card: "wolfson1998", claim: "C1", relation: "supports", rationale: "Students with lower grades slept less." },
  {
    card: "dewald2010",
    claim: "C1",
    relation: "contradicts",
    rationale:
      "Sleep length linked to performance more weakly than sleepiness and quality, so more sleep alone may not help.",
  },
  {
    card: "diekelmann2010",
    claim: "C2",
    relation: "supports",
    rationale: "Sleep consolidated newly learned memories.",
  },
  {
    card: "walker2006",
    claim: "C2",
    relation: "supports",
    rationale: "Sleep stages each supported a kind of learning.",
  },
  { card: "pilcher1996", claim: "C2", relation: "supports", rationale: "Losing sleep clearly lowered performance." },
  {
    card: "hershner2014",
    claim: "C3",
    relation: "supports",
    rationale: "Stress, screens and schedules drove short sleep.",
  },
  {
    card: "lund2010",
    claim: "C3",
    relation: "supports",
    rationale: "Stress was the strongest predictor of poor sleep.",
  },
  { card: "levenson2016", claim: "C3", relation: "supports", rationale: "Social media use went with disturbed sleep." },
  { card: "baron1986", claim: "C4", relation: "supports", rationale: "Sets out the steps a mediation test follows." },
];

/** Which claims give each hypothesis its rationale, and which challenge it. */
export const RATIONALES: {
  claim: string;
  hypothesis: string;
  polarity: "supports" | "challenges";
  rationale: string;
}[] = [
  {
    claim: "C1",
    hypothesis: "H1",
    polarity: "supports",
    rationale: "If more sleep goes with better grades, students sleeping 7 h or more should score higher.",
  },
  {
    claim: "C2",
    hypothesis: "H1",
    polarity: "supports",
    rationale: "Memory consolidation gives a reason sleep would raise exam scores.",
  },
  {
    claim: "C3",
    hypothesis: "H1",
    polarity: "challenges",
    rationale: "If stress and workload shape sleep, part of the sleep–score link may belong to them, not to sleep.",
  },
  {
    claim: "C3",
    hypothesis: "H2",
    polarity: "supports",
    rationale: "Stress and sleep move together in students, so stress can sit on the path from sleep to scores.",
  },
  {
    claim: "C4",
    hypothesis: "H2",
    polarity: "supports",
    rationale: "Mediation is how a path through stress is told apart from a direct effect.",
  },
  {
    claim: "C3",
    hypothesis: "H3",
    polarity: "supports",
    rationale: "Screens disturb student sleep, one route by which they could lower scores.",
  },
  {
    claim: "C1",
    hypothesis: "H4",
    polarity: "supports",
    rationale: "The sleep–grades link is shown mostly up to age 22; H4 asks whether it grows after 25.",
  },
  {
    claim: "C3",
    hypothesis: "H5",
    polarity: "supports",
    rationale: "Workload shapes sleep, so study hours may carry part of what looks like a sleep effect.",
  },
  {
    claim: "C1",
    hypothesis: "H6",
    polarity: "supports",
    rationale: "If sleep goes with grades, it is worth asking whether it does so equally for men and women.",
  },
];

/** Who is studied and where: the research setting on the map's canvas. */
export const SETTING: { text: string; refs: string[] }[] = [
  { text: "Undergraduates at one university, the population the topic names.", refs: ["topic"] },
  {
    text: "This age group is where stress as the link is least tested, and exams come at regular, known times.",
    refs: ["G2"],
  },
];

export const TOPIC_SCORES: TopicScores = { novelty: 7, specificity: 9, feasibility: 9 };

export const TOPIC_ADVICE =
  "Clear, and doable on a CPU. Name the 7-hour cut-off up front so SQ1 is one test, and say plainly that this shows links, not causes.";

// ---------- stage 3: search strategy ----------

export const STRATEGIES: SearchStrategy[] = [
  { id: "S1", title: "The link itself", why: "Studies of sleep and grades in college students." },
  { id: "S2", title: "What could explain it", why: "Stress, study time and screens as the links." },
  { id: "S3", title: "Why sleep should matter", why: "The biology and the meta-analyses behind it." },
];

export const QUERIES: SearchQuery[] = [
  { id: "q1", strategy_id: "S1", text: "sleep duration academic performance" },
  { id: "q2", strategy_id: "S1", text: "college students sleep grades" },
  { id: "q3", strategy_id: "S1", text: "sleep exam scores undergraduates" },
  { id: "q4", strategy_id: "S2", text: "sleep stress students mediation" },
  { id: "q5", strategy_id: "S2", text: "study time sleep tradeoff" },
  { id: "q6", strategy_id: "S2", text: "screen time sleep students" },
  { id: "q7", strategy_id: "S3", text: "sleep deprivation performance meta-analysis" },
  { id: "q8", strategy_id: "S3", text: "sleep memory consolidation" },
];

export const SOURCES: LiteratureSource[] = [
  { id: "openalex", name: "OpenAlex" },
  { id: "s2", name: "Semantic Scholar" },
  { id: "arxiv", name: "arXiv" },
];

/** Hits per query, in source order. arXiv has little on this topic. */
export const HITS: Record<string, [number, number, number]> = {
  q1: [41, 36, 2],
  q2: [38, 31, 1],
  q3: [22, 19, 0],
  q4: [17, 14, 1],
  q5: [12, 9, 0],
  q6: [21, 18, 3],
  q7: [15, 13, 0],
  q8: [24, 20, 2],
};

/** Papers found in several sources. The record kept has a DOI first, then the most citations. */
export const MERGED: { title: string; records: SourceRecord[]; kept: string }[] = [
  {
    title:
      "Sleep quality, duration, and consistency are associated with better academic performance in college students",
    records: [
      { source: "OpenAlex", record_id: "openalex:okano2019", citations: 412, has_doi: true },
      { source: "Semantic Scholar", record_id: "s2:okano2019", citations: 398, has_doi: true },
    ],
    kept: "OpenAlex",
  },
  {
    title: "The memory function of sleep",
    records: [
      { source: "OpenAlex", record_id: "openalex:diekelmann2010", citations: 4870, has_doi: true },
      { source: "Semantic Scholar", record_id: "s2:diekelmann2010", citations: 4790, has_doi: true },
      { source: "arXiv", record_id: "arxiv:diekelmann2010", citations: 0, has_doi: false },
    ],
    kept: "OpenAlex",
  },
  {
    title: "Sleep loss, learning capacity and academic performance",
    records: [
      { source: "Semantic Scholar", record_id: "s2:curcio2006", citations: 1490, has_doi: false },
      { source: "OpenAlex", record_id: "openalex:curcio2006", citations: 1530, has_doi: true },
    ],
    kept: "OpenAlex",
  },
];

export const COLLECTED = {
  collected_at: "2026-10-06T07:48:12Z",
  raw: 359,
  unique: 214,
  duplicates: 145,
  files: [
    { name: "Candidate list", detail: "214 papers with abstract, source and citation count" },
    { name: "Reference list", detail: "214 citations, ready for the write-up" },
    { name: "Search log", detail: "hits per query and per source" },
  ],
};

// ---------- stage 5: literature screen ----------

export const SCREEN_RULES = [
  "Domain match",
  "Method relevance",
  "Cross-domain rejection",
  "Recency preference",
  "Seminal papers",
  "Quality floor",
];

export const SHORTLIST: ShortlistPaper[] = [
  {
    id: "okano2019",
    citation: "Okano et al., 2019",
    title:
      "Sleep quality, duration, and consistency are associated with better academic performance in college students",
    venue: "npj Science of Learning",
    year: 2019,
    relevance: 0.95,
    quality: 0.86,
    reason: "Same population and outcome, with measured sleep.",
    doi: "10.1038/s41539-019-0055-z",
    source: "OpenAlex",
    citations: 412,
  },
  {
    id: "gilbert2010",
    citation: "Gilbert & Weaver, 2010",
    title: "Sleep quality and academic performance in university students",
    venue: "J. College Student Psychotherapy",
    year: 2010,
    relevance: 0.89,
    quality: 0.62,
    reason: "University students; sleep quality against GPA.",
    source: "Semantic Scholar",
    citations: 182,
  },
  {
    id: "hershner2014",
    citation: "Hershner & Chervin, 2014",
    title: "Causes and consequences of sleepiness among college students",
    venue: "Nature and Science of Sleep",
    year: 2014,
    relevance: 0.91,
    quality: 0.72,
    reason: "College students; names stress and screens as causes.",
    doi: "10.2147/NSS.S62907",
    source: "OpenAlex",
    citations: 826,
  },
  {
    id: "curcio2006",
    citation: "Curcio, Ferrara & De Gennaro, 2006",
    title: "Sleep loss, learning capacity and academic performance",
    venue: "Sleep Medicine Reviews",
    year: 2006,
    relevance: 0.88,
    quality: 0.83,
    reason: "Review of the sleep–grades link across ages.",
    doi: "10.1016/j.smrv.2005.11.001",
    source: "OpenAlex",
    citations: 1530,
  },
  {
    id: "lund2010",
    citation: "Lund et al., 2010",
    title: "Sleep patterns and predictors of disturbed sleep in a large population of college students",
    venue: "Journal of Adolescent Health",
    year: 2010,
    relevance: 0.86,
    quality: 0.78,
    reason: "Large college sample; stress predicts poor sleep.",
    source: "OpenAlex",
    citations: 1910,
  },
  {
    id: "dewald2010",
    citation: "Dewald et al., 2010",
    title: "The influence of sleep quality, sleep duration and sleepiness on school performance",
    venue: "Sleep Medicine Reviews",
    year: 2010,
    relevance: 0.84,
    quality: 0.9,
    reason: "Meta-analysis; effect sizes to compare against.",
    source: "OpenAlex",
    citations: 1420,
  },
  {
    id: "wolfson1998",
    citation: "Wolfson & Carskadon, 1998",
    title: "Sleep schedules and daytime functioning in adolescents",
    venue: "Child Development",
    year: 1998,
    relevance: 0.79,
    quality: 0.82,
    reason: "The classic sleep–grades study, in high-school students.",
    seminal: true,
    source: "Semantic Scholar",
    citations: 3240,
  },
  {
    id: "levenson2016",
    citation: "Levenson et al., 2016",
    title: "The association between social media use and sleep disturbance among young adults",
    venue: "Preventive Medicine",
    year: 2016,
    relevance: 0.76,
    quality: 0.8,
    reason: "Screens and sleep in young adults.",
    source: "OpenAlex",
    citations: 905,
  },
  {
    id: "pilcher1996",
    citation: "Pilcher & Huffcutt, 1996",
    title: "Effects of sleep deprivation on performance: a meta-analysis",
    venue: "Sleep",
    year: 1996,
    relevance: 0.74,
    quality: 0.88,
    reason: "How much lost sleep hurts performance.",
    doi: "10.1093/sleep/19.4.318",
    seminal: true,
    source: "OpenAlex",
    citations: 1830,
  },
  {
    id: "diekelmann2010",
    citation: "Diekelmann & Born, 2010",
    title: "The memory function of sleep",
    venue: "Nature Reviews Neuroscience",
    year: 2010,
    relevance: 0.72,
    quality: 0.95,
    reason: "Why sleep should help learning.",
    doi: "10.1038/nrn2762",
    source: "OpenAlex",
    citations: 4870,
  },
  {
    id: "walker2006",
    citation: "Walker & Stickgold, 2006",
    title: "Sleep, memory, and plasticity",
    venue: "Annual Review of Psychology",
    year: 2006,
    relevance: 0.71,
    quality: 0.9,
    reason: "Mechanism behind the memory benefit.",
    source: "Semantic Scholar",
    citations: 1610,
  },
  {
    id: "baron1986",
    citation: "Baron & Kenny, 1986",
    title: "The moderator–mediator variable distinction in social psychological research",
    venue: "J. Personality and Social Psychology",
    year: 1986,
    relevance: 0.7,
    quality: 0.97,
    reason: "The standard way to test a link like stress.",
    doi: "10.1037/0022-3514.51.6.1173",
    seminal: true,
    source: "OpenAlex",
    citations: 98400,
  },
];

export const REJECTED: (RejectedPaper & ScreenPoint)[] = [
  {
    id: "rx1",
    title: "Adaptive sleep scheduling for energy-efficient wireless sensor networks",
    venue: "IEEE Sensors Journal",
    false_friend: "sleep",
    reason: "About radios switching to sleep mode, not people.",
    relevance: 0.78,
    quality: 0.74,
  },
  {
    id: "rx2",
    title: "Exam timetabling with integer programming",
    venue: "Computers & Operations Research",
    false_friend: "exam",
    reason: "About scheduling exams, not how students score.",
    relevance: 0.73,
    quality: 0.69,
  },
  {
    id: "rx3",
    title: "CPAP adherence and sleep apnea outcomes in adults over 65",
    venue: "Sleep Medicine",
    false_friend: "sleep",
    reason: "A clinical population far from undergraduates.",
    relevance: 0.75,
    quality: 0.81,
  },
];

/** Scores for every collected paper. The shortlist and the rejected papers are placed where they really scored. */
export function screenPoints(): ScreenPoint[] {
  let seed = 51;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const points: ScreenPoint[] = [];
  const fixed = new Map<number, ScreenPoint>();
  [...SHORTLIST, ...REJECTED].forEach((p, i) => {
    fixed.set(11 + i * 13, { id: p.id, relevance: p.relevance, quality: p.quality });
  });
  for (let i = 0; i < COLLECTED.unique; i++) {
    const known = fixed.get(i);
    if (known) {
      points.push(known);
      continue;
    }
    // Most candidates are loosely related: low relevance, mixed quality. None reaches the keep zone.
    let relevance = Math.min(0.97, Math.max(0.03, 0.18 + rand() * 0.5 + (rand() - 0.5) * 0.25));
    const quality = Math.min(0.98, Math.max(0.05, 0.25 + rand() * 0.6));
    if (relevance >= 0.7 && quality >= 0.5) relevance = 0.4 + rand() * 0.28;
    points.push({ id: `p${i}`, relevance: round(relevance), quality: round(quality) });
  }
  return points;
}

const round = (v: number) => Math.round(v * 100) / 100;

// ---------- stage 6: knowledge extract ----------

export const CARDS: KnowledgeCard[] = [
  {
    id: "okano2019",
    paper_id: "okano2019",
    citation: "Okano et al., 2019",
    problem: "Does everyday sleep predict grades in a real course?",
    method: "Fitness trackers over a semester, linked to exam results.",
    data: "88 students in one chemistry course.",
    metrics: "Sleep duration, quality, consistency; exam scores.",
    findings: "Sleep measures explained nearly 25% of the variance in grades.",
    limitations: "Study time wasn't measured, so sleep can't be told apart from study habits.",
  },
  {
    id: "gilbert2010",
    paper_id: "gilbert2010",
    citation: "Gilbert & Weaver, 2010",
    problem: "Is poor sleep a hidden cause of low grades?",
    method: "Survey of sleep quality against GPA.",
    data: "557 university students.",
    metrics: "Sleep quality index; GPA.",
    findings: "Poorer sleep quality went with lower GPA.",
    limitations: "Study time and workload weren't controlled.",
  },
  {
    id: "hershner2014",
    paper_id: "hershner2014",
    citation: "Hershner & Chervin, 2014",
    problem: "Why are college students so sleepy, and what does it cost?",
    method: "Narrative review.",
    data: "Published studies of college students.",
    metrics: "Sleepiness, sleep length, grades.",
    findings: "Stress, screens and irregular schedules drive short sleep; sleepiness tracks lower grades.",
    limitations: "Causes are listed one by one, never tested together with study time.",
  },
  {
    id: "curcio2006",
    paper_id: "curcio2006",
    citation: "Curcio, Ferrara & De Gennaro, 2006",
    problem: "How does sleep loss affect learning and school results?",
    method: "Review of experimental and survey studies.",
    data: "Mostly school-age samples.",
    metrics: "Learning tasks, grades.",
    findings: "Sleep loss weakens learning capacity and academic results.",
    limitations: "Few adult students; stress as the link is barely tested in them.",
  },
  {
    id: "lund2010",
    paper_id: "lund2010",
    citation: "Lund et al., 2010",
    problem: "How do college students sleep, and what disturbs it?",
    method: "Large online survey.",
    data: "1,125 college students.",
    metrics: "Sleep quality, timing, stress.",
    findings: "Stress was the strongest predictor of disturbed sleep.",
    limitations: "Grades weren't modelled.",
  },
  {
    id: "dewald2010",
    paper_id: "dewald2010",
    citation: "Dewald et al., 2010",
    problem: "How strong is the sleep–school performance link overall?",
    method: "Meta-analysis.",
    data: "Pooled studies of children and adolescents.",
    metrics: "Pooled correlations.",
    findings: "Sleepiness and poor sleep quality link more strongly to performance than sleep length.",
    limitations: "Children and adolescents only; adults and stress as the link are untested.",
  },
  {
    id: "wolfson1998",
    paper_id: "wolfson1998",
    citation: "Wolfson & Carskadon, 1998",
    problem: "Do teen sleep schedules relate to daytime functioning?",
    method: "School survey.",
    data: "Over 3,000 high-school students.",
    metrics: "Sleep schedules, self-reported grades.",
    findings: "Students with lower grades slept less and went to bed later.",
    limitations: "High-school students; grades self-reported.",
  },
  {
    id: "levenson2016",
    paper_id: "levenson2016",
    citation: "Levenson et al., 2016",
    problem: "Does social media use go with poor sleep in young adults?",
    method: "National survey.",
    data: "1,788 adults aged 19–32.",
    metrics: "Social media time; sleep disturbance.",
    findings: "More social media use went with more sleep disturbance.",
    limitations: "Screens were tied to sleep, not to grades.",
  },
  {
    id: "pilcher1996",
    paper_id: "pilcher1996",
    citation: "Pilcher & Huffcutt, 1996",
    problem: "How much does sleep deprivation hurt performance?",
    method: "Meta-analysis of deprivation experiments.",
    data: "Lab studies.",
    metrics: "Cognitive, motor and mood performance.",
    findings: "Sleep deprivation clearly lowers performance, mood most of all.",
    limitations: "Lab deprivation, not everyday sleep.",
  },
  {
    id: "diekelmann2010",
    paper_id: "diekelmann2010",
    citation: "Diekelmann & Born, 2010",
    problem: "What does sleep do for memory?",
    method: "Review of experimental work.",
    data: "Human and animal studies.",
    metrics: "Memory retention.",
    findings: "Sleep actively consolidates newly learned memories.",
    limitations: "Lab memory tasks, not real exams.",
  },
  {
    id: "walker2006",
    paper_id: "walker2006",
    citation: "Walker & Stickgold, 2006",
    problem: "How does sleep shape memory and brain plasticity?",
    method: "Review.",
    data: "Experimental studies.",
    metrics: "Memory processing stages.",
    findings: "Different sleep stages support different kinds of learning.",
    limitations: "No classroom outcomes.",
  },
  {
    id: "baron1986",
    paper_id: "baron1986",
    citation: "Baron & Kenny, 1986",
    problem: "How do you test whether a link runs through something else?",
    method: "Method paper.",
    data: "None; worked examples.",
    metrics: "Direct and indirect paths.",
    findings: "Sets out the steps for testing mediation.",
    limitations: "Assumes the order of cause is known.",
  },
];

// ---------- stage 7: synthesis ----------

export const CLUSTERS: Cluster[] = [
  {
    id: "C1",
    title: "Sleep and grades",
    claim: "More and better sleep goes with better grades, from school to college.",
    card_ids: ["okano2019", "gilbert2010", "curcio2006", "dewald2010", "wolfson1998"],
  },
  {
    id: "C2",
    title: "Why sleep helps learning",
    claim: "Sleep consolidates memory; losing it hurts performance.",
    card_ids: ["diekelmann2010", "walker2006", "pilcher1996"],
  },
  {
    id: "C3",
    title: "What shapes student sleep",
    claim: "Stress, screens and workload change how students sleep.",
    card_ids: ["hershner2014", "lund2010", "levenson2016"],
  },
  {
    id: "C4",
    title: "How to test a pathway",
    claim: "Mediation splits a link into a direct part and a part that runs through something else.",
    card_ids: ["baron1986"],
  },
];

export const TENSION: Tension = {
  between: ["C1", "C3"],
  text: "C1 reads sleep as the cause of better grades. C3 shows stress and workload shape sleep itself, so part of the C1 link may belong to them.",
};

export const OVERVIEW =
  "Most of the evidence links more and better sleep to better grades, but in school-age samples or without study time measured. A smaller line explains why sleep should help learning, and another shows stress and screens shaping sleep itself. No paper here puts sleep, stress and study time in one model of undergraduates.";

export const GAPS: Gap[] = [
  { id: "G1", text: "Few papers separate study time from sleep.", from: ["okano2019", "gilbert2010", "hershner2014"] },
  {
    id: "G2",
    text: "Stress as the link is mostly tested in younger students.",
    from: ["curcio2006", "dewald2010", "wolfson1998"],
  },
  { id: "G3", text: "Screens are tied to sleep, rarely to grades directly.", from: ["levenson2016"] },
];

/** Gaps ranked as opportunities, most useful for the topic first. */
export const RANKING: Opportunity[] = [
  {
    gap_id: "G1",
    priority: 1,
    text: "Hold study time fixed while testing sleep. Answers SQ1 and SQ3 at once.",
  },
  {
    gap_id: "G2",
    priority: 2,
    text: "Test stress as the path in undergraduates, where it is barely studied. Answers SQ2.",
  },
  {
    gap_id: "G3",
    priority: 3,
    text: "Tie screens to grades directly. Only one paper to build on, so it comes last.",
  },
];

// ---------- stage 8: hypothesis debate ----------

export interface MockDebate {
  turns: DebateTurn[];
  /** Hypotheses written after the debate, in order. */
  hypotheses: string[];
  checks: Record<string, { novelty: NoveltyCheck; feasibility: FeasibilityCheck }>;
  asides: { id: string; statement: string; reason: string }[];
  keep: Record<string, string>;
}

export const DEBATES: Record<"first" | "pivot", MockDebate> = {
  first: {
    turns: [
      {
        id: "t1",
        actor: "theorist",
        stance: "propose",
        about: "H1",
        text: "C1 is consistent: more sleep, better grades. First claim: students sleeping 7 h or more score higher, with study, stress and screens held equal.",
      },
      {
        id: "t2",
        actor: "methodologist",
        stance: "test",
        about: "H1",
        reply_to: "t1",
        text: "Testable with a standard student survey: sleep hours, exam score and the three controls. One comparison gives one adjusted difference.",
      },
      {
        id: "t3",
        actor: "skeptic",
        stance: "challenge",
        about: "H1",
        reply_to: "t1",
        text: "Strong students may simply sleep more. Make the test strict: if the range touches zero, H1 fails.",
      },
      {
        id: "t4",
        actor: "theorist",
        stance: "propose",
        about: "H2",
        text: "G2 says stress as the link is untested in adults. Second claim: stress carries part of the sleep effect.",
      },
      {
        id: "t5",
        actor: "skeptic",
        stance: "challenge",
        about: "H2",
        reply_to: "t4",
        text: "Stress and sleep are usually asked at the same time. The arrow could point the other way.",
      },
      {
        id: "t6",
        actor: "theorist",
        stance: "refine",
        about: "H2",
        reply_to: "t5",
        text: "Then H2 only claims an indirect path exists. If its range includes zero it fails, and the paper says the order is unknown.",
      },
      {
        id: "t7",
        actor: "theorist",
        stance: "propose",
        about: "H3",
        text: "G3: screens are tied to sleep, rarely to grades. Third claim: more screen time lowers scores on its own.",
      },
      {
        id: "t8",
        actor: "methodologist",
        stance: "propose",
        about: "H4",
        text: "One more from G2. If adults are understudied, test whether the effect is stronger after 25.",
      },
      {
        id: "t9",
        actor: "skeptic",
        stance: "challenge",
        about: "H4",
        reply_to: "t8",
        text: "Few undergraduates are over 25. Expect a very wide range.",
      },
      {
        id: "t10",
        actor: "theorist",
        stance: "propose",
        about: "C5",
        text: "Two from Curcio 2006: caffeine could change the sleep effect, and so could exam timing.",
      },
      {
        id: "t11",
        actor: "methodologist",
        stance: "challenge",
        about: "C5",
        reply_to: "t10",
        text: "Neither is measured in a typical student survey. Both go aside.",
      },
      {
        id: "t12",
        actor: "theorist",
        stance: "concede",
        about: "C5",
        reply_to: "t11",
        text: "Agreed. They go in the paper as limits instead.",
      },
    ],
    hypotheses: ["H1", "H2", "H3", "H4"],
    checks: {
      H1: {
        novelty: { novel: true, closest: "Okano et al., 2019", similarity: 0.62 },
        feasibility: { ok: true, note: "Needs sleep hours, exam scores and 3 controls · seconds on a CPU" },
      },
      H2: {
        novelty: { novel: true, closest: "Hershner & Chervin, 2014", similarity: 0.48 },
        feasibility: { ok: true, note: "Needs stress on a simple scale · about 2 min on a CPU" },
      },
      H3: {
        novelty: { novel: true, closest: "Levenson et al., 2016", similarity: 0.44 },
        feasibility: { ok: true, note: "Needs daily screen time · seconds on a CPU" },
      },
      H4: {
        novelty: { novel: true, closest: "Dewald et al., 2010", similarity: 0.39 },
        feasibility: { ok: true, note: "Runs, but few students are over 25" },
      },
    },
    asides: [
      {
        id: "C5",
        statement: "Caffeine changes the sleep effect.",
        reason: "Caffeine isn't measured in a typical student survey",
      },
      {
        id: "C6",
        statement: "Exam timing explains the sleep effect.",
        reason: "Exam timing isn't measured in a typical student survey",
      },
    ],
    keep: { H4: "Kept anyway: a clear answer either way is useful. The Skeptic's objection stays on record." },
  },
  pivot: {
    turns: [
      {
        id: "u1",
        actor: "theorist",
        stance: "propose",
        about: "H5",
        text: "Round 1 left stress unclear. G1 is still open: does study time carry part of the sleep effect?",
      },
      {
        id: "u2",
        actor: "methodologist",
        stance: "test",
        about: "H5",
        reply_to: "u1",
        text: "Compare the sleep effect with and without study time, on the same students.",
      },
      {
        id: "u3",
        actor: "skeptic",
        stance: "challenge",
        about: "H5",
        reply_to: "u2",
        text: "Both models must use exactly the same rows, or the drop means nothing.",
      },
      {
        id: "u4",
        actor: "theorist",
        stance: "propose",
        about: "H6",
        text: "The slope looked steeper for women. Does the sleep effect differ by gender?",
      },
      {
        id: "u5",
        actor: "skeptic",
        stance: "challenge",
        about: "H6",
        reply_to: "u4",
        text: "No prior reason to expect it. If kept, flag it as a fishing risk.",
      },
      {
        id: "u6",
        actor: "theorist",
        stance: "propose",
        about: "D3",
        text: "Okano 2019 suggests consistency matters more than length.",
      },
      {
        id: "u7",
        actor: "methodologist",
        stance: "challenge",
        about: "D3",
        reply_to: "u6",
        text: "We only have nightly averages, not night-by-night data.",
      },
    ],
    hypotheses: ["H5", "H6"],
    checks: {
      H5: {
        novelty: { novel: true, closest: "Okano et al., 2019", similarity: 0.51 },
        feasibility: { ok: true, note: "Two models on the same students · seconds on a CPU" },
      },
      H6: {
        novelty: { novel: true, closest: "Dewald et al., 2010", similarity: 0.33 },
        feasibility: { ok: true, note: "Sleep by gender · seconds on a CPU" },
      },
    },
    asides: [
      {
        id: "D3",
        statement: "Sleep consistency matters more than sleep length.",
        reason: "Only nightly averages in the data",
      },
    ],
    keep: { H6: "Kept as a cheap check. The Reporter will flag it." },
  },
};

// ---------- stage 9: experiment design ----------

export function designFor(set: string[]): TestDesign {
  const independent: Record<string, string> = {
    H1: "sleep ≥ 7 h",
    H2: "stress_level (1–3)",
    H3: "screen_time",
    H4: "age > 25",
    H5: "study_hours",
    H6: "gender",
  };
  const chosen = set.map((h) => independent[h]).filter(Boolean);
  if (!chosen.includes("sleep ≥ 7 h")) chosen.unshift("sleep ≥ 7 h");
  const all = ["stress_level", "study_hours", "screen_time", "age", "gender"];
  return {
    independent: chosen,
    dependent: ["exam_score"],
    controls: all.filter((c) => !chosen.some((x) => x.startsWith(c))),
  };
}
