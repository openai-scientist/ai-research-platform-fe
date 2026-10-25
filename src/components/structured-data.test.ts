import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { APP_CONFIG } from "@/config/app-config";

import { StructuredData } from "./structured-data";

function graph() {
  const html = renderToStaticMarkup(createElement(StructuredData));
  const json = html.match(/<script type="application\/ld\+json">(.*)<\/script>/)?.[1];
  return JSON.parse(json ?? "null")["@graph"] as Array<Record<string, unknown>>;
}

describe("StructuredData", () => {
  it("describes the product and the organization behind it", () => {
    const [app, organization] = graph();
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app.name).toBe(APP_CONFIG.name);
    expect(organization["@type"]).toBe("Organization");
    expect(app.publisher).toEqual({ "@id": organization["@id"] });
  });

  it("gives the organization a contact point and a postal address", () => {
    const organization = graph()[1];
    expect(organization.contactPoint).toMatchObject({ "@type": "ContactPoint", email: APP_CONFIG.contactEmail });
    expect(organization.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Ho Chi Minh City",
      addressCountry: "VN",
    });
  });

  it("escapes < so no value can end the script tag", () => {
    const html = renderToStaticMarkup(createElement(StructuredData));
    expect(html.indexOf("<", 1)).toBe(html.indexOf("</script>"));
  });
});
