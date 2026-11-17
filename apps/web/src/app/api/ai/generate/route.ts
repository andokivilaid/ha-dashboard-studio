import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropicGenerate } from "@/lib/ai/anthropic";
import { geminiGenerate } from "@/lib/ai/gemini";
import { buildGeneratorUserMessage } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  provider: z.enum(["anthropic", "gemini"]),
  apiKey: z.string().min(10),
  model: z.string().optional(),
  request: z.string().min(1).max(8000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(24)
    .default([]),
  inventory: z.string().max(200_000),
  areas: z.string().max(20_000).default(""),
  currentYaml: z.string().max(400_000).nullable().optional(),
});

/**
 * The user's API key is supplied per request and used only to make that one
 * call. It is never logged, never stored server-side, and never written to a
 * response body.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const userMessage = buildGeneratorUserMessage({
    request: parsed.request,
    inventory: parsed.inventory,
    areas: parsed.areas,
    currentYaml: parsed.currentYaml ?? null,
  });

  try {
    const result =
      parsed.provider === "anthropic"
        ? await anthropicGenerate({
            apiKey: parsed.apiKey,
            model: parsed.model,
            history: parsed.history,
            userMessage,
          })
        : await geminiGenerate({
            apiKey: parsed.apiKey,
            model: parsed.model,
            history: parsed.history,
            userMessage,
          });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /api key|unauthor|permission|invalid_api/i.test(message) ? 401 : 502;
    return NextResponse.json({ error: redact(message) }, { status });
  }
}

/** Never echo a key back, even inside a provider error string. */
function redact(message: string): string {
  return message.replace(/(sk-ant-[\w-]{6})[\w-]+/g, "$1…").replace(/(AIza[\w-]{4})[\w-]+/g, "$1…");
}
