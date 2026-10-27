import { agentMarkdown, MARKDOWN_CONTENT_TYPE } from "@/lib/agents/agent-markdown";

// Read at request time, so the links use this deployment's SITE_URL.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(agentMarkdown(), { headers: { "Content-Type": MARKDOWN_CONTENT_TYPE } });
}
