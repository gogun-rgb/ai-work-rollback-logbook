import { NextResponse } from "next/server";

import { UserFacingError, toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const workLog = await prisma.workLog.findUnique({
      where: { id },
      include: {
        project: true,
        fileChanges: {
          orderBy: { filePath: "asc" }
        }
      }
    });

    if (!workLog) {
      throw new UserFacingError("작업 기록을 찾을 수 없습니다.", 404);
    }

    return NextResponse.json({ workLog });
  } catch (error) {
    return toErrorResponse(error);
  }
}
