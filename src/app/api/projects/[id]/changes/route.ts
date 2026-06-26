import { NextResponse } from "next/server";

import { scanGitChanges } from "@/lib/git";
import { UserFacingError, toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new UserFacingError("프로젝트 기록을 찾을 수 없습니다.", 404);
    }

    const scan = await scanGitChanges(project.path);
    await prisma.project.update({
      where: { id },
      data: {
        branch: scan.branch,
        lastScannedAt: new Date()
      }
    });

    return NextResponse.json({ scan });
  } catch (error) {
    return toErrorResponse(error);
  }
}
