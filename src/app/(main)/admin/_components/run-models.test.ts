import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { IntegrationSettings } from "./run-models";

vi.mock("@/hooks/use-api", () => ({
  useApiQuery: () => ({
    data: [{ name: "typesafe", configured: true, updated_at: null }],
    isPending: false,
  }),
  useApiMutation: () => ({ isPending: false }),
}));

it("renders each provider's key link in its row and opens it safely in a new tab", () => {
  const html = renderToStaticMarkup(createElement(IntegrationSettings));
  const links = [
    ["Manage your Typesafe key", "https://console.typesafe.ai/keys"],
    ["Get a OpenAlex key", "https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication"],
    ["Get a Semantic Scholar key", "https://www.semanticscholar.org/product/api#api-key-form"],
    ["Get a Hugging Face key", "https://huggingface.co/settings/tokens"],
  ];

  for (const [label, url] of links) {
    const row = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/g)?.find((part) => part.includes(label));
    expect(row).toContain(`href="${url}" target="_blank" rel="noopener noreferrer"`);
  }
});
