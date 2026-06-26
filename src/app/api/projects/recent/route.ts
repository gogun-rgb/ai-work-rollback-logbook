import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return toErrorResponse(error);
  }
}
