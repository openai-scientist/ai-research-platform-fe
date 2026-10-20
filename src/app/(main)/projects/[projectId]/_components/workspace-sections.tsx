/** The project pages reached by `/projects/[projectId]/[section]`, with the heading each one opens with. */
export const WORKSPACE_SECTIONS: Record<string, { title: string; description: string; managerOnly?: boolean }> = {
  connections: {
    title: "Data Connections",
    description: "Connect the places your research data lives, then import the tables and sheets you need.",
  },
  datasets: {
    title: "Datasets",
    description:
      "Upload files or import from your data connections. Each dataset keeps its versions for research runs.",
  },
  files: {
    title: "Documents",
    description: "Share PDF, CSV, and Excel reference documents with this project.",
  },
  experiments: {
    title: "Research flow",
    description: "Start a research run from a topic and follow it stage by stage, up to the hypotheses.",
  },
  members: {
    title: "Members",
    description: "See who has access to this workspace and what role they play.",
  },
  settings: {
    title: "Settings",
    description: "Manage the project, how its research runs, what it spends, and what it tells you.",
    managerOnly: true,
  },
};

export function SectionHeader({ section }: { section: string }) {
  const config = WORKSPACE_SECTIONS[section];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="font-heading text-3xl tracking-tight">{config.title}</h1>
      <p className="max-w-3xl text-muted-foreground text-sm">{config.description}</p>
    </div>
  );
}
