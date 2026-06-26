import { WorkLogDetailView } from "@/components/WorkLogDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LogDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <WorkLogDetailView workLogId={id} />;
}
