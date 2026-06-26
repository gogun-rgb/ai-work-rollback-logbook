"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  BookPlus,
  Eye,
  FileCode2,
  RefreshCw,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChangeDecision, DiffResult, GitChange, GitScan, Project } from "@/components/types";
import {
  ErrorMessage,
  InfoMessage,
  Panel,
  SectionHeader,
  StatusBadge,
  decisionLabel,
  decisionTone,
  fileStatusLabel,
  statusTone
} from "@/components/ui";

type ProjectResponse = {
  project: Project;
  scan: GitScan;
};

const checklistItems = [
  ["backedUp", "중요한 파일을 백업했나요?"],
  ["reviewed", "현재 변경 내용을 직접 확인했나요?"],
  ["keepChecked", "유지할 파일을 잘못 선택하지 않았나요?"],
  ["knowsTests", "되돌리기 후 실행해야 할 테스트를 알고 있나요?"],
  ["understandsLoss", "Git 커밋되지 않은 변경이 사라질 수 있다는 점을 이해했나요?"]
] as const;

type ChecklistKey = (typeof checklistItems)[number][0];

const emptyChecklist: Record<ChecklistKey, boolean> = {
  backedUp: false,
  reviewed: false,
  keepChecked: false,
  knowsTests: false,
  understandsLoss: false
};

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [scan, setScan] = useState<GitScan | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>({});
  const [selectedDiff, setSelectedDiff] = useState<DiffResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(emptyChecklist);

  const changes = useMemo(() => {
    return (
      scan?.changes.map((change) => ({
        ...change,
        decision: decisions[change.filePath] ?? change.decision
      })) ?? []
    );
  }, [decisions, scan]);

  const restoreTargets = changes.filter((change) => change.decision === "RESTORE");
  const checklistComplete = Object.values(checklist).every(Boolean);

  const applyScan = useCallback((nextScan: GitScan) => {
    setScan(nextScan);
    setDecisions((current) => {
      const next: Record<string, ChangeDecision> = {};
      nextScan.changes.forEach((change) => {
        next[change.filePath] = current[change.filePath] ?? "UNDECIDED";
      });
      return next;
    });
  }, []);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const data = (await response.json()) as ProjectResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "프로젝트를 불러오지 못했습니다.");
      setProject(data.project);
      applyScan(data.scan);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [applyScan, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function refreshChanges() {
    setRefreshing(true);
    setError(null);
    setRestoreMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/changes`, { cache: "no-store" });
      const data = (await response.json()) as { scan?: GitScan; error?: string };
      if (!response.ok || !data.scan) throw new Error(data.error ?? "변경 사항을 새로고침하지 못했습니다.");
      applyScan(data.scan);
      setSelectedDiff(null);
      setSelectedPath(null);
      setChecklist(emptyChecklist);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "변경 사항을 새로고침하지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  function setDecision(filePath: string, decision: ChangeDecision) {
    setDecisions((current) => ({ ...current, [filePath]: decision }));
    setRestoreMessage(null);
  }

  async function showDiff(change: GitChange) {
    setDiffLoading(true);
    setError(null);
    setSelectedPath(change.filePath);
    try {
      const response = await fetch(`/api/projects/${projectId}/diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: change.filePath, gitStatus: change.gitStatus })
      });
      const data = (await response.json()) as { diff?: DiffResult; error?: string };
      if (!response.ok || !data.diff) throw new Error(data.error ?? "변경 내용을 불러오지 못했습니다.");
      setSelectedDiff(data.diff);
    } catch (diffError) {
      setError(diffError instanceof Error ? diffError.message : "변경 내용을 불러오지 못했습니다.");
    } finally {
      setDiffLoading(false);
    }
  }

  async function restoreFiles() {
    setRestoring(true);
    setError(null);
    setRestoreMessage(null);
    try {
      const response = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          checklist,
          files: restoreTargets.map((change) => ({
            filePath: change.filePath,
            gitStatus: change.gitStatus,
            statusSignature: change.statusSignature
          }))
        })
      });
      const data = (await response.json()) as {
        results?: Array<{ filePath: string; success: boolean; skipped: boolean; message: string }>;
        scan?: GitScan;
        error?: string;
      };
      if (!response.ok || !data.results || !data.scan) {
        throw new Error(data.error ?? "파일을 되돌리지 못했습니다.");
      }

      applyScan(data.scan);
      setChecklist(emptyChecklist);
      setRestoreMessage(
        data.results
          .map((result) => `${result.filePath}: ${result.message}`)
          .join("\n")
      );
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "파일을 되돌리지 못했습니다.");
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">프로젝트 정보를 확인하는 중입니다.</p>;
  }

  if (!project || !scan) {
    return <ErrorMessage message={error ?? "프로젝트를 표시할 수 없습니다."} />;
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title={project.name}
        description="현재 Git 변경 사항을 파일별로 확인하고, 유지하거나 되돌릴 파일을 먼저 분류하세요."
      />

      <ErrorMessage message={error} />
      <InfoMessage message={restoreMessage} />

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="break-all text-sm text-slate-600">{project.path}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <StatusBadge tone="blue">브랜치 {scan.branch}</StatusBadge>
              <StatusBadge>마지막 점검 {formatDate(project.lastScannedAt)}</StatusBadge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshChanges}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <RefreshCw className={clsx("h-4 w-4", refreshing && "animate-spin")} />
              변경 사항 새로고침
            </button>
            {changes.length > 0 ? (
              <Link
                href={`/logs/new?projectId=${project.id}`}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                <BookPlus className="h-4 w-4" />
                작업 기록 만들기
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-md bg-slate-300 px-3 py-2 text-sm font-semibold text-white"
                title="변경 파일이 있을 때 작업 기록을 만들 수 있습니다."
              >
                <BookPlus className="h-4 w-4" />
                작업 기록 만들기
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="전체 변경" value={scan.summary.total} />
          <Stat label="새 파일" value={scan.summary.added + scan.summary.untracked} />
          <Stat label="수정됨" value={scan.summary.modified} />
          <Stat label="삭제됨" value={scan.summary.deleted} />
          <Stat label="이름 변경" value={scan.summary.renamed} />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-950">변경 파일 목록</h3>
            <span className="text-sm text-slate-500">{changes.length}개 파일</span>
          </div>

          {changes.length === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              현재 Git 변경 사항이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => (
                <article key={change.filePath} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-slate-950">{change.filePath}</p>
                      {change.oldPath ? (
                        <p className="mt-1 break-all text-xs text-slate-500">이전 이름: {change.oldPath}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={statusTone(change.gitStatus)}>
                          {fileStatusLabel(change.gitStatus)}
                        </StatusBadge>
                        <StatusBadge tone={decisionTone(change.decision)}>
                          {decisionLabel(change.decision)}
                        </StatusBadge>
                        <StatusBadge tone="green">+{change.additions}</StatusBadge>
                        <StatusBadge tone="red">-{change.deletions}</StatusBadge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => showDiff(change)}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        변경 내용 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision(change.filePath, "KEEP")}
                        className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
                      >
                        유지
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision(change.filePath, "RESTORE")}
                        className="rounded-md border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50"
                      >
                        되돌리기 예정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision(change.filePath, "UNDECIDED")}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        미결정
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-bold text-slate-950">변경 내용</h3>
            </div>
            {diffLoading ? <p className="text-sm text-slate-500">diff를 불러오는 중입니다.</p> : null}
            {!diffLoading && !selectedDiff ? (
              <p className="text-sm text-slate-500">왼쪽 목록에서 파일의 “변경 내용 보기”를 누르세요.</p>
            ) : null}
            {selectedDiff ? <DiffViewer diff={selectedDiff} selectedPath={selectedPath} /> : null}
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              <h3 className="text-base font-bold text-slate-950">되돌리기 체크리스트</h3>
            </div>
            {restoreTargets.length === 0 ? (
              <p className="text-sm text-slate-500">되돌리기 예정으로 선택한 파일이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <p className="font-semibold">되돌리기 예정 파일 {restoreTargets.length}개</p>
                  <p className="mt-1">추적되지 않은 새 파일은 자동 삭제하지 않습니다.</p>
                </div>
                <div className="space-y-2">
                  {checklistItems.map(([key, label]) => (
                    <label key={key} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={checklist[key]}
                        onChange={(event) =>
                          setChecklist((current) => ({ ...current, [key]: event.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={restoreFiles}
                  disabled={!checklistComplete || restoring}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  선택한 파일 되돌리기
                </button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function DiffViewer({ diff, selectedPath }: { diff: DiffResult; selectedPath: string | null }) {
  if (diff.type === "binary" || diff.type === "empty") {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-950">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          {selectedPath}
        </div>
        {diff.message}
      </div>
    );
  }

  const lines = diff.content.split("\n");

  return (
    <div>
      <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <p className="break-all font-semibold text-slate-900">{selectedPath}</p>
        {diff.message ? <p className="mt-1">{diff.message}</p> : null}
      </div>
      <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`} className={diffLineClass(line)}>
            {line || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

function diffLineClass(line: string) {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "diff-line bg-green-50 text-green-900";
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return "diff-line bg-red-50 text-red-900";
  }
  if (line.startsWith("@@")) {
    return "diff-line bg-blue-50 text-blue-900";
  }
  return "diff-line text-slate-700";
}

function formatDate(value?: string | null) {
  if (!value) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
