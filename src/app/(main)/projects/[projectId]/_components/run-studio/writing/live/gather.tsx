"use client";
"use no memo";

/* ===== Live screens of the data block: the intake, the data report and the evidence ledger =====
   Each screen stands in full from the moment its stage opens, its parts as skeletons, and fills as the stage's step
   publishes its files (gather-handoff, gather-report, gather-evidence: the preview's scenes on the run's data). Steps
   say what the engine really did: the intake and the ledger are code checks; the data report is laid out by the Data
   Steward, then checked by code. */

import { EvidenceLive, evidenceSummary, playEvidence } from "./gather-evidence";
import { HandoffLive, intakeSummary, playIntake } from "./gather-handoff";
import { playReport, ReportLive, reportSummary } from "./gather-report";
import type { LiveScreen } from "./stages";

const HANDOFF: LiveScreen = {
  key: "handoff",
  title: "Check what the experiment run handed over",
  short: "Intake",
  block: 0,
  Scene: HandoffLive,
  stages: [
    {
      id: "S00",
      ph: 0,
      progressive: true,
      short: "Intake",
      name: "Run Output Intake",
      a: "code",
      title: "Check what the experiment run handed over",
      lead: "The experiment run hands over one object, its experiment result package: the protocol it was held to, data and environment, the runs, the results, the deviations and the figures. The sources come from the research record. Each part is checked before anyone writes from it; what the paper cannot use is named, never filled in.",
      outs: ["IntakeChecks.json", "IntakeIssues.json"],
      steps: [
        { id: "a0", a: "code", t: "Open the experiment result package" },
        { id: "a1", a: "code", t: "Check the package, the protocol, the data and the environment" },
        { id: "a2", a: "code", t: "Check the runs and the results" },
        { id: "a3", a: "code", t: "Check the deviations, figures and sources" },
        { id: "a4", a: "code", t: "Name what the paper cannot use" },
      ],
      needs: ["IntakeChecks.json", "IntakeIssues.json", "experiment_result.json"],
      play: playIntake,
      summary: intakeSummary,
    },
  ],
};

const REPORT: LiveScreen = {
  key: "report",
  title: "Lay the record into the data report",
  short: "Data report",
  block: 2,
  Scene: ReportLive,
  stages: [
    {
      id: "S01",
      ph: 0,
      progressive: true,
      short: "Data report",
      name: "Standard Data Report",
      a: "ds",
      title: "Lay the record into the data report",
      lead: "The Data Steward lays the record into one standard frame for data science, built from REFORMS, the pre-registration template for existing data, the NeurIPS checklist and Datasheets for Datasets. Code then reads the study's profile, applies the frame's rules and sets the claim ceiling: how strongly the paper may speak. Whether the method is sound is argued later, in the debate.",
      outs: ["DataReport.json", "ClaimCeiling.json", "LinkChain.json"],
      steps: [
        { id: "r1", a: "ds", t: "Lay the record into the standard frame" },
        { id: "r2", a: "code", t: "Read the study's profile and apply the frame's rules" },
        { id: "r3", a: "code", t: "Check the plan was locked before the runs" },
        { id: "r4", a: "code", t: "Link each hypothesis to its analyses, results and runs" },
        { id: "r5", a: "code", t: "Compare the runs with the plan" },
        { id: "r6", a: "code", t: "Set the claim ceiling" },
      ],
      needs: ["DataReport.json", "ClaimCeiling.json", "LinkChain.json"],
      play: playReport,
      summary: reportSummary,
    },
  ],
};

const EVIDENCE: LiveScreen = {
  key: "evidence",
  title: "Build the evidence ledger",
  short: "Evidence",
  block: 2,
  Scene: EvidenceLive,
  stages: [
    {
      id: "S02",
      ph: 0,
      progressive: true,
      short: "Evidence",
      name: "Evidence Ledger & Research Readiness",
      a: "code",
      title: "Build the evidence ledger",
      lead: "Every reference is resolved at its source, every number the paper may print gets a ledger entry, and every quotable sentence is kept with its source. The package's numbers are recomputed from the records behind them. What is missing stays named; nothing is written to fill a gap.",
      outs: ["EvidenceLedger.json", "ReadinessReport.md"],
      steps: [
        { id: "b1", a: "code", t: "Resolve every reference" },
        { id: "b2", a: "code", t: "Index the numbers and the quotable sentences" },
        { id: "b3", a: "code", t: "Recompute the numbers from their records" },
        { id: "b4", a: "code", t: "Name what is missing" },
      ],
      needs: ["EvidenceLedger.json"],
      play: playEvidence,
      summary: evidenceSummary,
    },
  ],
};

export const GATHER: LiveScreen[] = [HANDOFF, REPORT, EVIDENCE];
