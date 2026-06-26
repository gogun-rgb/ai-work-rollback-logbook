import { ProjectWorkspace } from "@/components/ProjectWorkspace";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  return <ProjectWorkspace projectId={id} />;
}
