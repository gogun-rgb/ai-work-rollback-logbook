"use client";

import { ArrowRight, CheckCircle2, FolderOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import type { Project } from "@/components/types";
import { ErrorMessage, FieldLabel, Panel, SectionHeader } from "@/components/ui";

export function HomePage() {
  const router = useRouter();
  const [path, setPath] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  async function loadRecentProjects() {
    setRecentLoading(true);
    try {
      const response = await fetch("/api/projects/recent", { cache: "no-store" });
      const data = await response.json();
      setProjects(data.projects ?? []);
    } catch {
      setError("최근 프로젝트 목록을 불러오지 못했습니다.");
    } finally {
      setRecentLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "프로젝트를 확인하지 못했습니다.");
      }

      router.push(`/projects/${data.project.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "프로젝트 확인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="AI 작업 되돌리기 로그북"
        description="Codex, Claude Code, OpenCode가 바꾼 파일을 확인하고 어떤 파일을 유지하거나 되돌릴지 안전하게 기록합니다."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Panel>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FieldLabel label="프로젝트 폴더 절대 경로">
              <input
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="예: C:\\Example\\sample-project"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </FieldLabel>
            <ErrorMessage message={error} />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              프로젝트 확인
            </button>
          </form>

          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Windows에서 경로 복사하기</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>파일 탐색기에서 프로젝트 폴더를 엽니다.</li>
              <li>주소 표시줄의 빈 곳을 클릭합니다.</li>
              <li>표시된 전체 경로를 복사해 이 입력창에 붙여넣습니다.</li>
            </ol>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-950">최근 확인한 프로젝트</h3>
            <button
              type="button"
              onClick={loadRecentProjects}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {recentLoading ? <p className="text-sm text-slate-500">불러오는 중입니다.</p> : null}
            {!recentLoading && projects.length === 0 ? (
              <p className="text-sm text-slate-500">아직 확인한 프로젝트가 없습니다.</p>
            ) : null}
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-md border border-slate-200 p-3 hover:border-slate-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">{project.path}</p>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
