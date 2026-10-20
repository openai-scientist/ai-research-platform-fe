import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import type { Root as LatexRoot, Macro, Node } from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import type { Root } from "hast";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { unified } from "unified";
import { visit } from "unist-util-visit";

function argument(node: Macro): Node[] {
  return node.args?.at(-1)?.content ?? [];
}

function text(content: string): Node {
  return { type: "string", content };
}

function children(node: Node): Node[][] {
  const groups: Node[][] = [];
  if ("content" in node && Array.isArray(node.content)) groups.push(node.content);
  if ("args" in node) groups.push(...(node.args ?? []).map((arg) => arg.content));
  return groups;
}

// Resolve ordinary article references before conversion; no TeX macros or file includes are executed.
function prepareReferences(tree: LatexRoot) {
  const references = new Map<string, string>();
  const counters = new Map<string, number>();
  const collect = (nodes: Node[], context?: string) => {
    let current = context;
    for (const node of nodes) {
      if (node.type === "environment" || node.type === "mathenv") {
        const name = node.env;
        if (["table", "figure", "equation"].includes(name)) {
          const count = (counters.get(name) ?? 0) + 1;
          counters.set(name, count);
          children(node).forEach((group) => {
            collect(group, String(count));
          });
          continue;
        }
      }
      if (node.type === "macro" && node.content === "section" && !node.args?.[0]?.content.length) {
        const count = (counters.get("section") ?? 0) + 1;
        counters.set("section", count);
        current = String(count);
      }
      if (node.type === "macro" && node.content === "label" && current) {
        references.set(printRaw(argument(node)), current);
      }
      children(node).forEach((group) => {
        collect(group, current);
      });
    }
  };
  collect(tree.content);

  const clean = (nodes: Node[]) => {
    for (let index = nodes.length - 1; index >= 0; index--) {
      const node = nodes[index];
      if (node.type === "macro") {
        if (["label", "centering", "toprule", "midrule", "bottomrule", "hline", "cmidrule"].includes(node.content)) {
          nodes.splice(index, 1);
          continue;
        }
        if (["ref", "eqref"].includes(node.content)) {
          const key = printRaw(argument(node));
          const value = references.get(key) ?? key;
          nodes[index] = text(node.content === "eqref" ? `(${value})` : value);
          continue;
        }
      }
      children(node).forEach(clean);
    }
  };
  clean(tree.content);
}

function normalizeMath() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      const classes = node.properties.className;
      if (!Array.isArray(classes)) return;
      if (classes.includes("inline-math")) node.properties.className = ["math-inline"];
      if (classes.includes("display-math")) node.properties.className = ["math-display"];
    });
  };
}

function isHtmlRoot(tree: unknown): tree is Root {
  return (
    typeof tree === "object" &&
    tree !== null &&
    "type" in tree &&
    tree.type === "root" &&
    "children" in tree &&
    Array.isArray(tree.children)
  );
}

const htmlProcessor = unified()
  .use(normalizeMath)
  // Sanitize the document before the trusted math renderer adds its own markup/styles.
  .use(rehypeSanitize, {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption"],
    attributes: {
      ...defaultSchema.attributes,
      div: [["className", "document-title", "abstract", "math-display"]],
      span: [["className", "math-inline", "texttt"]],
    },
  })
  .use(rehypeKatex, { trust: false, strict: "ignore", maxExpand: 1000 });

export function latexDocument(source: string, createdAt: string): Root {
  const tree = getParser({
    macros: {
      title: { signature: "o m" },
      author: { signature: "o m" },
      toprule: { signature: "o" },
      midrule: { signature: "o" },
      bottomrule: { signature: "o" },
      cmidrule: { signature: "o d() m" },
    },
  }).parse(source);
  prepareReferences(tree);
  const metadata = new Map<string, Node[]>();
  for (const node of tree.content) {
    if (node.type === "macro" && ["title", "author", "date"].includes(node.content)) {
      metadata.set(node.content, structuredClone(argument(node)));
    }
  }
  const timestamp = new Date(createdAt);
  const date = Number.isNaN(timestamp.getTime())
    ? ""
    : timestamp.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  // Insert metadata before conversion so author line breaks, inline formatting and date macros are processed too.
  const insertTitle = (nodes: Node[]) => {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (node.type === "macro" && node.content === "today") {
        nodes[index] = text(date);
      } else if (node.type === "macro" && node.content === "maketitle") {
        nodes[index] = htmlLike({
          tag: "div",
          attributes: { className: "document-title" },
          content: [
            ...(metadata.has("title") ? [htmlLike({ tag: "h1", content: metadata.get("title") })] : []),
            ...(metadata.has("author") ? [htmlLike({ tag: "p", content: metadata.get("author") })] : []),
            ...(metadata.has("date") ? [htmlLike({ tag: "p", content: metadata.get("date") })] : []),
          ],
        });
      }
      children(nodes[index]).forEach(insertTitle);
    }
  };
  insertTitle(tree.content);
  // Each document gets a fresh converter because unified processors freeze after their first run.
  const converter = getParser()().use(unifiedLatexToHast, {
    macroReplacements: {
      section: (node) => htmlLike({ tag: "h2", content: argument(node) }),
      subsection: (node) => htmlLike({ tag: "h3", content: argument(node) }),
      subsubsection: (node) => htmlLike({ tag: "h4", content: argument(node) }),
      caption: (node) => htmlLike({ tag: "figcaption", content: argument(node) }),
      includegraphics: (node) => text(`[Image: ${printRaw(argument(node))}. See original file.]`),
      input: () => text("[Included file: see original document.]"),
      include: () => text("[Included file: see original document.]"),
    },
    environmentReplacements: {
      abstract: (node) =>
        htmlLike({
          tag: "div",
          attributes: { className: "abstract" },
          content: [htmlLike({ tag: "h2", content: text("Abstract") }), ...node.content],
        }),
      table: (node) => htmlLike({ tag: "figure", content: node.content }),
      figure: (node) => htmlLike({ tag: "figure", content: node.content }),
    },
  });
  // The LaTeX plugin uses unified v10, whose processor types retain the input AST.
  // Validate its HTML output before passing it to the unified v11 rehype pipeline.
  const html: unknown = converter.runSync(tree);
  if (!isHtmlRoot(html)) throw new Error("LaTeX conversion did not produce an HTML document.");
  return htmlProcessor.runSync(html);
}
