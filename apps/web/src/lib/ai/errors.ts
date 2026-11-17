import { NextResponse } from "next/server";

/** Key-shaped text must never be echoed back, not even inside a provider error. */
export function redactKeys(message: string): string {
  return message
    .replace(/(sk-ant-[\w-]{6})[\w-]+/g, "$1…")
    .replace(/(AIza[\w-]{4})[\w-]+/g, "$1…")
    .replace(/\b(sk-[\w-]{6})[\w-]{8,}/g, "$1…");
}

const AUTH_PATTERNS =
  /invalid[ _-]?x?[ _-]?api[ _-]?key|authentication_error|unauthorized|unauthenticated|permission[ _-]?denied|api[ _-]?key not valid|invalid_api_key|401/i;

/** Distinguishes "your key is wrong" from "the provider broke". */
export function statusForProviderError(message: string): number {
  return AUTH_PATTERNS.test(message) ? 401 : 502;
}

export function providerErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    { error: redactKeys(message) },
    { status: statusForProviderError(message) },
  );
}
