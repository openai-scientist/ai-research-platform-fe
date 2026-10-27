import Link from "next/link";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LEGAL_CONTACT_EMAIL, LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: `About | ${APP_CONFIG.name}`,
  description: APP_CONFIG.meta.description,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage title={`About ${APP_CONFIG.name}`} dated={false}>
      <p>
        {APP_CONFIG.name} is a research platform that takes a research idea through hypotheses and experiment design to
        a written, evidence-based report.
      </p>

      <h2>Who it is for</h2>
      <ul>
        <li>Researchers who want to test an idea against data and sources before they write about it.</li>
        <li>Project managers who coordinate datasets, research runs, findings and collaborators in one project.</li>
        <li>Platform administrators who manage accounts, projects and the platform itself.</li>
      </ul>

      <h2>How it works</h2>
      <ul>
        <li>A project holds the work: its members, its datasets and its research runs.</li>
        <li>
          Datasets come from files you upload or from Google Drive and Google Sheets, which are connected read-only.
        </li>
        <li>
          A research run moves through stages, from hypotheses and experiment design to the report. AI models help
          produce each stage, and the project&apos;s members review the results before relying on them.
        </li>
        <li>You sign in with a code sent to your email or with Google. There is no password to remember.</li>
      </ul>

      <h2>Who runs it</h2>
      <p>
        {APP_CONFIG.independence} How we handle your data is described in the{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        , and the rules for using the platform in the{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
        . Questions go to{" "}
        <a className="underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
