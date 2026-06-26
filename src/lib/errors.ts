import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class UserFacingError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
    this.details = details;
  }
}

export function logInternalError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof UserFacingError) {
    logInternalError(error.details ?? error);
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "입력값을 확인해주세요.", issues: error.flatten() },
      { status: 400 }
    );
  }

  logInternalError(error);
  return NextResponse.json(
    { error: "요청을 처리하는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요." },
    { status: 500 }
  );
}
