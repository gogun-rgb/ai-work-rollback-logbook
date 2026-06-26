"use client";

import { Save, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { ChangeDecision, GitChange, GitScan, Project } from "@/components/types";
import {
  ErrorMessage,
  FieldLabel,
  Panel,
  SectionHeader,
  StatusBadge,
  decisionTone,
  fileStatusLabel,
  statusTone
} from "@/components/ui";

type ProjectResponse = {
  project: Project;
  scan: GitScan;
  error?: string;
};

export function WorkLogForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    aiTool: "Codex",
    prompt: "",
    result: "아직 확인하지 않음",
    failureCause: "",
    errorMessage: "",
    attemptedSolution: "",
    nextCheck: "",
    lesson: "",
    nextTaskChecklist: ""
  });

  const decisionCounts = useMemo(
    () => ({
      keep: Object.values(decisions).filter((decision) => decision === "KEEP").length,
      restore: Object.values(decisions).filter((decision) => decision === "RESTORE").length,
      undecided: Object.values(decisions).filter((decision) => decision === "UNDECIDED").length
    }),
    [decisions]
  );

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const data = (await response.json()) as ProjectResponse;
      if (!response.ok) throw new Error(data.error ?? "프로젝트 변경 사항을 불러오지 못했습니다.");
      setProject(data.project);
      setChanges(data.scan.changes);
      setDecisions(
        Object.fromEntries(data.scan.changes.map((change) => [change.filePath, "UNDECIDED" as const]))
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "프로젝트 변경 사항을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function updateForm(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setDecision(filePath: string, decision: ChangeDecision) {
    setDecisions((current) => ({ ...current, [filePath]: decision }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/worklogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...form,
          fileDecisions: changes.map((change) => ({
            filePath: change.filePath,
            gitStatus: change.gitStatus,
            additions: change.additions,
            deletions: change.deletions,
            decision: decisions[change.filePath] ?? "UNDECIDED",
            statusSignature: change.statusSignature
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "작업 기록을 저장하지 못했습니다.");
      router.push(`/logs/${data.workLog.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "작업 기록을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-600">작업 기록 화면을 준비하는 중입니다.</p>;

  if (!project) {
    return <ErrorMessage message={error ?? "프로젝트 정보를 불러올 수 없습니다."} />;
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="작업 기록 만들기"
        description={`${project.name}의 현재 변경 사항과 AI 작업 메모를 함께 저장합니다.`}
      />
      <ErrorMessage message={error} />

      {changes.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-700">현재 저장할 변경 파일이 없습니다. 프로젝트 상세 화면에서 새로고침 후 다시 시도해주세요.</p>
        </Panel>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Panel>
            <h3 className="mb-4 text-base font-bold text-slate-950">기본 정보</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <FieldLabel label="작업 제목">
                <input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </FieldLabel>
              <FieldLabel label="사용한 AI 도구">
                <select
                  value={form.aiTool}
                  onChange={(event) => updateForm("aiTool", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option>Codex</option>
                  <option>Claude Code</option>
                  <option>OpenCode</option>
                  <option>기타</option>
                </select>
              </FieldLabel>
              <FieldLabel label="작업 결과">
                <select
                  value={form.result}
                  onChange={(event) => updateForm("result", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option>성공</option>
                  <option>부분 성공</option>
                  <option>실패</option>
                  <option>아직 확인하지 않음</option>
                </select>
              </FieldLabel>
            </div>
            <div className="mt-4">
              <FieldLabel label="AI에게 입력한 작업 요청">
                <textarea
                  value={form.prompt}
                  onChange={(event) => updateForm("prompt", event.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </FieldLabel>
            </div>
          </Panel>

          <Panel>
            <h3 className="mb-4 text-base font-bold text-slate-950">실패 원인 메모</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <Textarea label="실패 원인" value={form.failureCause} onChange={(value) => updateForm("failureCause", value)} />
              <Textarea label="나타난 오류 메시지" value={form.errorMessage} onChange={(value) => updateForm("errorMessage", value)} />
              <Textarea label="시도한 해결 방법" value={form.attemptedSolution} onChange={(value) => updateForm("attemptedSolution", value)} />
              <Textarea label="다음에 확인할 내용" value={form.nextCheck} onChange={(value) => updateForm("nextCheck", value)} />
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-slate-950">파일별 결정</h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="green">유지 {decisionCounts.keep}</StatusBadge>
                <StatusBadge tone="orange">되돌리기 예정 {decisionCounts.restore}</StatusBadge>
                <StatusBadge>미결정 {decisionCounts.undecided}</StatusBadge>
              </div>
            </div>
            <div className="space-y-3">
              {changes.map((change) => {
                const decision = decisions[change.filePath] ?? "UNDECIDED";
                return (
                  <article key={change.filePath} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-slate-950">{change.filePath}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge tone={statusTone(change.gitStatus)}>
                            {fileStatusLabel(change.gitStatus)}
                          </StatusBadge>
                          <StatusBadge tone={decisionTone(decision)}>{decisionText(decision)}</StatusBadge>
                          <StatusBadge tone="green">+{change.additions}</StatusBadge>
                          <StatusBadge tone="red">-{change.deletions}</StatusBadge>
                        </div>
                      </div>
                      <select
                        value={decision}
                        onChange={(event) => setDecision(change.filePath, event.target.value as ChangeDecision)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 xl:w-44"
                      >
                        <option value="UNDECIDED">미결정</option>
                        <option value="KEEP">유지</option>
                        <option value="RESTORE">되돌리기 예정</option>
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h3 className="mb-4 text-base font-bold text-slate-950">최종 메모</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <Textarea label="이번 작업에서 배운 점" value={form.lesson} onChange={(value) => updateForm("lesson", value)} />
              <Textarea
                label="다음 AI 작업 전에 확인할 사항"
                value={form.nextTaskChecklist}
                onChange={(value) => updateForm("nextTaskChecklist", value)}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              기록 저장
            </button>
          </Panel>
        </form>
      )}
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldLabel label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
      />
    </FieldLabel>
  );
}

function decisionText(decision: ChangeDecision) {
  if (decision === "KEEP") return "유지";
  if (decision === "RESTORE") return "되돌리기 예정";
  return "미결정";
}
