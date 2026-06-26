import { NextResponse } from "next/server";

import { restoreSelectedFiles, scanGitChanges, type GitChangeStatus } from "@/lib/git";
import { UserFacingError, toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { restoreRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = restoreRequestSchema.parse(await request.json());
    const checklistValues = Object.values(body.checklist);

    if (!checklistValues.every(Boolean)) {
      throw new UserFacingError("되돌리기 전 체크리스트를 모두 확인해야 합니다.", 400);
    }

    const project = await prisma.project.findUnique({ where: { id: body.projectId } });

    if (!project) {
      throw new UserFacingError("프로젝트 기록을 찾을 수 없습니다.", 404);
    }

    const results = await restoreSelectedFiles(
      project.path,
      body.files.map((file) => ({
        ...file,
        gitStatus: file.gitStatus as GitChangeStatus
      }))
    );

    if (body.workLogId) {
      await Promise.all(
        results.map((result) =>
          prisma.fileChange.updateMany({
            where: {
              workLogId: body.workLogId,
              filePath: result.filePath
            },
            data: {
              restoreStatus: result.success ? "RESTORED" : result.skipped ? "SKIPPED" : "FAILED",
              restoreError: result.success ? null : result.message,
              restoredAt: result.success ? new Date() : null
            }
          })
        )
      );
    }

    const scan = await scanGitChanges(project.path);
    await prisma.project.update({
      where: { id: project.id },
      data: {
        branch: scan.branch,
        lastScannedAt: new Date()
      }
    });

    return NextResponse.json({ results, scan });
  } catch (error) {
    return toErrorResponse(error);
  }
}
