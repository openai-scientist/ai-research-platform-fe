import { CHECKS, EXCEPTIONS, FIT, FIT_RULES } from "./core";

/* ===== S11 · the manuscript text: a full research article, written only from the record ===== */

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
  absci: R("absci", " (95% CI for the gain 0.054 to 0.098)", ""),
  orig: R("orig", "nobody has tested", "to our knowledge, no study has tested"),
  rel: R("rel", "which is why their scores are often combined", "so their scores are often combined"),
  cd: R("cd", "[5]", "[1]"),
  ten: R("ten", "ten", "10"),
  k60: R("k60", "", " (k = 60)"),
  g1: R("g1", "answerable", "eligible"),
  sc: R("sc", "either retriever alone", "BM25, and slightly more than the dense retriever"),
  strat: R(
    "strat",
    "",
    " Within question-length bins the gain stays larger when evidence is spread (0.088 against 0.054).",
  ),
  dis: R("dis", "where evidence is scattered across a paper", "where evidence is scattered"),
  drift: R("drift", " Fusion also ranks evidence better at the same budget.", ""),
  om: R(
    "om",
    "",
    "The spread effect may partly reflect question length, which we did not control. ",
    "Within question-length bins the spread effect holds (4.2). ",
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
        "Systems that answer questions about long documents must also return the passages that support each answer, and many such systems fuse a lexical and a dense retriever. Whether fusion finds more of the supporting evidence in long scientific papers has not been tested under a fixed protocol. ",
        { lab: "Background." },
      ),
      T(
        "RQ",
        "We asked whether reciprocal rank fusion of BM25 and a dense retriever retrieves more of the annotated evidence than either retriever alone, and under which conditions any gain appears. ",
        { lab: "Objective." },
      ),
      T(
        "M",
        "Following a plan locked before the runs, we compared BM25, E5-base and their fusion on the 1,169 QASPER test questions with marked evidence. We measured recall at 10 over the paragraphs of each paper and estimated intervals with a paired bootstrap that resamples whole papers. ",
        { lab: "Method." },
      ),
      T(
        "F1",
        "Fusion raised recall at 10 from 0.612 to 0.688«absci». The gain was larger when the evidence was spread over several paragraphs than when it sat in one. Fusion found more of the evidence than BM25 for over a quarter of the questions and less for under a tenth. The gain could not be told apart from zero when fusion was limited to the same retrieval budget as BM25. ",
        { lab: "Results." },
      ),
      T(
        "C",
        "Fusion is a better default than BM25 when evidence is scattered across a paper; much of its advantage appears to come from the wider pool of paragraphs it draws on. All traces are released, so every number can be recomputed.",
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
    job: "Why readers need evidence, and what nobody has tested yet.",
    uses: ["Dasigi et al., 2021", "Bruch et al., 2023"],
    s: [
      T(
        "GAP",
        "Answering a question about a long paper is half the task; a reader also needs the passages that support the answer [2]. ",
      ),
      T(
        "GAP",
        "A system that returns an answer without its evidence asks to be trusted, and one that returns the wrong passages misleads the reader who checks. ",
      ),
      T(
        "GAP",
        "Retrieval systems often fuse lexical and dense scores [1][5], yet «orig» under a fixed protocol whether fusion finds more of the marked evidence than either signal alone. ",
      ),
      T("RQ", "We run that test on QASPER and report where the gain comes from."),
    ],
  },
  {
    id: "INT-2",
    sec: "INT",
    n: "1.2",
    w: "d",
    job: "Why finding evidence matters more as models read for us.",
    uses: ["Lewis et al., 2020", "KILT", "Liu et al., 2024"],
    s: [
      T(
        "BG",
        "The need is growing. Retrieval-augmented generation conditions a language model on passages found at query time [10], and benchmarks such as KILT score a system on whether it returns the provenance of its answer, not only the answer itself [24]. ",
      ),
      T(
        "BG",
        "Language models also use long inputs unevenly: information placed in the middle of a long context is used less reliably than information at its start or end [11]. Handing a model a whole paper is therefore no substitute for finding the right paragraphs in it, and a better generator cannot make up for evidence it was never shown. ",
      ),
      T(
        "BG",
        "For scientific documents the stakes are concrete. A reader checking a claim about a method or a result needs the paragraph that states it, and claim-verification datasets such as SciFact make that rationale part of the task [25].",
      ),
    ],
  },
  {
    id: "INT-3",
    sec: "INT",
    n: "1.3",
    w: "d",
    job: "Two families of retrievers, and where each fails.",
    uses: ["Robertson and Zaragoza, 2009", "BEIR"],
    s: [
      T(
        "BG",
        "Two families of retrievers compete for this job. Lexical retrievers such as BM25 score a passage by the query terms it contains, weighted by how rare those terms are [6]. ",
      ),
      T(
        "BG",
        "Dense retrievers encode the query and the passage as vectors and score them by similarity, which lets them match paraphrases that share no words [3][19]. ",
      ),
      T(
        "BG",
        "Each fails where the other is strong. BM25 misses a passage that says the same thing in other words; a dense retriever can miss a passage that hinges on an exact name, a dataset or a number, and its quality drops when the text differs from what it was trained on [9]. ",
      ),
      T(
        "BG",
        "Scientific papers contain both kinds of passage, often side by side: a method described in prose next to a table of exact values.",
      ),
    ],
  },
  {
    id: "INT-4",
    sec: "INT",
    n: "1.4",
    w: "d",
    job: "Fusion is common, but tested on short passages.",
    uses: ["Fox and Shaw, 1994", "Cormack et al., 2009", "4 hybrid studies"],
    s: [
      T(
        "BG",
        "Combining the two is the obvious response, and it has a long history. Early work summed the scores of several runs [16], and reciprocal rank fusion (RRF) combines rankings without looking at scores at all [5]. ",
      ),
      T(
        "BG",
        "Hybrid systems built this way often outperform either component on open-domain question answering and passage ranking [12][13][14], including on collections that neither retriever was trained on [15]. ",
      ),
      T(
        "GAP",
        "These results, however, come from collections of short passages, such as Wikipedia paragraphs or web snippets, and they measure whether one relevant passage appears near the top. ",
      ),
      T(
        "GAP",
        "They do not tell us whether fusion helps when the evidence is several paragraphs of one long document, which is the situation a reader of a scientific paper is in.",
      ),
    ],
  },
  {
    id: "INT-5",
    sec: "INT",
    n: "1.5",
    w: "d",
    job: "What makes long papers different, and why QASPER fits.",
    uses: ["Dasigi et al., 2021"],
    s: [
      T(
        "BG",
        "Long papers differ from passage collections in ways that matter for retrieval. The candidate set is small but uniform: every paragraph of a paper shares its vocabulary, its notation and its topic, so the terms of a question often match many paragraphs at once. ",
      ),
      T(
        "BG",
        "The evidence for one answer is also often spread over several paragraphs, for example a definition in the method and a number in the results. ",
      ),
      T(
        "BG",
        "QASPER captures this setting [2]. Its questions were written by practitioners who had read only the title and abstract of a paper, and other annotators then answered them from the full text and marked every paragraph that supports the answer. ",
      ),
      T(
        "BG",
        "Because the questions were written without the full text, they are less likely to copy its wording than questions written by someone looking at the answer.",
      ),
    ],
  },
  {
    id: "INT-6",
    sec: "INT",
    n: "1.6",
    w: "d",
    job: "What this study does, and its three hypotheses.",
    uses: ["Data report B.3–B.5"],
    s: [
      T(
        "RQ",
        "This paper reports a test of fusion in that setting, run under a plan we fixed in advance. We compare BM25, a dense retriever and their fusion with RRF on the QASPER test split, using the same questions, the same cutoff and the same evidence labels for every system. ",
      ),
      T(
        "M",
        "We measure recall at 10: the share of marked evidence paragraphs that a system places among its first 10. ",
      ),
      T(
        "RQ",
        "Our plan named three primary hypotheses: that fusion beats BM25 (H1), that its gain grows when the evidence is spread over several paragraphs (H2), and that the gain holds when fusion is limited to the same retrieval budget as BM25 (H4). ",
      ),
      T(
        "RQ",
        "All three are tested with intervals that resample whole papers, and the plan fixed in advance the smallest gain the design could detect. We report each as planned, including the one the data do not support.",
      ),
    ],
  },
  {
    id: "INT-7",
    sec: "INT",
    n: "1.7",
    w: "d",
    job: "The contributions, stated no wider than the claims.",
    uses: ["F1", "F2", "F3"],
    s: [
      T(
        "CTR",
        "The study makes three contributions. First, it provides a controlled comparison of lexical, dense and fused retrieval for evidence in long scientific papers, with intervals that account for questions drawn from the same paper. ",
      ),
      T(
        "CTR",
        "Second, it locates the gain: fusion helps most when the evidence is spread out, which points to coverage rather than better ranking as the source of its advantage. ",
      ),
      T(
        "CTR",
        "Third, it measures how much of that advantage remains when fusion may not draw on a larger pool than BM25, a control that is easy to omit when hybrid systems are compared. ",
      ),
      T(
        "CTR",
        "We release the configuration, the traces of all 15 runs and the results table, so that every number in this paper can be recomputed.",
      ),
    ],
  },
  {
    id: "INT-8",
    sec: "INT",
    n: "1.8",
    w: "d",
    job: "Where each part of the paper is.",
    uses: [],
    s: [
      T(
        "ROAD",
        "Section 2 reviews lexical, dense and fused retrieval and how evidence retrieval is evaluated. Section 3 describes the data, the systems, the planned analyses and the changes we made to the plan. ",
      ),
      T(
        "ROAD",
        "Section 4 reports the three findings in the order of the plan, followed by what we could not measure. Section 5 interprets the findings and sets out their limits, and Section 6 concludes.",
      ),
    ],
  },

  /* ---------- 2 · Related work ---------- */
  {
    id: "REL-1",
    sec: "REL",
    n: "2.1",
    sub: "Lexical and dense retrieval",
    w: "d",
    job: "How lexical and dense retrieval differ, and how they get combined.",
    uses: ["5 papers"],
    s: [
      T(
        "REL",
        "Lexical scoring has been the default first stage of retrieval for decades, and BM25 remains the baseline that new methods are measured against. ",
      ),
      T(
        "REL",
        "Its strength is exact matching: rare terms such as model names, dataset identifiers or metric names carry high weight, and no training data are needed. ",
      ),
      T("GAP", "BM25 [6] and dense retrievers [3][4] fail on different questions, «rel». "),
      T(
        "GAP",
        "Bruch et al. compare the main ways of fusing them «cd», and we return to that comparison in Section 2.2.",
      ),
    ],
  },
  {
    id: "REL-2",
    sec: "REL",
    n: "2.1",
    k: 2,
    w: "d",
    job: "How dense retrievers are trained.",
    uses: ["DPR", "ANCE", "Contriever", "E5", "ColBERT", "SPLADE"],
    s: [
      T(
        "REL",
        "Dense retrieval learns to map questions and passages into one vector space. DPR trained a dual encoder on question–passage pairs with in-batch negatives and outperformed BM25 on several open-domain benchmarks [3]. ",
      ),
      T(
        "REL",
        "Later work improved the training signal: ANCE drew hard negatives from an index refreshed during training [20], and Contriever showed that contrastive pre-training without labelled pairs yields a usable retriever [19]. ",
      ),
      T(
        "REL",
        "E5 combined weakly supervised contrastive pre-training on large web corpora with fine-tuning, producing general-purpose embeddings in several sizes [4]. ",
      ),
      T(
        "REL",
        "Late-interaction models such as ColBERT keep one vector per token and score by summed maximum similarity, trading index size for finer matching [17], while learned sparse models such as SPLADE expand documents with weighted terms and keep an inverted index [18].",
      ),
    ],
  },
  {
    id: "REL-3",
    sec: "REL",
    n: "2.1",
    k: 3,
    w: "d",
    job: "Where dense retrieval falls short.",
    uses: ["BEIR", "Luan et al., 2021", "Ma et al., 2021"],
    s: [
      T(
        "REL",
        "These gains do not transfer evenly. On BEIR, a benchmark of eighteen datasets from different domains, BM25 proved a strong baseline and several dense retrievers fell below it outside the domain they were trained on [9]. ",
      ),
      T(
        "REL",
        "Luan et al. analysed one reason: a fixed-length vector has limited capacity to preserve the exact terms of a document, and its fidelity drops as documents grow longer [21]. ",
      ),
      T(
        "REL",
        "A replication of DPR found that its reported results depended on details of training and evaluation, and that combining it with BM25 improved on either alone [14]. ",
      ),
      T(
        "REL",
        "For scientific text, embeddings trained on citation links capture how related two papers are [26], but they are designed to relate whole papers, not to find a paragraph within one.",
      ),
    ],
  },
  {
    id: "REL-4",
    sec: "REL",
    n: "2.2",
    sub: "Fusing rankings",
    w: "d",
    job: "Score fusion and rank fusion.",
    uses: ["Fox and Shaw, 1994", "Cormack et al., 2009"],
    s: [
      T(
        "REL",
        "Fusion combines the outputs of several retrievers into one ranking. Fox and Shaw summed normalised scores across runs (CombSUM) and weighted the sum by the number of runs that retrieved a document (CombMNZ) [16]. ",
      ),
      T(
        "REL",
        "Score-based fusion needs the scores to be comparable, which they rarely are: BM25 scores are unbounded and depend on the query, while dense similarities sit in a narrow range. ",
      ),
      T(
        "REL",
        "Reciprocal rank fusion avoids the problem by using ranks only. Each document receives a score that falls with its rank in each list, the scores are summed, and Cormack et al. showed that this simple rule outperformed more elaborate combination methods on several TREC collections [5].",
      ),
    ],
  },
  {
    id: "REL-5",
    sec: "REL",
    n: "2.2",
    k: 2,
    w: "d",
    job: "Hybrid lexical–dense retrieval.",
    uses: ["Kuzi et al., 2020", "Gao et al., 2021", "Chen et al., 2022", "Bruch et al., 2023"],
    s: [
      T(
        "REL",
        "Hybrid lexical–dense retrieval applies these rules to one lexical and one dense ranking. Kuzi et al. combined a semantic retriever with a lexical one and found that the hybrid improved recall over both [12]. ",
      ),
      T(
        "REL",
        "Gao et al. trained the dense component to model only what BM25 misses, so that the two complement rather than duplicate each other [13]. Chen et al. found that hybrids stayed robust where dense models alone degraded, on collections outside their training domain [15]. ",
      ),
      T(
        "REL",
        "Bruch et al. analysed the fusion functions themselves: a convex combination of normalised scores, tuned on a small sample, generally outperformed RRF, whose results depended on its constant more than is often assumed [1].",
      ),
    ],
  },
  {
    id: "REL-6",
    sec: "REL",
    n: "2.2",
    k: 3,
    w: "d",
    job: "What these studies leave open.",
    uses: ["SP-01"],
    s: [
      T(
        "GAP",
        "These studies evaluate fusion on passage collections, where each document is short and the question is whether one relevant passage appears near the top. Few of them isolate the source of the gain. ",
      ),
      T(
        "GAP",
        "A fused ranking draws on two candidate lists, so it may succeed simply because it sees more candidates, not because it orders them better. ",
      ),
      T(
        "GAP",
        "The distinction matters in practice: if the gain comes from coverage, any way of widening the pool might do as well; if it comes from ranking, fusion is doing something that neither retriever can. Holding the pool fixed separates the two, and our third hypothesis adds that control.",
      ),
    ],
  },
  {
    id: "REL-7",
    sec: "REL",
    n: "2.3",
    sub: "Evidence in scientific documents",
    w: "d",
    job: "Datasets that ask for evidence from scientific text.",
    uses: ["S2ORC", "SciFact", "QASPER"],
    s: [
      T(
        "REL",
        "Scientific documents pose their own retrieval problems. They are long, they mix prose with tables, equations and figure captions, and their vocabulary is dense with terms defined inside the paper. ",
      ),
      T(
        "REL",
        "Large open corpora such as S2ORC made full-text scientific retrieval feasible at scale [27]. Datasets that require evidence from such text include SciFact, which pairs scientific claims with the abstracts and rationale sentences that support or refute them [25], and QASPER, which asks questions about full NLP papers and marks the paragraphs that support each answer [2]. ",
      ),
      T(
        "REL",
        "QASPER's evidence marks make it possible to evaluate retrieval directly, by asking whether a system finds the marked paragraphs, rather than only through the accuracy of a downstream answer.",
      ),
    ],
  },
  {
    id: "REL-8",
    sec: "REL",
    n: "2.3",
    k: 2,
    w: "d",
    job: "How other QA benchmarks treat evidence.",
    uses: ["Natural Questions", "MS MARCO"],
    s: [
      T(
        "REL",
        "Most question-answering benchmarks are built differently. In Natural Questions and MS MARCO, a question comes with one or a few relevant passages from a large collection [22][23], and retrieval is judged by whether any of them is ranked highly. ",
      ),
      T(
        "GAP",
        "Evidence that is spread over several paragraphs of one document is rare in those settings and is not rewarded separately. In QASPER it is common, which lets us ask whether fusion helps more when there is more than one paragraph to find.",
      ),
    ],
  },
  {
    id: "REL-9",
    sec: "REL",
    n: "2.4",
    sub: "Uncertainty in retrieval evaluation",
    w: "d",
    job: "How differences between retrievers are tested.",
    uses: ["Smucker et al., 2007", "Urbano et al., 2019", "Sakai, 2014", "Efron and Tibshirani, 1993"],
    s: [
      T(
        "REL",
        "Differences between retrievers are often small, and how they are tested matters. Smucker et al. compared significance tests for retrieval evaluation and found the randomisation test, the bootstrap and the t-test in close agreement, while the sign and Wilcoxon tests diverged [28]. ",
      ),
      T(
        "REL",
        "Urbano et al. later estimated the error rates of these tests empirically on large samples of TREC runs [30], and Sakai argued that the field should report effect sizes and intervals rather than bare p-values [29]. ",
      ),
      T(
        "REL",
        "A further issue arises when questions are not independent. Several QASPER questions are asked about the same paper, and a bootstrap that resamples questions treats them as independent; resampling whole papers respects the grouping [7]. We follow that approach and report intervals throughout.",
      ),
    ],
  },

  /* ---------- 3 · Method ---------- */
  {
    id: "MET-1",
    sec: "MET",
    n: "3.1",
    sub: "Task, data and measure",
    w: "m",
    job: "What we compared, on which questions, and how we measured it.",
    uses: ["Results table · row 3", "Data report B.6–B.8"],
    s: [
      T("M", "We compare BM25, a dense retriever (E5-base) [4] and their fusion on the QASPER test split [2]. "),
      T(
        "M",
        "A question is eligible when annotators marked at least one evidence paragraph; {1,169|row 3} of {1,451|row 3} questions are. ",
      ),
      T(
        "M",
        "Recall at 10 is the share of marked paragraphs found in the top «ten». Fusion uses reciprocal rank fusion«k60» [5].",
      ),
    ],
  },
  {
    id: "MET-1b",
    sec: "MET",
    n: "3.1",
    k: 2,
    w: "m",
    job: "The data: version, licence, answers and exclusions.",
    uses: ["Data report C.1", "B.8"],
    s: [
      T(
        "M",
        "QASPER pairs questions with full NLP papers drawn from S2ORC [2][27]. We use version 0.3 of the test split, which is released under CC BY 4.0. ",
      ),
      T(
        "M",
        "Each question was answered by one or more annotators, who marked the paragraphs of the paper that support their answer. When a question has several answers, we take the union of the marked paragraphs, so a system is credited for finding evidence that any annotator used. ",
      ),
      T(
        "M",
        "Questions that annotators judged unanswerable from the paper have no marked evidence and cannot be scored for recall; with the few answered questions whose annotators marked no paragraph, they make up the 282 questions the rule above excludes. The exclusion rule is part of the plan.",
      ),
    ],
  },
  {
    id: "MET-1c",
    sec: "MET",
    n: "3.1",
    k: 3,
    w: "m",
    job: "The candidate set, and why recall at 10.",
    uses: ["Data report B.5"],
    s: [
      T(
        "M",
        "Retrieval runs within one paper at a time. For each question, the candidates are the paragraphs of the paper the question was asked about, with each section heading joined to the paragraph that follows it and figure and table captions kept as paragraphs of their own. ",
      ),
      T(
        "M",
        "A system ranks all candidates, and recall at 10 is computed against the marked evidence of that question, then averaged over questions. ",
      ),
      T(
        "M",
        "We chose recall over precision-oriented measures because a reader, or a model reading on their behalf, can skim 10 paragraphs but cannot recover evidence that was never shown. The cutoff is the one named in the plan.",
      ),
    ],
  },
  {
    id: "MET-2",
    sec: "MET",
    n: "3.2",
    sub: "Runs, seeds and intervals",
    w: "m",
    job: "Seeds, and how uncertainty is reported.",
    uses: ["Data report B.7, C.4"],
    s: [
      T(
        "M",
        "Every run uses five seeds; we report means and paired-bootstrap 95% intervals that resample whole papers [7]. ",
      ),
      T(
        "M",
        "BM25 is deterministic, so its five runs are identical and are kept only to keep the protocol uniform; for the dense retriever and for fusion, the seed fixes the order in which paragraphs are encoded in batches and how ties between equal scores are broken. ",
      ),
      T(
        "M",
        "Each of the 15 runs, three systems by five seeds, wrote a trace that records its configuration, its seed and a hash of the question list, so that any number in this paper can be traced back to the run that produced it.",
      ),
    ],
  },
  {
    id: "MET-2b",
    sec: "MET",
    n: "3.2",
    k: 2,
    w: "m",
    job: "How the bootstrap is computed, and why by paper.",
    uses: ["Data report B.7", "C.1"],
    s: [
      T(
        "M",
        "Intervals for differences between systems come from a paired bootstrap with 10,000 resamples. In each resample we draw papers with replacement, keep every eligible question of each drawn paper, and compute the difference in mean recall at 10 between the two systems on the same questions. ",
      ),
      T("M", "The 2.5th and 97.5th percentiles of these differences form the interval. "),
      T(
        "M",
        "Resampling papers rather than questions matters here because questions about the same paper share their candidates and often their evidence; treating them as independent would make the intervals too narrow. Section 3.6 records this as a change to the plan.",
      ),
    ],
  },
  {
    id: "MET-2c",
    sec: "MET",
    n: "3.2",
    k: 3,
    w: "m",
    job: "The smallest gain the design could see.",
    uses: ["Data report B.9"],
    s: [
      T(
        "M",
        "Before the runs we estimated the smallest gain the design could detect. With 1,169 questions and the variance of recall at 10 observed on the development split, a paired comparison has 80% power to detect a gain of 0.035. ",
      ),
      T(
        "LIM",
        "Gains below that size may exist and be missed. We report this figure next to every interval that includes zero, so that an inconclusive result is not read as evidence of no effect. ",
      ),
      T(
        "M",
        "The figure matters most for H4: a same-budget comparison changes only some of the 10 paragraphs a system returns, so the two systems differ on fewer questions and the test has less to work with.",
      ),
    ],
  },
  {
    id: "MET-3",
    sec: "MET",
    n: "3.3",
    sub: "Retrievers",
    w: "m",
    job: "BM25: implementation, parameters and index.",
    uses: ["Data report C.2", "C.3"],
    s: [
      T(
        "M",
        "BM25 is the Pyserini implementation [8] with its default parameters, k1 = 0.9 and b = 0.4, applied to paragraphs tokenised and stemmed with the toolkit's default English analyser. ",
      ),
      T(
        "M",
        "We built one index per paper, so that term weights reflect the paper being searched rather than the whole collection. ",
      ),
      T(
        "M",
        "This choice favours terms that are rare within the paper, such as the name of a component that appears in only a few paragraphs, and it matches what a reader searching inside one document would do.",
      ),
    ],
  },
  {
    id: "MET-3b",
    sec: "MET",
    n: "3.3",
    k: 2,
    w: "m",
    job: "The dense retriever, and the compute it used.",
    uses: ["Data report C.2", "C.5"],
    s: [
      T(
        "M",
        "The dense retriever is E5-base-v2 [4], used without fine-tuning. Following its documentation, we prefix questions with “query:” and paragraphs with “passage:”, truncate paragraphs at 512 tokens, and score by the inner product of normalised embeddings. ",
      ),
      T(
        "M",
        "We encode every paragraph of every test paper once and search exhaustively within each paper, so no approximate index is involved. ",
      ),
      T(
        "LIM",
        "Encoding the test papers took 41 minutes on one A100 GPU. We report this to describe the setup, not as a measure of cost, because the time per question was not recorded.",
      ),
    ],
  },
  {
    id: "MET-4",
    sec: "MET",
    n: "3.4",
    sub: "Fusion and the same-budget condition",
    w: "m",
    job: "How RRF combines the two rankings.",
    uses: ["Cormack et al., 2009", "Data report C.3"],
    s: [
      T(
        "M",
        "Fusion combines the BM25 and dense rankings of each question with RRF [5]. A paragraph's fused score is the sum, over the two rankings, of 1/(k + r), where r is its rank in that ranking; paragraphs are then sorted by fused score, with ties broken by the BM25 rank. ",
      ),
      T(
        "M",
        "The constant k damps the weight of the very top ranks, so that a paragraph ranked fairly high by both retrievers can overtake one ranked first by only one of them. ",
      ),
      T(
        "M",
        "We did not tune k or any other parameter, and no part of the test split was used to make a choice. Because both retrievers rank every paragraph of the paper, the fused ranking in the main comparison can draw on the whole paper.",
      ),
    ],
  },
  {
    id: "MET-4b",
    sec: "MET",
    n: "3.4",
    k: 2,
    w: "m",
    job: "The same-budget condition behind H4.",
    uses: ["Data report B.6", "H4"],
    s: [
      T(
        "M",
        "The main comparison therefore gives fusion an advantage that has nothing to do with how it orders paragraphs: its top 10 can include paragraphs that neither retriever placed in its own top 10. ",
      ),
      T(
        "M",
        "To separate this effect, the plan included a same-budget condition. The two rankings are merged in turn, taking the next paragraph from BM25 and then from the dense retriever and skipping any paragraph already taken, until 10 distinct paragraphs are collected; fusion's top 10 is this pool, ordered by RRF, though the order does not affect recall at 10. ",
      ),
      T(
        "M",
        "Fusion then sees exactly as many paragraphs as BM25 returns, so any remaining gain comes from mixing the two sources rather than from seeing more of the paper. H4 predicted that the gain would hold under this constraint.",
      ),
    ],
  },
  {
    id: "MET-5",
    sec: "MET",
    n: "3.5",
    sub: "Hypotheses and analyses",
    w: "m",
    job: "The primary hypotheses and their confirmatory analyses.",
    uses: ["Data report B.4", "E.1"],
    s: [
      T(
        "M",
        "The plan lists six hypotheses, three of them primary. H1 states that fusion achieves higher recall at 10 than BM25. H2 states that the gain of fusion over BM25 is larger for questions whose evidence spans several paragraphs than for questions whose evidence sits in one. H4 states that the gain holds in the same-budget condition. ",
      ),
      T(
        "M",
        "Each primary hypothesis has one confirmatory analysis, A1 to A3, fixed in the plan with its measure, its comparison and its interval. ",
      ),
      T("M", "The secondary hypotheses H3, H5 and H6 are deferred to later work, and this paper does not test them.", {
        when: "notorphan",
      }),
      T(
        "M",
        "The secondary hypotheses H5 and H6 are deferred to later work; Section 5.2 explains why H3 is not tested.",
        { when: "orphan" },
      ),
    ],
  },
  {
    id: "MET-5b",
    sec: "MET",
    n: "3.5",
    k: 2,
    w: "m",
    job: "How the spread split was defined.",
    uses: ["Plan §3", "rows 20–21"],
    s: [
      T(
        "M",
        "For H2 we split the eligible questions by how their evidence is distributed. A question's evidence is spread when the union of its marked paragraphs contains two or more paragraphs, and single when it contains exactly one. ",
      ),
      T(
        "M",
        "The split was defined from the annotations alone, without looking at any system's output, so it could not be chosen to favour a result. It yields {680|rows 20–21} questions with spread evidence and {489|rows 20–21} with single-paragraph evidence. ",
      ),
      T("M", "The gain of fusion over BM25 is estimated separately in each group, and A2 compares the two gains."),
    ],
  },
  {
    id: "MET-5c",
    sec: "MET",
    n: "3.5",
    k: 3,
    w: "m",
    job: "Exploratory analyses, and why no correction.",
    uses: ["Data report E.2"],
    s: [
      T(
        "M",
        "Every analysis that the plan did not name is reported as exploratory, kept apart from the confirmatory results and not used to support any claim. ",
      ),
      T(
        "M",
        "We apply no correction for multiple comparisons, because the three confirmatory analyses test three distinct hypotheses, each stated in advance with its direction. ",
      ),
      T(
        "M",
        "One exploratory analysis, A4, examines the gain by question length; it carries no hypothesis and is reported in Section 4.5.",
        { when: "a4" },
      ),
      T(
        "M",
        "One exploratory analysis, of the gain by question length, was run but is not reported, at the authors' decision; its rows remain in the released results table.",
        { when: "a4drop" },
      ),
    ],
  },
  {
    id: "MET-6",
    sec: "MET",
    n: "3.6",
    sub: "Changes to the plan",
    w: "m",
    job: "When the plan was locked, and the two changes made to it.",
    uses: ["Data report F.1", "Timeline"],
    s: [
      T("M", "The plan was locked on 14 September 2026, before the first run. ", { when: "notlate" }),
      T(
        "M",
        "The plan was locked on 15 September 2026, after the first runs had started; Section 5.2 sets out what this means for our claims. ",
        { when: "late" },
      ),
      T(
        "M",
        "We made two changes to it, both recorded with their dates. First, the plan named E5-large as the dense retriever. Its index for the test papers did not fit the compute budget of the project, and on 16 September 2026 we replaced it with E5-base, recording the change and its reason the same day. ",
      ),
      T(
        "M",
        "Second, the plan specified a bootstrap that resamples questions. A check of the record showed that 23% of the questions share a paper, and we changed the unit of resampling to the paper before any text was written. This widens the intervals; the question-level intervals remain in the released results table.",
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
    uses: ["Data report A.3", "D.1–D.2"],
    s: [
      T(
        "M",
        "We release the configuration file, the pinned environment, the 15 traces and the results table. The table has one row per reported quantity, and each row names the traces it was computed from. ",
      ),
      T(
        "M",
        "Every number in Sections 4 and 5 cites its row, so a reader can recompute it from the traces with the released scripts. ",
      ),
      T(
        "M",
        "The plan, with its lock date and fingerprint, and the deviation log are released with them. Nothing in this paper depends on a file that is not released, with one exception: QASPER itself, which is available from its authors under the same licence.",
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
        "We report the three confirmatory analyses in the order of the plan. All values are means over five seeds, all intervals are 95% paired-bootstrap intervals that resample papers, and every number names the row of the results table it comes from. ",
      ),
      T(
        "M",
        "Table 1 gives recall at 10 for each system, and Table 2 at the end of the section lists each hypothesis with its outcome. Section 4.4 states what the record does not allow us to report, and Section 4.5 holds the one exploratory analysis, apart from the confirmatory results.",
        { when: "a4" },
      ),
      T(
        "M",
        "Table 1 gives recall at 10 for each system, and Table 2 at the end of the section lists each hypothesis with its outcome. Section 4.4 states what the record does not allow us to report.",
        { when: "a4drop" },
      ),
    ],
  },
  {
    id: "RES-1",
    sec: "RES",
    n: "4.1",
    sub: "Fusion against each retriever",
    w: "r",
    job: "Finding 1: fusion against each retriever.",
    uses: ["row 12", "row 13"],
    claim: "F1",
    s: [
      T(
        "F1",
        "On the {1,169|row 3} «g1» QASPER test questions, fusion retrieved more of the marked evidence than «sc». ",
      ),
      {
        p: "F1",
        x: [
          "Recall at 10 rose from ",
          N("0.612", "row 12"),
          " with BM25 to ",
          N("0.688", "row 12"),
          " with fusion, a gain of ",
          N("0.076", "row 13"),
          " (95% CI ",
          N("0.054 to 0.098", "row 13"),
          "; Table 1). ",
        ],
      },
      T("F1", "Against the dense retriever, at {0.641|row 12}, the gain was smaller. "),
      T("M", "Intervals come from a paired bootstrap that resamples whole papers, with 10,000 resamples [7]."),
    ],
  },
  { id: "TAB1", sec: "RES", kind: "table" },
  {
    id: "RES-1b",
    sec: "RES",
    n: "4.1",
    k: 2,
    w: "r",
    job: "Finding 1, question by question.",
    uses: ["row 16"],
    claim: "F1",
    s: [
      T(
        "F1",
        "The gain was not driven by a few questions. Fusion found more marked paragraphs than BM25 for {27.4%|row 16} of the eligible questions and fewer for {9.8%|row 16}. ",
      ),
      T(
        "F1",
        "For the remaining {62.8%|row 16}, both systems found the same number, most often because both found all of the evidence. ",
      ),
      T("M", "Because the comparison is paired, these shares describe the same questions under both systems."),
    ],
  },
  {
    id: "RES-1f",
    sec: "RES",
    n: "4.1",
    k: 3,
    w: "r",
    job: "How often the two retrievers agree.",
    uses: ["row 15"],
    s: [
      T(
        "F1",
        "The two retrievers disagreed often enough to make fusion worthwhile. Their top-10 lists shared {5.8|row 15} paragraphs on average, so for a typical question each retriever placed about four paragraphs in its top 10 that the other did not. ",
      ),
      T(
        "F1",
        "Fusion can only add evidence that one of the two ranks highly, and this overlap bounds how much it can add: had the lists been nearly identical, there would have been little for fusion to combine.",
      ),
    ],
  },
  {
    id: "RES-1g",
    sec: "RES",
    n: "4.1",
    k: 4,
    w: "r",
    job: "Where fusion loses evidence, and why.",
    uses: ["row 16"],
    s: [
      T(
        "F1",
        "Fusion is not free of losses. For the {9.8%|row 16} of questions on which it found fewer marked paragraphs than BM25, a paragraph that BM25 kept in its top 10 fell out when the two rankings were combined. ",
      ),
      T(
        "F1",
        "RRF rewards agreement, so a paragraph that BM25 ranks near the cutoff and the dense retriever ranks low is the most exposed. Such losses are the price of the gains reported above, and on QASPER the questions that gained outnumber those that lost by almost three to one.",
      ),
    ],
  },
  {
    id: "RES-1c",
    sec: "RES",
    n: "4.1",
    k: 5,
    w: "r",
    job: "Where the dense retriever stands.",
    uses: ["row 14"],
    s: [
      T(
        "F1",
        "The dense retriever on its own also improved on BM25, by {0.029|row 14} (95% CI {0.011 to 0.047|row 14}). ",
      ),
      T(
        "F1",
        "This comparison was not one of the planned hypotheses; we report it to place the main result. Part of fusion's gain over BM25 is available from the dense retriever alone, and the rest appears only when the two rankings are combined. ",
      ),
      T(
        "LIM",
        "The plan named no comparison between fusion and the dense retriever, and we do not test that difference here.",
      ),
    ],
  },
  {
    id: "RES-1e",
    sec: "RES",
    n: "4.1",
    k: 6,
    w: "r",
    job: "Finding 1, as complete evidence found.",
    uses: ["row 17"],
    claim: "F1",
    s: [
      T(
        "F1",
        "A stricter view of the same comparison asks how often a system found all of the marked evidence for a question. BM25 placed every marked paragraph in its top 10 for {48.1%|row 17} of the eligible questions, the dense retriever for {50.3%|row 17} and fusion for {55.9%|row 17}. ",
      ),
      T(
        "F1",
        "This measure was not planned and we give it without an interval, but it shows the gain in a form a reader can picture: for roughly one question in thirteen, fusion turned a partial set of evidence into a complete one.",
      ),
    ],
  },
  {
    id: "RES-1d",
    sec: "RES",
    n: "4.1",
    k: 7,
    w: "r",
    job: "What A1 says about H1.",
    uses: ["row 13"],
    claim: "F1",
    s: [
      T(
        "F1",
        "Taken together, A1 supports H1: on QASPER, fusion finds more of the marked evidence than BM25, and the interval excludes zero when questions from the same paper are resampled together. ",
      ),
      T(
        "M",
        "The question-level interval that the plan first specified is narrower, {0.059 to 0.093|row 13}; we give it only for comparison with the plan.",
      ),
    ],
  },
  {
    id: "RES-2",
    sec: "RES",
    n: "4.2",
    sub: "Where the gain is largest",
    w: "r",
    job: "Finding 2: where the gain is largest.",
    uses: ["rows 18–21"],
    claim: "F2",
    s: [
      {
        p: "F2",
        x: [
          "The gain grew with the spread of the evidence: ",
          N("0.094", "rows 18–21"),
          " when it spans several paragraphs against ",
          N("0.051", "rows 18–21"),
          " when it sits in one (Figure 2).",
          REV.strat,
        ],
      },
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
    uses: ["rows 18–21"],
    claim: "F2",
    s: [
      T(
        "F2",
        "The difference between the two gains was {0.043|rows 18–21} (95% CI {0.009 to 0.077|rows 18–21}), so A2 supports H2: fusion helps more when the evidence is spread over several paragraphs. ",
      ),
      T(
        "F2",
        "In both groups fusion improved on BM25, and the interval for the single-paragraph group also excluded zero ({0.031 to 0.071|rows 18–21}). ",
      ),
      T(
        "F2",
        "The effect is therefore one of degree. Fusion is not useless when the evidence sits in one paragraph; it is more useful when there is more evidence to find.",
      ),
    ],
  },
  {
    id: "RES-2c",
    sec: "RES",
    n: "4.2",
    k: 3,
    w: "r",
    job: "Finding 2: recall by group for each system.",
    uses: ["rows 18–21"],
    claim: "F2",
    s: [
      T(
        "F2",
        "Questions with spread evidence were harder, because recall at 10 then requires finding several paragraphs rather than one. BM25 reached {0.575|rows 18–21} on them against {0.664|rows 18–21} on single-paragraph questions. ",
      ),
      T("F2", "Fusion narrowed this gap without closing it, reaching {0.669|rows 18–21} and {0.715|rows 18–21}."),
    ],
  },
  {
    id: "RES-2d",
    sec: "RES",
    n: "4.2",
    k: 4,
    w: "r",
    job: "The dense retriever, by group.",
    uses: ["rows 18–21"],
    s: [
      T(
        "F2",
        "The dense retriever showed the same pattern more sharply. Its recall at 10 was {0.620|rows 18–21} on questions with spread evidence and {0.670|rows 18–21} on single-paragraph questions, so its advantage over BM25 was concentrated on spread evidence ({0.045|rows 18–21} against {0.006|rows 18–21}). ",
      ),
      T(
        "F2",
        "These gains were not part of A2, and we report them without intervals. They suggest that the paragraphs fusion adds on spread questions are largely ones that the dense retriever ranks highly and BM25 does not.",
      ),
    ],
  },
  {
    id: "RES-2e",
    sec: "RES",
    n: "4.2",
    k: 5,
    w: "r",
    job: "The gain by number of evidence paragraphs, descriptive.",
    uses: ["rows 22–24"],
    s: [
      T(
        "F2",
        "Within the spread group, the gain rose with the number of evidence paragraphs: {0.086|rows 22–24} for questions with two, {0.098|rows 22–24} for three and {0.112|rows 22–24} for four or more ({371|rows 22–24}, {192|rows 22–24} and {117|rows 22–24} questions). ",
      ),
      T(
        "F2",
        "The groups grow small and their intervals overlap, so we read this only as consistent with A2, not as a further finding.",
      ),
    ],
  },
  {
    id: "RES-3",
    sec: "RES",
    n: "4.3",
    sub: "The same budget",
    w: "r",
    job: "Finding 3: the same budget shows no clear gain.",
    uses: ["row 25"],
    claim: "F3",
    s: [
      T(
        "F3",
        "With both systems limited to ten paragraphs, we found no clear gain ({0.031|row 25}, 95% CI {−0.004 to 0.066|row 25}); the test could miss gains below 0.035, so part of the advantage may come from the larger pool fusion draws on.",
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
    uses: ["row 25"],
    claim: "F3",
    s: [
      T(
        "F3",
        "The same-budget comparison asks a narrower question than A1. Fusion's top 10 was a pool of exactly 10 distinct paragraphs, filled alternately from the two rankings, so it could only gain by replacing some of BM25's lower-ranked paragraphs with paragraphs that the dense retriever ranked highly. On average {3.6|row 25} of the 10 pooled paragraphs came from the dense ranking alone. ",
      ),
      T(
        "F3",
        "The point estimate is less than half of the unconstrained gain, and its interval includes zero, so A3 does not support H4 as stated. ",
      ),
      T(
        "F3",
        "We do not conclude that the constrained gain is zero: the interval is also compatible with a gain as large as {0.066|row 25}, and the design could miss gains below 0.035.",
      ),
    ],
  },
  {
    id: "RES-3d",
    sec: "RES",
    n: "4.3",
    k: 3,
    w: "r",
    job: "What the pool shows about the small remaining gain.",
    uses: ["row 25"],
    claim: "F3",
    s: [
      T(
        "F3",
        "The pooled paragraphs show why the remaining gain is small. Of the paragraphs that the pool took from the dense ranking alone, {21.3%|row 25} were marked evidence, against {17.9%|row 25} of the BM25 paragraphs they displaced. ",
      ),
      T(
        "F3",
        "The exchange improves recall only a little, because the paragraphs that BM25 ranks sixth to tenth are themselves often evidence. Without a budget, fusion can keep BM25's best paragraphs and add the dense retriever's as well, which is consistent with the larger gain of Section 4.1.",
      ),
    ],
  },
  {
    id: "RES-3c",
    sec: "RES",
    n: "4.3",
    k: 4,
    w: "r",
    job: "Reading A1 and A3 together.",
    uses: ["row 13", "row 25"],
    claim: "F3",
    s: [
      T(
        "F3",
        "Read together, A1 and A3 bound where the gain comes from. Of the {0.076|row 13} gained without a budget, an estimated {0.031|row 25} remains when fusion may not see more of the paper than BM25 does. ",
      ),
      T(
        "F3",
        "The difference is consistent with the wider pool that fusion draws on when both retrievers rank every paragraph. We return to this reading in Section 5.1.",
      ),
    ],
  },
  {
    id: "RES-4",
    sec: "RES",
    n: "4.4",
    sub: "Speed and cost",
    w: "r",
    job: "Speed and cost of fusion.",
    uses: [],
    blocked: true,
    s: [],
  },
  { id: "FIG4", sec: "RES", kind: "excluded" },
  {
    id: "RES-5",
    sec: "RES",
    n: "4.5",
    sub: "Exploratory: question length",
    w: "r",
    job: "A4, exploratory: the gain by question length.",
    uses: ["rows 26–27"],
    when: "a4",
    s: [
      T(
        "EXP",
        "This section is exploratory. Analysis A4, which the plan did not name, split the eligible questions at the median question length of nine words. ",
      ),
      T(
        "EXP",
        "The gain of fusion over BM25 was {0.061|rows 26–27} for shorter questions and {0.090|rows 26–27} for longer ones. ",
      ),
      T(
        "EXP",
        "Longer questions contain more terms that can match a paragraph and more context that a dense encoder can use, and either could favour fusion. The split at the median gave two groups of nearly equal size, and their gains average to the overall gain of Section 4.1. We draw no conclusion from this split and report it so that the analysis is not hidden.",
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
        "Table 2 lists each primary hypothesis with its analysis and its outcome. Two of the three were supported: fusion found more of the marked evidence than BM25 (H1), and more so when the evidence was spread over several paragraphs (H2). ",
      ),
      T(
        "F3",
        "The third, that the gain holds at the same budget (H4), was not supported. Its interval is too wide to rule out a gain of the size the design could detect, and too close to zero to claim one. No secondary hypothesis was tested.",
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
    job: "What the results mean for people building retrieval.",
    uses: ["Findings 1–3"],
    claim: "C",
    s: [
      T(
        "C",
        "These results ⟨f1⟩ that fusion finds more of the marked evidence than BM25, and ⟨f2⟩ that the gain is largest «dis». ",
      ),
      T(
        "F3",
        "Because we find ⟨f3⟩ at the same budget, we read the gain as wider coverage rather than better ranking.",
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
    job: "Why the pattern points to coverage.",
    uses: ["F2", "F3"],
    claim: "C",
    s: [
      T(
        "C",
        "The coverage reading rests on the pattern of results rather than on any single number. When both retrievers rank every paragraph, fusion can promote a paragraph that BM25 placed below its top 10 if the dense retriever ranked it highly. ",
      ),
      T(
        "C",
        "Evidence spread over several paragraphs offers more such chances, because each further evidence paragraph is another chance that one retriever finds what the other missed. ",
      ),
      T(
        "C",
        "When the pool is fixed, as in the same-budget condition, most of these chances disappear, and so, within the precision of our test, does much of the gain. A ranking explanation would predict the opposite: a gain that survives the budget constraint.",
      ),
    ],
  },
  {
    id: "DIS-1e",
    sec: "DIS",
    n: "5.1",
    k: 3,
    w: "d",
    job: "What the dense retriever's pattern adds to the reading.",
    uses: ["rows 18–21"],
    claim: "C",
    s: [
      T(
        "C",
        "The group-wise results of the dense retriever fit this reading. Its advantage over BM25 sat almost entirely on questions with spread evidence, which is where a retriever that matches paraphrases is most likely to find a paragraph sharing few words with the question. ",
      ),
      T(
        "C",
        "A result reported in a table caption, or a definition far from the question's own terms, might be such a paragraph. Fusion appears to add these paragraphs to what BM25 already finds, rather than to reorder what both find.",
      ),
    ],
  },
  {
    id: "DIS-1c",
    sec: "DIS",
    n: "5.1",
    k: 4,
    w: "d",
    job: "What the findings do not show.",
    uses: ["row 14", "SP-13 blocked"],
    s: [
      T(
        "LIM",
        "The findings say less about fusion against the dense retriever. Fusion scored higher than E5-base on its own, but the plan named no test of that difference, and the dense retriever already recovered part of BM25's shortfall. A reader choosing between the two should treat our results as suggestive at most. ",
      ),
      T(
        "LIM",
        "Our results also concern the retrieval of marked evidence, not the quality of answers built on it. A system that finds more evidence gives a reader, or a model, more to work with, but whether better answers follow depends on how that evidence is used.",
      ),
    ],
  },
  {
    id: "DIS-1d",
    sec: "DIS",
    n: "5.1",
    k: 5,
    w: "d",
    job: "Why the spread effect matters to readers.",
    uses: ["rows 18–21"],
    claim: "C",
    s: [
      T(
        "C",
        "The spread effect also has a practical reading. Questions whose evidence spans several paragraphs are the ones a reader is least likely to answer from a single passage, and both BM25 and fusion did worst on them. ",
      ),
      T(
        "C",
        "That fusion helps most on exactly these questions suggests that its value lies less in the typical question than in the harder ones, where missing one of several paragraphs leaves an answer incomplete.",
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
      {
        p: "LIM",
        x: [
          "We test one benchmark of English NLP papers, and 23% of its questions share a paper, so our intervals resample whole papers. ",
        ],
      },
      { p: "LIM", x: [REV.om] },
      { p: "LIM", x: ["We did not measure speed, so we make no claim about cost."] },
      {
        p: "LIM",
        when: "orphan",
        x: [" H3 was planned as a primary hypothesis but was not run; we report it as not tested."],
      },
      {
        p: "LIM",
        when: "late",
        x: [" Our analysis plan was fixed after the first runs, so every analysis here is exploratory."],
      },
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
        "QASPER papers share a field, a language and a structure, and its questions were written by readers from the same community. Papers in medicine, law or the humanities differ in length, structure and vocabulary, and their evidence may be distributed differently. ",
      ),
      T(
        "LIM",
        "We therefore limit our conclusion to English NLP papers like those in QASPER and make no claim about other fields or languages.",
      ),
    ],
  },
  {
    id: "DIS-2c",
    sec: "DIS",
    n: "5.2",
    k: 3,
    w: "d",
    job: "What the evidence marks can miss.",
    uses: ["Data report C.6"],
    s: [
      T(
        "LIM",
        "Recall is measured against the paragraphs that annotators marked. Annotators may miss paragraphs that also support an answer, and a system that retrieves such a paragraph is not credited for it. ",
      ),
      T(
        "LIM",
        "If one retriever finds unmarked evidence more often than the other, our comparison is biased against it. We have no estimate of how often this happens; the union of several annotators' marks, which we use, reduces the problem without removing it.",
      ),
    ],
  },
  {
    id: "DIS-2d",
    sec: "DIS",
    n: "5.2",
    k: 4,
    w: "d",
    job: "The encoder and the fusion rule we did not vary.",
    uses: ["Deviation D1", "Bruch et al., 2023"],
    s: [
      T(
        "LIM",
        "The dense retriever is E5-base rather than the E5-large named in the plan (Section 3.6). A stronger encoder might narrow the gap between the dense retriever and fusion, or widen the gain of fusion over BM25; our data cannot say which. ",
      ),
      T(
        "LIM",
        "We also tested one fusion rule, RRF with an untuned constant. Score-based fusion tuned on held-out data can outperform RRF [1], so our results may understate what fusion can achieve, though tuning would also add choices that a fixed protocol avoids.",
      ),
    ],
  },
  {
    id: "DIS-2e",
    sec: "DIS",
    n: "5.2",
    k: 5,
    w: "d",
    job: "The cutoff and the unit of evidence.",
    uses: ["Data report B.5"],
    s: [
      T(
        "LIM",
        "Two choices of measurement also bound the findings. We report one cutoff, 10, the one the plan named; a smaller cutoff would reward ranking more than coverage and might shift the balance between the two explanations we weigh in Section 5.1. ",
      ),
      T(
        "LIM",
        "We also treat paragraphs as the unit of evidence, with headings joined to the paragraph that follows and captions kept apart. A different segmentation would change both the candidate set and what counts as finding the evidence.",
      ),
    ],
  },
  {
    id: "DIS-3",
    sec: "DIS",
    n: "5.3",
    sub: "Implications",
    w: "d",
    job: "What builders of evidence retrieval can take from this.",
    uses: ["SP-12"],
    claim: "C",
    s: [
      T(
        "IMP",
        "For people building evidence retrieval for question answering over scientific papers, our results support starting from fusion rather than from BM25 alone. The gain is largest on the questions that are hardest to answer from one passage, and it needs no training or tuning beyond the two retrievers. ",
      ),
      T(
        "LIM",
        "Because we did not record the time or cost of each system, we cannot say whether the gain is worth its price in a given setting; that judgement needs measurements we do not have.",
      ),
    ],
  },
  {
    id: "DIS-3b",
    sec: "DIS",
    n: "5.3",
    k: 2,
    w: "d",
    job: "What evaluation practice can take from this.",
    uses: ["row 13"],
    s: [
      T(
        "IMP",
        "For evaluation practice, two points carry beyond this study. First, comparisons of hybrid retrieval should report a same-budget condition, because a fused system that sees more candidates can win without ranking them better. ",
      ),
      T(
        "IMP",
        "Second, when several questions are asked about one document, intervals should resample documents, not questions. In our data the paper-level interval for the main gain was wider than the question-level one, though both excluded zero.",
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
        "On QASPER, fusing BM25 with a dense retriever finds more of the marked evidence than BM25 alone, especially when the evidence is spread out. ",
      ),
      T("F3", "Whether the gain survives at the same budget remains open."),
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
        "We set out to test, under a plan fixed in advance, whether reciprocal rank fusion of BM25 and a dense retriever finds more of the marked evidence in long scientific papers than either retriever alone. ",
      ),
      T(
        "C",
        "Against BM25 it does, by {0.076|row 13} in recall at 10, and more so when the evidence is spread over several paragraphs. When fusion could not draw on a wider pool than BM25, the gain shrank to a value we could not tell apart from zero, which suggests that much of its advantage here comes from coverage.",
      ),
    ],
  },
  {
    id: "CON-3",
    sec: "CON",
    n: "6.3",
    w: "d",
    job: "What should be done next.",
    uses: ["Plan · deferred hypotheses", "C.5"],
    s: [
      T(
        "IMP",
        "Three lines of work follow. The secondary hypotheses in our plan remain to be tested, and the released traces give that work a start. A timing log, which this study lacked, would allow the gain to be weighed against its cost. ",
      ),
      T(
        "IMP",
        "And the same protocol, with a same-budget condition and paper-level intervals, can be applied to scientific papers outside NLP and in other languages, which would show whether the spread effect belongs to fusion or to QASPER.",
      ),
    ],
  },
];

/* ACM style, in order of first citation; 30 cited, 1 quarantined at S02 and never cited */
export const REFS: string[] = [
  "Bruch, S., Gai, S., Ingber, A. (2023). An analysis of fusion functions for hybrid retrieval. ACM Transactions on Information Systems 42(1).",
  "Dasigi, P., Lo, K., Beltagy, I., Cohan, A., Smith, N. A., Gardner, M. (2021). A dataset of information-seeking questions and answers anchored in research papers. NAACL.",
  "Karpukhin, V., Oğuz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., Yih, W. (2020). Dense passage retrieval for open-domain question answering. EMNLP.",
  "Wang, L., Yang, N., Huang, X., Jiao, B., Yang, L., Jiang, D., Majumder, R., Wei, F. (2022). Text embeddings by weakly-supervised contrastive pre-training. arXiv:2212.03533.",
  "Cormack, G. V., Clarke, C. L. A., Büttcher, S. (2009). Reciprocal rank fusion outperforms Condorcet and individual rank learning methods. SIGIR.",
  "Robertson, S., Zaragoza, H. (2009). The probabilistic relevance framework: BM25 and beyond. Foundations and Trends in Information Retrieval 3(4).",
  "Efron, B., Tibshirani, R. J. (1993). An Introduction to the Bootstrap. Chapman & Hall.",
  "Lin, J., Ma, X., Lin, S.-C., Yang, J.-H., Pradeep, R., Nogueira, R. (2021). Pyserini: A Python toolkit for reproducible information retrieval research with sparse and dense representations. SIGIR.",
  "Thakur, N., Reimers, N., Rücklé, A., Srivastava, A., Gurevych, I. (2021). BEIR: A heterogeneous benchmark for zero-shot evaluation of information retrieval models. NeurIPS Datasets and Benchmarks.",
  "Lewis, P., Perez, E., Piktus, A., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. NeurIPS.",
  "Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., Liang, P. (2024). Lost in the middle: How language models use long contexts. Transactions of the ACL 12.",
  "Kuzi, S., Zhang, M., Li, C., Bendersky, M., Najork, M. (2020). Leveraging semantic and lexical matching to improve the recall of document retrieval systems: A hybrid approach. arXiv:2010.01195.",
  "Gao, L., Dai, Z., Chen, T., Fan, Z., Van Durme, B., Callan, J. (2021). Complement lexical retrieval model with semantic residual embeddings. ECIR.",
  "Ma, X., Sun, K., Pradeep, R., Lin, J. (2021). A replication study of dense passage retriever. arXiv:2104.05740.",
  "Chen, T., Zhang, M., Lu, J., Bendersky, M., Najork, M. (2022). Out-of-domain semantics to the rescue! Zero-shot hybrid retrieval models. ECIR.",
  "Fox, E. A., Shaw, J. A. (1994). Combination of multiple searches. The Second Text REtrieval Conference (TREC-2), NIST Special Publication 500-215.",
  "Khattab, O., Zaharia, M. (2020). ColBERT: Efficient and effective passage search via contextualized late interaction over BERT. SIGIR.",
  "Formal, T., Piwowarski, B., Clinchant, S. (2021). SPLADE: Sparse lexical and expansion model for first stage ranking. SIGIR.",
  "Izacard, G., Caron, M., Hosseini, L., Riedel, S., Bojanowski, P., Joulin, A., Grave, E. (2022). Unsupervised dense information retrieval with contrastive learning. Transactions on Machine Learning Research.",
  "Xiong, L., Xiong, C., Li, Y., Tang, K.-F., Liu, J., Bennett, P., Ahmed, J., Overwijk, A. (2021). Approximate nearest neighbor negative contrastive learning for dense text retrieval. ICLR.",
  "Luan, Y., Eisenstein, J., Toutanova, K., Collins, M. (2021). Sparse, dense, and attentional representations for text retrieval. Transactions of the ACL 9.",
  "Kwiatkowski, T., Palomaki, J., Redfield, O., et al. (2019). Natural Questions: A benchmark for question answering research. Transactions of the ACL 7.",
  "Nguyen, T., Rosenberg, M., Song, X., Gao, J., Tiwary, S., Majumder, R., Deng, L. (2016). MS MARCO: A human generated machine reading comprehension dataset. CoCo Workshop at NIPS.",
  "Petroni, F., Piktus, A., Fan, A., et al. (2021). KILT: A benchmark for knowledge intensive language tasks. NAACL.",
  "Wadden, D., Lin, S., Lo, K., Wang, L. L., van Zuylen, M., Cohan, A., Hajishirzi, H. (2020). Fact or fiction: Verifying scientific claims. EMNLP.",
  "Cohan, A., Feldman, S., Beltagy, I., Downey, D., Weld, D. S. (2020). SPECTER: Document-level representation learning using citation-informed transformers. ACL.",
  "Lo, K., Wang, L. L., Neumann, M., Kinney, R., Weld, D. S. (2020). S2ORC: The Semantic Scholar Open Research Corpus. ACL.",
  "Smucker, M. D., Allan, J., Carterette, B. (2007). A comparison of statistical significance tests for information retrieval evaluation. CIKM.",
  "Sakai, T. (2014). Statistical reform in information retrieval? SIGIR Forum 48(1).",
  "Urbano, J., Lima, H., Hanjalic, A. (2019). Statistical significance testing in information retrieval: An empirical analysis of type I, type II and type III errors. SIGIR.",
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
    Method: "The plan, the same-budget condition and two changes to the plan all need stating.",
    Introduction: "The gap is argued from four strands of prior work.",
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
