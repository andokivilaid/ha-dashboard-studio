import { NextResponse } from "next/server";
import { providerErrorResponse } from "@/lib/ai/errors";
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
  availableCards: z.string().max(20_000).optional(),
  /** Rule violations found in the previous attempt, for a correction turn. */
  lint: z.string().max(20_000).optional(),
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
    availableCards: parsed.availableCards,
    lint: parsed.lint,
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
    return providerErrorResponse(err);
  }
}
