/* ===== The player of a live run: each stage opens when the engine begins it and plays when its files are in =====
   Stages the run finished before you opened it play at once; the stage the run is in plays at the pace of the preview,
   as its files arrive. A stage whose files are late (the run has gone on, nothing is left to read) is closed on its
   summary, and its scene fills when the files come. */

import { closeStage, emit, ensureStages, log, openStage, S, sleep } from "../engine";
import { outlineSections } from "./draft-data";
import { PLAYING, until } from "./kit";
import { has, LIVE, LIVE_STAGES, SECTION_OF_STAGE } from "./run";
import { dropScreen, LIVE_SCREEN_OF, LSTAGE } from "./stages";

const later = (sid: string) => LIVE_STAGES.slice(LIVE_STAGES.indexOf(sid) + 1).some((x) => LIVE.begun.has(x));
const filesIn = (sid: string) => has(...LSTAGE[sid].needs);
/** Stages a run made by an earlier engine does not have. */
const OPTIONAL = new Set(["S00A"]);

/** Plays a live run from its first stage; `replay` plays a finished run again at the pace of the preview. */
export async function playLive(replay = false) {
  ensureStages(LIVE_STAGES);
  for (const sid of LIVE_STAGES) {
    await until(
      () =>
        LIVE.begun.has(sid) ||
        LIVE.finished.has(sid) ||
        Boolean(LIVE.failed) ||
        (OPTIONAL.has(sid) && later(sid) && LIVE.caughtUp),
    );
    // A run made before its engine had this stage (the writing frame) goes on without it: its screen leaves the track.
    if (OPTIONAL.has(sid) && !LIVE.begun.has(sid) && !LIVE.finished.has(sid) && !LIVE.failed) {
      dropScreen(LIVE_SCREEN_OF[sid]);
      S.st[sid].status = "done";
      emit();
      continue;
    }
    // A section the outline does not have: its stage passes without writing, and its screen leaves the track.
    const sec = SECTION_OF_STAGE[sid];
    if (sec && has("ManuscriptBlueprint.json") && !outlineSections().some((s) => s.id === sec)) {
      dropScreen(LIVE_SCREEN_OF[sid]);
      S.st[sid].status = "done";
      emit();
      continue;
    }
    if (LIVE.failed && !LIVE.begun.has(sid)) break;
    // What already happened before you looked plays at once; what happens now plays at the preview's pace.
    S.fast = !replay && LIVE.past.has(sid);
    openStage(sid);
    if (LSTAGE[sid].progressive) {
      // The scene draws its frame now and plays each part as its step publishes (`need` in the stage's play).
      S.n[PLAYING(sid)] = 1;
      emit();
      await LSTAGE[sid].play();
      await until(() => LIVE.finished.has(sid) || Boolean(LIVE.failed));
      closeStage(sid, LIVE.failed && !filesIn(sid) ? "Stopped here." : LSTAGE[sid].summary());
      if (LIVE.failed) break;
      continue;
    }
    await until(() => filesIn(sid) || Boolean(LIVE.failed) || (LIVE.finished.has(sid) && later(sid) && LIVE.caughtUp));
    if (!filesIn(sid)) {
      // The run went on without this stage's files: give them a moment, then close it on its summary.
      await sleep(1500);
      if (!filesIn(sid)) {
        S.st[sid].status = "done";
        closeStage(sid, LIVE.failed ? "Stopped here." : LSTAGE[sid].summary());
        if (LIVE.failed) break;
        continue;
      }
    }
    S.n[PLAYING(sid)] = 1;
    emit();
    await LSTAGE[sid].play();
    // A stage plays faster than the engine works: its screen waits for the engine to finish it.
    await until(() => LIVE.finished.has(sid) || Boolean(LIVE.failed));
    closeStage(sid, LSTAGE[sid].summary());
    if (LIVE.failed) break;
  }
  S.fast = false;
  if (LIVE.failed) {
    S.lifecycle = "failed";
    S.failure = LIVE.failed;
    log("or", `Run stopped. ${LIVE.failed}`);
  } else {
    await until(() => Boolean(LIVE.published));
    S.done = true;
    log(
      "or",
      LIVE.draft
        ? "The first draft is published, written section by section from the outline; it is not read back yet."
        : "The paper outline is published: every section, paragraph and sentence planned.",
    );
  }
  emit();
}
