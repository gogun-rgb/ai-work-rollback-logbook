import Link from "next/link";

import { WorkLogForm } from "@/components/WorkLogForm";
import { Panel, SectionHeader } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function NewLogPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;

  if (!projectId) {
    return (
      <div>
        <SectionHeader title="작업 기록 만들기" />
        <Panel>
          <p className="text-sm text-slate-700">먼저 프로젝트를 확인한 뒤 작업 기록을 만들 수 있습니다.</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            프로젝트 확인하기
          </Link>
        </Panel>
      </div>
    );
  }

  return <WorkLogForm projectId={projectId} />;
}
