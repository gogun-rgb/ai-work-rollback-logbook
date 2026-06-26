import { NextResponse } from "next/server";

import {
  assertUsableProjectPath,
  getCurrentBranch,
  projectNameFromPath,
  scanGitChanges
} from "@/lib/git";
import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { projectPathSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = projectPathSchema.parse(await request.json());
    const projectPath = await assertUsableProjectPath(body.path);
    const branch = await getCurrentBranch(projectPath);
    const now = new Date();

    const project = await prisma.project.upsert({
      where: { path: projectPath },
      update: {
        name: projectNameFromPath(projectPath),
        branch,
        lastScannedAt: now
      },
      create: {
        name: projectNameFromPath(projectPath),
        path: projectPath,
        branch,
        lastScannedAt: now
      }
    });
    const scan = await scanGitChanges(projectPath);

    return NextResponse.json({ project, scan });
  } catch (error) {
    return toErrorResponse(error);
  }
}
