import { APP_CONFIG } from "@/config/app-config";
import { SITE_URL } from "@/config/site-url";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// Who runs the product and what it is, for search engines and agents. Rendered once, in the root layout.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: APP_CONFIG.name,
      description: APP_CONFIG.meta.description,
      url: SITE_URL,
      applicationCategory: "Research",
      operatingSystem: "Web browser",
      publisher: { "@id": ORGANIZATION_ID },
    },
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: APP_CONFIG.name,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      email: APP_CONFIG.contactEmail,
      address: { "@type": "PostalAddress", addressLocality: "Ho Chi Minh City", addressCountry: "VN" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: APP_CONFIG.contactEmail,
        availableLanguage: ["English"],
      },
    },
  ],
};

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD of fixed values, with "<" escaped as the Next.js guide shows
      dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
    />
  );
}
