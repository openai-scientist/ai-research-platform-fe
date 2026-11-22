/* ===== The paper's words as the printed paper sets them =====
   The run stores each text as written; the printed paper sets it in one spelling, each term in its running case and
   counts in the paper's number style, and opens on a line that says what the draft is. The page shows the paper as
   printed: it asks the writing engine to set each text it shows, once, and keeps the answer. A text you leave as
   shown is saved as stored, so showing it never counts as a change. */

import { fetchDocument } from "@/lib/api/services/fetch-document";

import { LIVE } from "./run";

const shown = new Map<string, string>();
const stored = new Map<string, string>();
const asked = new Set<string>();
let waiting: string[] = [];
let timer = 0;
let run = "";
export const PRINT = { banner: null as string | null, ready: false, version: 0, listeners: new Set<() => void>() };
function told() {
  PRINT.version += 1;
  for (const l of PRINT.listeners) l();
}
/** The same text as the editor gives it back: the space before a citation as the paper writes it. */
const even = (t: string) => t.replace(/ {2,}\[@/g, " [@").trim();

async function ask() {
  const texts = waiting;
  waiting = [];
  const forRun = run;
  try {
    const out = (await fetchDocument.print(LIVE.projectId, forRun, texts)).data;
    if (forRun !== run) return;
    out.texts.forEach((t, i) => {
      shown.set(texts[i], t);
      stored.set(even(t), texts[i]);
    });
    PRINT.banner = out.banner;
    PRINT.ready = true;
    told();
  } catch {
    // Not set yet: the page shows the text as stored, and asks again for it next time it shows it.
    for (const t of texts) asked.delete(t);
  }
}

/** A text as the paper prints it, once the engine has set it; as stored until then. */
export function printedText(text: string): string {
  if (LIVE.runId !== run) {
    run = LIVE.runId;
    shown.clear();
    stored.clear();
    asked.clear();
    PRINT.banner = null;
    PRINT.ready = false;
  }
  const out = shown.get(text);
  if (out !== undefined) return out;
  if (text && !asked.has(text)) {
    asked.add(text);
    waiting.push(text);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void ask(), 60);
  }
  return text;
}
/** A text as the page shows it, as the run stored it: what you did not change is saved as it was. */
export function storedText(text: string): string {
  return stored.get(even(text)) ?? text;
}
