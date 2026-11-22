"use client";
"use no memo";

/* ===== Live screen of branch A: the writing frame (S00A) =====
   Built from the journal profile alone, beside the argument and before its first step: the stage plays the frame card by
   card as its file comes in at checkpoint F (the profile, what the journal asks, how each section is built, how every
   sentence reads, what you may change). No model works here: every step is code reading the profile. */

import { item, reveal, step } from "../engine";
import { FL, FRAME_SID, FrameBody, frameLine, journalRules } from "./frame-body";
import { need } from "./kit";
import { plural } from "./outline-data";
import { file, LIVE } from "./run";
import type { LiveScreen } from "./stages";

async function playFrame() {
  if (!(await need(FRAME_SID, "WritingFrame.json"))) return;
  const f = file("WritingFrame.json");
  if (!f) return;
  await step(
    FRAME_SID,
    "f1",
    async () => {
      reveal("[data-frame-rules]");
      for (const [i, r] of journalRules(f).entries()) await item(FL.rules, i, { id: r.item, text: r.why, wait: 160 });
    },
    {
      text: f.profile.generic
        ? "No journal is chosen yet: the generic profile sets what the paper must meet."
        : `What ${f.profile.name} asks of the paper.`,
    },
  );
  await step(
    FRAME_SID,
    "f2",
    async () => {
      reveal("[data-frame-secs]", "center");
      for (const [i, s] of f.sections.entries()) await item(FL.secs, i, { id: s.section_id, wait: 420 });
    },
    {
      text: `The paper's shape: ${plural(f.sections.length, "section")}, each with its length and its moves.`,
    },
  );
  await step(
    FRAME_SID,
    "f3",
    async () => {
      reveal("[data-frame-style]", "center");
      for (const [i, text] of f.style.sentence_rules.entries())
        await item(FL.sent, i, { id: String(i), text, wait: 160 });
      for (const [i, [part, line]] of Object.entries(f.style.argument_map).entries())
        await item(FL.tmap, i, { id: part, text: line, wait: 220 });
    },
    {
      text: `${plural(f.style.sentence_rules.length, "sentence rule")} every writer follows.`,
    },
  );
  await step(
    FRAME_SID,
    "f4",
    async () => {
      reveal("[data-frame-choices]", "center");
      for (const [i, c] of f.choices.entries()) await item(FL.choices, i, { id: c.key, text: c.why, wait: 220 });
    },
    {
      text: `${plural(f.choices.length, "choice")} you may change.`,
    },
  );
}

const FRAME: LiveScreen = {
  key: "frame",
  title: "Set how the paper will be written",
  short: "Writing frame",
  block: 1,
  Scene: FrameBody,
  stages: [
    {
      id: FRAME_SID,
      ph: 2,
      progressive: true,
      short: "Writing frame",
      name: "Writing Frame",
      a: "code",
      title: "Set how the paper will be written",
      lead: "Branch A reads the journal profile to set how the paper will be written. Code only, no model.",
      outs: ["WritingFrame.json", "Scorecard_F.json"],
      steps: [
        { id: "f1", a: "code", t: "Read what the journal asks" },
        { id: "f2", a: "code", t: "Lay out the paper's shape" },
        { id: "f3", a: "code", t: "Set how every sentence reads" },
        { id: "f4", a: "code", t: "Offer the choices you may change" },
      ],
      needs: ["WritingFrame.json"],
      play: playFrame,
      summary: () => {
        const f = file("WritingFrame.json");
        if (f) return frameLine(f);
        const done = LIVE.summary[FRAME_SID] as { sections?: string[]; rules?: number } | undefined;
        return done?.sections
          ? `${plural(done.sections.length, "section")} and ${plural(done.rules ?? 0, "rule")} in the frame.`
          : "The writing frame is set.";
      },
    },
  ],
};

export const FRAME_SCREENS: LiveScreen[] = [FRAME];
