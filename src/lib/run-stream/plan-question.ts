import { DESIGN_DOCUMENTS, designText } from "./experiment-design";

const QUESTION_SECTION = /^##[ \t]+Research question[ \t]*\r?\n([\s\S]*?)(?=^#{1,2}[ \t]|(?![\s\S]))/im;

/** The text under "## Research question" in a plan document, on one line; undefined when it has none. */
export function questionFromMarkdown(markdown?: unknown): string | undefined {
  if (typeof markdown !== "string") return undefined;
  return designText(QUESTION_SECTION.exec(markdown)?.[1].replace(/\s+/g, " "));
}

/** The question the first plan document that records one gives, from the documents by schema. */
export const questionFromDocuments = (documents?: Readonly<Record<string, unknown>>) =>
  DESIGN_DOCUMENTS.map((schema) => questionFromMarkdown(documents?.[schema])).find(Boolean);
