import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { PaperSurface } from "./paper-surface";

/** One reading of a published design document, so the page and the hand-off reader look alike. */
export function DesignMarkdown({ source }: { source: string }) {
  return (
    <PaperSurface>
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h4 className="mb-4 border-b pb-3 font-(family-name:--font-lora) text-xl">{children}</h4>
          ),
          h2: ({ children }) => (
            <h5 className="mt-5 mb-2 border-t border-dashed pt-3 font-sans font-semibold text-sm">{children}</h5>
          ),
          h3: ({ children }) => <h5 className="mt-4 mb-2 font-sans font-semibold text-sm">{children}</h5>,
          h4: ({ children }) => <h6 className="mt-4 font-sans font-semibold text-xs">{children}</h6>,
          p: ({ children }) => <p className="my-2 break-words">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {source}
      </Markdown>
    </PaperSurface>
  );
}
