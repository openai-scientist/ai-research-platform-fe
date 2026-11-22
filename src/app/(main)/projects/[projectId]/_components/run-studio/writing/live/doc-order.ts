/* ===== Where each part of the paper stands on the page: its sections in order, each one's paragraphs, and each
   table's and figure's number =====
   Read from the document itself each time it changes, so the outline, the numbers and the dialogs say what the page
   shows, a paragraph you just moved included, before any save. */

import { useSyncExternalStore } from "react";

import type { Node as PMNode } from "@tiptap/pm/model";

export interface BodySection {
  sid: string;
  /** The state the run left the section in: kept, written by code, or still being written. */
  state: string;
  /** A statement after the body: unnumbered, and it stays at the end. */
  back: boolean;
  heading: string;
  paras: { pid: string; text: string }[];
}

interface Store {
  version: number;
  sig: string;
  listeners: Set<() => void>;
}
/** The paper's sections where they stand on the page; empty until the editor has drawn it. */
export const BODY: Store & { sections: BodySection[] } = { sections: [], version: 0, sig: "", listeners: new Set() };
/** Each table's and figure's number, by the order the page first names it, the title and abstract included. */
export const NUMS: Store & { of: Record<string, string> } = { of: {}, version: 0, sig: "", listeners: new Set() };

function tell(store: Store, sig: string, take: () => void) {
  if (store.sig === sig) return;
  take();
  store.sig = sig;
  store.version += 1;
  for (const l of store.listeners) l();
}

/** Tables and figures numbered as the printed paper numbers them: in the order the text first names each. */
export function numbersOf(doc: PMNode): Record<string, string> {
  const order: string[] = [];
  doc.descendants((n) => {
    if (n.type.name === "exhibitRef" && !order.includes(String(n.attrs.k))) order.push(String(n.attrs.k));
    return true;
  });
  const count = { tab: 0, fig: 0 };
  const nums: Record<string, string> = {};
  for (const k of order) {
    const kind = k.startsWith("tab:") ? "tab" : "fig";
    count[kind] += 1;
    nums[k] = `${kind === "tab" ? "Table" : "Figure"} ${count[kind]}`;
  }
  return nums;
}

/** Reads the page again after a change. */
export function readOrder(doc: PMNode) {
  const sections: BodySection[] = [];
  doc.forEach((sec) => {
    if (sec.type.name !== "section") return;
    const paras: BodySection["paras"] = [];
    sec.forEach((p) => {
      if (p.type.name === "paragraph") paras.push({ pid: String(p.attrs.pid), text: p.textContent.slice(0, 160) });
    });
    sections.push({
      sid: String(sec.attrs.sid),
      state: String(sec.attrs.state),
      back: Boolean(sec.attrs.back),
      heading: sec.firstChild?.textContent ?? "",
      paras,
    });
  });
  tell(BODY, JSON.stringify(sections), () => {
    BODY.sections = sections;
  });
  const nums = numbersOf(doc);
  tell(NUMS, JSON.stringify(nums), () => {
    NUMS.of = nums;
  });
}

const subscriber = (store: Store) => (l: () => void) => {
  store.listeners.add(l);
  return () => store.listeners.delete(l);
};
const onBody = subscriber(BODY);
const onNums = subscriber(NUMS);
export const useBody = () =>
  useSyncExternalStore(
    onBody,
    () => BODY.version,
    () => BODY.version,
  );
export const useNums = () =>
  useSyncExternalStore(
    onNums,
    () => NUMS.version,
    () => NUMS.version,
  );

/** The body's sections on the page, the statements after it left out. */
export const bodySections = () => BODY.sections.filter((s) => !s.back);

/** A paragraph's number where it stands on the page: its section's, then its own ("3.2"); empty if not on it. */
export function placeOf(pid: string) {
  for (const [i, s] of bodySections().entries()) {
    const at = s.paras.findIndex((p) => p.pid === pid);
    if (at >= 0) return `${i + 1}.${at + 1}`;
  }
  return "";
}
