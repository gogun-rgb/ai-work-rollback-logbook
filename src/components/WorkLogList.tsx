"use client";

import { BookOpen, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Project, WorkLogSummary } from "@/components/types";
import { ErrorMessage, FieldLabel, Panel, SectionHeader, StatusBadge } from "@/components/ui";

export function WorkLogList() {
  const [workLogs, setWorkLogs] = useState<WorkLogSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState({ aiTool: "", result: "", projectId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects/recent", { cache: "no-store" });
      const data = await response.json();
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadWorkLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/worklogs${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "로그북 목록을 불러오지 못했습니다.");
      setWorkLogs(data.workLogs ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "로그북 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadWorkLogs();
  }, [loadWorkLogs]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="로그북"
        description="AI 작업 이후 무엇을 유지했고 무엇을 되돌리려 했는지 과거 기록을 확인합니다."
      />
      <ErrorMessage message={error} />

      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <h3 className="text-base font-bold text-slate-950">필터</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FieldLabel label="AI 도구">
            <select
              value={filters.aiTool}
              onChange={(event) => setFilters((current) => ({ ...current, aiTool: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              <option>Codex</option>
              <option>Claude Code</option>
              <option>OpenCode</option>
              <option>기타</option>
            </select>
          </FieldLabel>
          <FieldLabel label="작업 결과">
            <select
              value={filters.result}
              onChange={(event) => setFilters((current) => ({ ...current, result: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              <option>성공</option>
              <option>부분 성공</option>
              <option>실패</option>
              <option>아직 확인하지 않음</option>
            </select>
          </FieldLabel>
          <FieldLabel label="프로젝트">
            <select
              value={filters.projectId}
              onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-950">작업 기록</h3>
          <button
            type="button"
            onClick={loadWorkLogs}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
        {loading ? <p className="text-sm text-slate-500">불러오는 중입니다.</p> : null}
        {!loading && workLogs.length === 0 ? (
          <p className="text-sm text-slate-500">아직 저장된 작업 기록이 없습니다.</p>
        ) : null}
        <div className="space-y-3">
          {workLogs.map((workLog) => (
            <Link
              key={workLog.id}
              href={`/logs/${workLog.id}`}
              className="block rounded-md border border-slate-200 p-4 hover:border-slate-400"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{workLog.title}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{workLog.project.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(workLog.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="blue">{workLog.aiTool}</StatusBadge>
                  <StatusBadge>{workLog.result}</StatusBadge>
                  <StatusBadge>파일 {workLog.counts.total}</StatusBadge>
                  <StatusBadge tone="green">유지 {workLog.counts.keep}</StatusBadge>
                  <StatusBadge tone="orange">예정 {workLog.counts.restorePlanned}</StatusBadge>
                  <StatusBadge tone="red">복원 {workLog.counts.restored}</StatusBadge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
