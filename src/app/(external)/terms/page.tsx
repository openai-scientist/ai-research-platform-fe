import Link from "next/link";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LEGAL_CONTACT_EMAIL, LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_CONFIG.name}`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply when you use {APP_CONFIG.name}. By creating an account or using the platform you accept them.
        {` ${APP_CONFIG.independence}`}
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in details private. You are responsible for what happens under your account.</li>
        <li>Give accurate information and keep your email address up to date.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep the rights to the files, data and text you add. You allow us to store and process them only to run the
        platform for you and the members of your projects. Add only data you are allowed to use, and do not upload
        personal data of others without a lawful basis.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not break the law, infringe others&apos; rights or try to access data that is not yours.</li>
        <li>Do not disrupt the service, probe it for weaknesses or get around its limits.</li>
      </ul>

      <h2>Research results</h2>
      <p>
        Hypotheses, experiment designs and reports are produced with the help of AI models and may be incomplete or
        wrong. Review them before relying on them. They are not professional, medical, legal or financial advice.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The platform is provided as is, without warranties. We may change or suspend features, and may update these
        terms; the date above shows the latest version. We may suspend accounts that break these terms.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle personal data is described in the{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Contact</h2>
      <p>
        <a className="underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
