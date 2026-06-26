"use client";

import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FileChangeRecord, WorkLogDetail } from "@/components/types";
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

export function WorkLogDetailView({ workLogId }: { workLogId: string }) {
  const [workLog, setWorkLog] = useState<WorkLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(emptyChecklist);

  const restoreTargets = useMemo(
    () =>
      workLog?.fileChanges.filter(
        (file) =>
          file.decision === "RESTORE" && file.restoreStatus !== "RESTORED" && Boolean(file.statusSignature)
      ) ?? [],
    [workLog]
  );
  const checklistComplete = Object.values(checklist).every(Boolean);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/worklogs/${workLogId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "작업 기록을 불러오지 못했습니다.");
      setWorkLog(data.workLog);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "작업 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [workLogId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function restoreFromLog() {
    if (!workLog) return;
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: workLog.projectId,
          workLogId: workLog.id,
          checklist,
          files: restoreTargets.map((file) => ({
            filePath: file.filePath,
            gitStatus: file.gitStatus,
            statusSignature: file.statusSignature ?? ""
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "파일을 되돌리지 못했습니다.");
      setMessage(data.results.map((result: { filePath: string; message: string }) => `${result.filePath}: ${result.message}`).join("\n"));
      setChecklist(emptyChecklist);
      await loadDetail();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "파일을 되돌리지 못했습니다.");
    } finally {
      setRestoring(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-600">작업 기록을 불러오는 중입니다.</p>;
  if (!workLog) return <ErrorMessage message={error ?? "작업 기록을 표시할 수 없습니다."} />;

  return (
    <div className="space-y-5">
      <SectionHeader title={workLog.title} description={`${workLog.project.name}에 저장된 작업 기록입니다.`} />
      <ErrorMessage message={error} />
      <InfoMessage message={message} />

      <Panel>
        <div className="grid gap-4 lg:grid-cols-4">
          <Summary label="AI 도구" value={workLog.aiTool} />
          <Summary label="작업 결과" value={workLog.result} />
          <Summary label="프로젝트" value={workLog.project.name} />
          <Summary label="작성 날짜" value={formatDate(workLog.createdAt)} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <MemoBlock title="AI에게 입력한 작업 요청" value={workLog.prompt} />
          <MemoBlock title="실패 원인" value={workLog.failureCause} />
          <MemoBlock title="오류 메시지" value={workLog.errorMessage} />
          <MemoBlock title="시도한 해결 방법" value={workLog.attemptedSolution} />
          <MemoBlock title="다음에 확인할 내용" value={workLog.nextCheck} />
          <MemoBlock title="이번 작업에서 배운 점" value={workLog.lesson} />
          <MemoBlock title="다음 AI 작업 전 확인 사항" value={workLog.nextTaskChecklist} />
        </div>
      </Panel>

      <Panel>
        <h3 className="mb-4 text-base font-bold text-slate-950">저장 당시 파일 상태</h3>
        <div className="space-y-3">
          {workLog.fileChanges.map((file) => (
            <FileChangeRow key={file.id} file={file} />
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h3 className="text-base font-bold text-slate-950">이 기록에서 되돌리기</h3>
        </div>
        {restoreTargets.length === 0 ? (
          <p className="text-sm text-slate-500">되돌릴 수 있는 예정 파일이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            <p className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              저장 후 파일이 다시 바뀌었다면 되돌리기가 중단됩니다.
            </p>
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
              onClick={restoreFromLog}
              disabled={!checklistComplete || restoring}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              이 기록의 선택 파일 되돌리기
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MemoBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {value}
      </p>
    </div>
  );
}

function FileChangeRow({ file }: { file: FileChangeRecord }) {
  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-slate-950">{file.filePath}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(file.gitStatus)}>{fileStatusLabel(file.gitStatus)}</StatusBadge>
            <StatusBadge tone={decisionTone(file.decision)}>{decisionLabel(file.decision)}</StatusBadge>
            <StatusBadge tone="green">+{file.additions}</StatusBadge>
            <StatusBadge tone="red">-{file.deletions}</StatusBadge>
            {file.restoreStatus ? <StatusBadge tone={file.restoreStatus === "RESTORED" ? "green" : "orange"}>{file.restoreStatus}</StatusBadge> : null}
          </div>
          {file.restoreError ? <p className="mt-2 text-sm text-red-700">{file.restoreError}</p> : null}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
