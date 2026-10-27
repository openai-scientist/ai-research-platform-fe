import Link from "next/link";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LEGAL_CONTACT_EMAIL, LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: `Contact | ${APP_CONFIG.name}`,
  description: `How to reach the ${APP_CONFIG.name} team.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact" dated={false}>
      <p>
        Write to the {APP_CONFIG.name} team at{" "}
        <a className="underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
        . One address handles support, questions about your data and anything about these pages.
      </p>

      <h2>What you can write about</h2>
      <ul>
        <li>Problems signing in, or a sign-in code or link that does not arrive.</li>
        <li>Access to a project, or an invitation you expected to receive.</li>
        <li>
          Your data: a copy of it, a correction, or deleting your account and its data, as described in the{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </li>
        <li>Removing the platform&apos;s access to your Google Drive, if deleting the connection did not work.</li>
        <li>A security issue you found. Describe it without using it to reach other people&apos;s data.</li>
      </ul>

      <h2>What to include</h2>
      <ul>
        <li>The email address of your account and, if it is about a project, the project&apos;s name.</li>
        <li>What you did, what you expected and what happened instead.</li>
        <li>Never send a sign-in code, a sign-in link or a data connection password.</li>
      </ul>

      <p>
        {APP_CONFIG.independence} The rules for using the platform are in the{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPage>
  );
}
