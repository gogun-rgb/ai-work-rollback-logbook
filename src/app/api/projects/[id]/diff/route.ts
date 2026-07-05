import { NextResponse } from "next/server";

import { getFileDiff, scanGitChanges } from "@/lib/git";
import { UserFacingError, toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { diffRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = diffRequestSchema.parse(await request.json());
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new UserFacingError("프로젝트 기록을 찾을 수 없습니다.", 404);
    }

    const scan = await scanGitChanges(project.path);
    const currentChange = scan.changes.find(
      (change) => change.filePath === body.filePath && change.gitStatus === body.gitStatus
    );

    if (!currentChange) {
      throw new UserFacingError(
        "Requested file is not part of the current Git change set. Refresh the project and try again.",
        409
      );
    }

    const diff = await getFileDiff(project.path, currentChange.filePath, currentChange.gitStatus);
    return NextResponse.json({ diff });
  } catch (error) {
    return toErrorResponse(error);
  }
}
