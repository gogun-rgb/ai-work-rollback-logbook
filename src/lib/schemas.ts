import { z } from "zod";

export const projectPathSchema = z.object({
  path: z.string().trim().min(1, "프로젝트 폴더 경로를 입력해주세요.")
});

export const projectIdSchema = z.object({
  id: z.string().min(1)
});

export const diffRequestSchema = z.object({
  filePath: z.string().min(1),
  gitStatus: z.string().min(1)
});

export const fileDecisionSchema = z.object({
  filePath: z.string().min(1),
  gitStatus: z.string().min(1),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
  decision: z.enum(["KEEP", "RESTORE", "UNDECIDED"]),
  statusSignature: z.string().min(1).optional()
});

export const workLogCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "작업 제목을 입력해주세요."),
  aiTool: z.enum(["Codex", "Claude Code", "OpenCode", "기타"]),
  prompt: z.string().trim().min(1, "AI에게 입력한 작업 요청을 적어주세요."),
  result: z.enum(["성공", "부분 성공", "실패", "아직 확인하지 않음"]),
  failureCause: z.string().trim().optional(),
  errorMessage: z.string().trim().optional(),
  attemptedSolution: z.string().trim().optional(),
  nextCheck: z.string().trim().optional(),
  lesson: z.string().trim().optional(),
  nextTaskChecklist: z.string().trim().optional(),
  fileDecisions: z.array(fileDecisionSchema).min(1, "저장할 파일 변경 내역이 없습니다.")
});

export const restoreRequestSchema = z.object({
  projectId: z.string().min(1),
  workLogId: z.string().min(1).optional(),
  checklist: z.object({
    backedUp: z.boolean(),
    reviewed: z.boolean(),
    keepChecked: z.boolean(),
    knowsTests: z.boolean(),
    understandsLoss: z.boolean()
  }),
  files: z
    .array(
      z.object({
        filePath: z.string().min(1),
        gitStatus: z.string().min(1),
        statusSignature: z.string().min(1)
      })
    )
    .min(1, "되돌릴 파일을 하나 이상 선택해주세요.")
});
