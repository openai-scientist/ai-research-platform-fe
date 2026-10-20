import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LEGAL_CONTACT_EMAIL, LegalPage } from "../_components/legal-page";

export const metadata: Metadata = { title: `Privacy Policy | ${APP_CONFIG.name}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {APP_CONFIG.name} is a research platform that takes a research idea through hypothesis and experiment design to
        a report. This policy explains what we collect, why, and what you can do about it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address, profile picture and password (stored only as a hash).</li>
        <li>
          If you sign in with Google: your Google account&apos;s name, email address and profile picture. We do not
          receive your Google password.
        </li>
        <li>Content you add: projects, uploaded files and datasets, research runs, reviews and comments.</li>
        <li>
          Data connections you create: the connection settings you enter. Passwords and access tokens are encrypted
          before they are stored.
        </li>
        <li>Technical records: sign-in sessions, audit events and request logs used to keep the service secure.</li>
      </ul>

      <h2>Google user data</h2>
      <p>
        When you connect Google Drive or Google Sheets to a project, we request read-only access to Google Drive. We use
        it only to list and read the files you choose and to import their contents into that project as datasets. We
        never modify or delete your files, and we do not use Google user data for advertising or sell it.
      </p>
      <p>
        Our use and transfer of information received from Google APIs adheres to the{" "}
        <a
          className="underline underline-offset-4"
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. You can remove our access at any time from your Google Account
        permissions page or by deleting the connection in the project.
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>
          To provide the platform: run research stages, store your files and show results to your project members.
        </li>
        <li>To send emails you need, such as sign-up codes, password resets, invitations and project notices.</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>
      <p>We do not sell personal data and do not use it for advertising.</p>

      <h2>Who processes it</h2>
      <ul>
        <li>Cloudflare stores uploaded files and serves the website.</li>
        <li>Resend delivers our emails.</li>
        <li>
          AI model providers configured for the platform process the research content of a run in order to produce its
          results.
        </li>
      </ul>

      <h2>Retention and deletion</h2>
      <p>
        We keep your data while your account or project exists. Deleting a dataset, connection or project removes it
        from the platform. To delete your account and its data, write to us at the address below.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your data:{" "}
        <a className="underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
