import { describe, expect, it } from "vitest";

import type { DebateTurn } from "@/lib/run-stream/contract";

import { parseRanking, summarizeThread, wordDiff } from "./debate-positions";

const turn = (t: Partial<DebateTurn> & Pick<DebateTurn, "id" | "actor" | "stance">): DebateTurn => ({
  text: t.id,
  about: "T1",
  ...t,
});

describe("summarizeThread", () => {
  it("keeps a rewrite made in the same round as the challenges from answering them", () => {
    // The engine's order: proposal, a challenge, the author's rewrite (no reply), another challenge.
    const s = summarizeThread("T1", [
      turn({ id: "p", actor: "theorist", stance: "propose", text: "Retrieval cuts errors by 2 points" }),
      turn({ id: "c1", actor: "methodologist", stance: "challenge", reply_to: "p" }),
      turn({ id: "r", actor: "theorist", stance: "refine", text: "Retrieval cuts errors" }),
      turn({ id: "c2", actor: "skeptic", stance: "challenge", reply_to: "p" }),
    ]);
    expect(s.status).toBe("contested");
    expect(s.objections).toBe(2);
    expect(s.answered).toBe(0);
    expect(s.revision?.id).toBe("r");
    expect(s.positions.map((p) => [p.agent, p.position])).toEqual([
      ["theorist", "revised"],
      ["methodologist", "objects"],
      ["skeptic", "objects"],
    ]);
  });

  it("counts a challenge as answered only when the author replies to it", () => {
    const s = summarizeThread("H1", [
      turn({ id: "p", actor: "theorist", stance: "propose" }),
      turn({ id: "t", actor: "methodologist", stance: "test", reply_to: "p" }),
      turn({ id: "c", actor: "skeptic", stance: "challenge", reply_to: "p" }),
      turn({ id: "r", actor: "theorist", stance: "refine", reply_to: "c" }),
    ]);
    expect(s.status).toBe("revised");
    expect(s.answered).toBe(1);
    expect(s.objections).toBe(0);
    expect(s.positions.find((p) => p.agent === "skeptic")?.position).toBe("answered");
  });

  it("links the engine's answers to the challenges they name", () => {
    // As the engine sends a round: two critiques, then the author's rewrite and defence, each naming its challenge.
    const s = summarizeThread("T1", [
      turn({ id: "p", actor: "theorist", stance: "propose", text: "Retrieval cuts errors by 2 points" }),
      turn({ id: "c1", actor: "methodologist", stance: "challenge", reply_to: "p" }),
      turn({ id: "c2", actor: "skeptic", stance: "challenge", reply_to: "p" }),
      turn({
        id: "r",
        actor: "theorist",
        stance: "refine",
        answers: ["c1"],
        reply_to: "c1",
        text: "Retrieval cuts errors",
      }),
      turn({ id: "d", actor: "theorist", stance: "defend", answers: ["c2"], reply_to: "c2" }),
    ]);
    expect(s.status).toBe("revised");
    expect([s.answered, s.defended, s.objections]).toEqual([1, 1, 0]);
    expect(s.positions.map((p) => p.position)).toEqual(["revised", "answered", "answered"]);
  });

  it("calls a claim defended when every objection got a reasoned no", () => {
    const s = summarizeThread("M2", [
      turn({ id: "p", actor: "methodologist", stance: "propose" }),
      turn({ id: "c", actor: "skeptic", stance: "challenge", reply_to: "p" }),
      turn({ id: "d", actor: "methodologist", stance: "defend", answers: ["c"], reply_to: "c" }),
    ]);
    expect(s.status).toBe("defended");
    expect(s.positions[0]).toMatchObject({ agent: "methodologist", position: "defended" });
    expect(s.tally.defend).toBe(1);
  });

  it("follows an objection through its answer and the critic's review", () => {
    // As the engine sends a round: critique, answer, then each critic's review of the answer to its own challenge.
    const round = [
      turn({ id: "p", actor: "theorist", stance: "propose", text: "Retrieval cuts errors by 2 points" }),
      turn({
        id: "c1",
        actor: "methodologist",
        stance: "challenge",
        reply_to: "p",
        phase: "critique",
        severity: "fatal",
      }),
      turn({ id: "c2", actor: "skeptic", stance: "challenge", reply_to: "p", phase: "critique", severity: "caveat" }),
      turn({ id: "r", actor: "theorist", stance: "refine", answers: ["c1"], reply_to: "c1", phase: "answer" }),
      turn({ id: "d", actor: "theorist", stance: "defend", answers: ["c2"], reply_to: "c2", phase: "answer" }),
    ];
    const accepted = summarizeThread("T1", [
      ...round,
      turn({ id: "v1", actor: "methodologist", stance: "concede", reply_to: "r", answers: ["c1"], phase: "review" }),
      turn({ id: "v2", actor: "skeptic", stance: "concede", reply_to: "d", answers: ["c2"], phase: "review" }),
    ]);
    expect(accepted.status).toBe("accepted");
    expect(accepted.resolved).toBe(2);
    expect(accepted.positions.map((p) => p.position)).toEqual(["revised", "satisfied", "satisfied"]);

    const caveat = summarizeThread("T1", [
      ...round,
      turn({ id: "v1", actor: "methodologist", stance: "concede", reply_to: "r", answers: ["c1"], phase: "review" }),
      turn({
        id: "v2",
        actor: "skeptic",
        stance: "challenge",
        reply_to: "d",
        answers: ["c2"],
        phase: "review",
        severity: "caveat",
      }),
    ]);
    expect(caveat.status).toBe("caveats");
    expect([caveat.objections, caveat.fatal]).toEqual([1, 0]);
    expect(caveat.positions[2]).toMatchObject({ agent: "skeptic", position: "objects", severity: "caveat" });

    const stands = summarizeThread("T1", [
      ...round,
      turn({
        id: "v1",
        actor: "methodologist",
        stance: "challenge",
        reply_to: "r",
        answers: ["c1"],
        phase: "review",
        severity: "fatal",
      }),
    ]);
    expect(stands.status).toBe("contested");
    expect(stands.fatal).toBe(1);
  });

  it("reads agreement, withdrawal and an unanswered proposal", () => {
    const agreed = summarizeThread("M1", [
      turn({ id: "p", actor: "methodologist", stance: "propose" }),
      turn({ id: "a", actor: "theorist", stance: "concede", reply_to: "p" }),
      turn({ id: "b", actor: "skeptic", stance: "concede", reply_to: "p" }),
    ]);
    expect(agreed.status).toBe("agreed");
    expect(agreed.tally.concede).toBe(2);

    const withdrawn = summarizeThread("C5", [
      turn({ id: "p", actor: "theorist", stance: "propose" }),
      turn({ id: "c", actor: "methodologist", stance: "challenge", reply_to: "p" }),
      turn({ id: "w", actor: "theorist", stance: "concede", reply_to: "c" }),
    ]);
    expect(withdrawn.status).toBe("withdrawn");
    expect(withdrawn.positions[0]).toMatchObject({ agent: "theorist", position: "withdrew" });

    expect(summarizeThread("S1", [turn({ id: "p", actor: "skeptic", stance: "propose" })]).status).toBe("open");
  });

  it("takes an agent's latest turn as its position", () => {
    const s = summarizeThread("T2", [
      turn({ id: "p", actor: "theorist", stance: "propose" }),
      turn({ id: "c", actor: "skeptic", stance: "challenge", reply_to: "p" }),
      turn({ id: "a", actor: "skeptic", stance: "concede", reply_to: "p" }),
    ]);
    expect(s.status).toBe("agreed");
    expect(s.positions[1]).toMatchObject({ agent: "skeptic", position: "agrees", turnId: "a" });
  });
});

describe("wordDiff", () => {
  it("marks removed and added words", () => {
    expect(wordDiff("cuts errors by at least 2 points", "cuts unsupported errors")).toEqual([
      { kind: "same", text: "cuts" },
      { kind: "add", text: "unsupported" },
      { kind: "same", text: "errors" },
      { kind: "del", text: "by at least 2 points" },
    ]);
  });

  it("gives up when the texts share too little", () => {
    expect(wordDiff("stress carries part of the effect", "then only an indirect path is claimed here")).toBeNull();
  });
});

describe("parseRanking", () => {
  const names = { theorist: "theorist", skeptic: "skeptic" } as const;

  it("reads the judge's lines", () => {
    expect(parseRanking("1. Theorist (8/10): tied to gaps\n2. Skeptic: weak", names)).toEqual([
      { place: 1, name: "Theorist", agent: "theorist", score: 8, reason: "tied to gaps" },
      { place: 2, name: "Skeptic", agent: "skeptic", score: undefined, reason: "weak" },
    ]);
  });

  it("returns null for text in another shape", () => {
    expect(parseRanking("The Theorist wins.", names)).toBeNull();
  });
});
