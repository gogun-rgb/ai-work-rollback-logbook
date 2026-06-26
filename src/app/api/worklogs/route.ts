import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { workLogCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aiTool = searchParams.get("aiTool") || undefined;
    const result = searchParams.get("result") || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const workLogs = await prisma.workLog.findMany({
      where: {
        ...(aiTool ? { aiTool } : {}),
        ...(result ? { result } : {}),
        ...(projectId ? { projectId } : {})
      },
      include: {
        project: true,
        fileChanges: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      workLogs: workLogs.map((workLog) => ({
        ...workLog,
        counts: countFileChanges(workLog.fileChanges)
      }))
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = workLogCreateSchema.parse(await request.json());

    const workLog = await prisma.workLog.create({
      data: {
        projectId: body.projectId,
        title: body.title,
        aiTool: body.aiTool,
        prompt: body.prompt,
        result: body.result,
        failureCause: emptyToNull(body.failureCause),
        errorMessage: emptyToNull(body.errorMessage),
        attemptedSolution: emptyToNull(body.attemptedSolution),
        nextCheck: emptyToNull(body.nextCheck),
        lesson: emptyToNull(body.lesson),
        nextTaskChecklist: emptyToNull(body.nextTaskChecklist),
        fileChanges: {
          create: body.fileDecisions.map((file) => ({
            filePath: file.filePath,
            gitStatus: file.gitStatus,
            additions: file.additions,
            deletions: file.deletions,
            decision: file.decision,
            statusSignature: file.statusSignature
          }))
        }
      },
      include: {
        project: true,
        fileChanges: true
      }
    });

    return NextResponse.json({ workLog }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function countFileChanges(
  fileChanges: Array<{ decision: string; restoreStatus: string | null }>
) {
  return {
    total: fileChanges.length,
    keep: fileChanges.filter((file) => file.decision === "KEEP").length,
    restorePlanned: fileChanges.filter((file) => file.decision === "RESTORE").length,
    restored: fileChanges.filter((file) => file.restoreStatus === "RESTORED").length
  };
}
