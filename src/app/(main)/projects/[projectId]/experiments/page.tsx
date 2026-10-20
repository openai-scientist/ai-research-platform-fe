import ProjectSectionPage from "../[section]/page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectSectionPage params={Promise.resolve({ projectId, section: "experiments" })} />;
}
