/* ===== The screens of a live writing run, stage by stage =====
   A live run has the screens of the preview from the intake to the paper outline (S00–S10); a run that goes on to the
   first draft has one more, the paper written section by section (S11–S17). Each screen is a module of
   its own: the stages it shows (their steps as the engine runs them), the files each stage needs before it plays, how
   it plays them onto the screen, and the scene itself. The player (player.ts) runs the stages in order. */

import type { ComponentType } from "react";

import type { StageDef } from "../data/core";
import { SCREEN_OF, STAGE } from "../data/meta";
import { DEFS } from "../engine";
import { ARGUE } from "./argue";
import { DRAFT } from "./draft";
import { FRAME_SCREENS } from "./frame";
import { GATHER } from "./gather";
import { GRAPH } from "./graph";
import { OUTLINE } from "./outline";
import type { RunFileName } from "./types";

export interface LiveStageDef extends StageDef {
  /** The files the stage needs before its scene can play. */
  needs: RunFileName[];
  /** The scene draws its frame as the stage opens and its play waits for each step's files itself (`need`). */
  progressive?: boolean;
  /** Streams the stage's objects onto its screen, its files in. Uses step() and item() of the engine. */
  play(): Promise<void>;
  /** One line on what the stage did, from its files: shown under the stage header when it is done. */
  summary(): string;
}
export interface LiveScreen {
  key: string;
  title: string;
  short: string;
  /** The block of the track it sits in: 0 the input, 1 branch A (the writing frame), 2 branch B (the argument, from the
   * data report to the lock), 3 the join and the outline, 4 the draft. */
  block: number;
  stages: LiveStageDef[];
  Scene: ComponentType<{ live: boolean }>;
  /** The screen is mostly its page: its header takes one line, its decisions fold into one. */
  compact?: boolean;
}

// The intake, then the two branches in the order the engine runs them (the frame first: it calls no model), then the
// join and the outline.
const [INTAKE, ...DATA] = GATHER;
const OUTLINE_SCREENS = [INTAKE, ...FRAME_SCREENS, ...DATA, ...ARGUE, ...GRAPH, ...OUTLINE];
const ALL_SCREENS = [...OUTLINE_SCREENS, ...DRAFT];
/** The screens of the run open in the studio: an outline run's, or a draft run's with the paper as written. */
export const LIVE_SCREENS: LiveScreen[] = [...OUTLINE_SCREENS];
export const LSTAGE: Record<string, LiveStageDef> = Object.fromEntries(
  ALL_SCREENS.flatMap((scr) => scr.stages.map((st) => [st.id, st])),
);
export const LIVE_SCREEN_OF: Record<string, string> = Object.fromEntries(
  ALL_SCREENS.flatMap((scr) => scr.stages.map((st) => [st.id, scr.key])),
);
export const LIVE_BLOCKS = [
  { k: "input", n: "Input" },
  { k: "frame", n: "A · Frame" },
  { k: "argue", n: "B · Argument" },
  { k: "write", n: "Join · Outline" },
];
const DRAFT_BLOCK = { k: "draft", n: "Draft" };

/** While a live run is followed, the engine and the shell read these stage definitions; `draft`: the run goes on to
 * the first draft. */
export function showLiveDefs(draft = false) {
  LIVE_SCREENS.splice(0, LIVE_SCREENS.length, ...(draft ? ALL_SCREENS : OUTLINE_SCREENS));
  if (draft && !LIVE_BLOCKS.includes(DRAFT_BLOCK)) LIVE_BLOCKS.push(DRAFT_BLOCK);
  if (!draft && LIVE_BLOCKS.includes(DRAFT_BLOCK)) LIVE_BLOCKS.splice(LIVE_BLOCKS.indexOf(DRAFT_BLOCK), 1);
  DEFS.stage = (sid) => LSTAGE[sid] ?? STAGE[sid];
  DEFS.screen = (sid) => LIVE_SCREEN_OF[sid] ?? SCREEN_OF[sid];
}

/** Takes a screen off the track: a section the paper's outline does not have is not written, so a screen of that
 * section alone has nothing to show. The paper's screen holds every section, and stays. */
export function dropScreen(key: string) {
  const at = LIVE_SCREENS.findIndex((s) => s.key === key);
  if (at >= 0 && LIVE_SCREENS[at].stages.length === 1) LIVE_SCREENS.splice(at, 1);
}
