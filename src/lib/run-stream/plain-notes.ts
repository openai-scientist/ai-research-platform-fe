/**
 * System notes the stages write for themselves, said again for the researcher. Known notes are mapped; any other text is
 * returned as it came, so a new note is never hidden or garbled.
 */

const runs = (n: string) => (n === "1" ? "one earlier run" : `${n} earlier runs`);

const RULES: readonly [pattern: RegExp, say: (...match: string[]) => string][] = [
  [
    /the claim is not fresh: (\d+) earlier runs? on this file already saw its result/gi,
    (_all, n) =>
      `This run is a second look at data that ${runs(n)} already opened for this claim, so its result is not confirmatory evidence.`,
  ],
  [
    /the claim is not fresh: it was chosen after (\d+) earlier runs? of the researcher on this file unsealed results on the same rows/gi,
    (_all, n) =>
      `This claim was chosen after ${runs(n)} of yours opened results on the same rows, so this run is a second look and its result is not confirmatory evidence.`,
  ],
  [
    /the researcher has already looked at this data, so the result may be known before the test/gi,
    () =>
      "You said you have already looked at this data, so the result may be known before the test and is not confirmatory.",
  ],
  [
    /the run ended before the unseal/gi,
    () => "Execution stopped before the results were opened, so this step never ran.",
  ],
  [/the results are sealed; call request_unseal/gi, () => "The results are still sealed: they were never opened."],
  [/the results are sealed/gi, () => "The results are still sealed: they were never opened."],
  [/(H\d+) has no verdict/g, (_all, id) => `${id} has no verdict, because its result was never opened.`],
  [/the interpretation is not written; call interpret/gi, () => "The interpretation is not written yet."],
  [/the replicator has not run/gi, () => "The independent replication has not run."],
  [
    /the plan names no external validation/gi,
    () => "The plan names no outside data to check against, so this step does not apply.",
  ],
  [
    /(H\d+) has no accepted claim: the researcher accepts it with one sentence of their own words \(accept_claim\)/g,
    (_all, id) => `${id} has no accepted claim yet: you accept it with one sentence in your own words.`,
  ],
];

/** A system note in plain words, or the note itself when it is not one this knows. */
export function plainNote(text: string): string {
  let out = text;
  for (const [pattern, say] of RULES) out = out.replace(pattern, (...m) => say(...(m.slice(0, -2) as string[])));
  return out;
}
