import { NextResponse } from "next/server";
import { providerErrorResponse } from "@/lib/ai/errors";
import { z } from "zod";
import { anthropicCritique } from "@/lib/ai/anthropic";
import { geminiCritique } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  provider: z.enum(["anthropic", "gemini"]),
  apiKey: z.string().min(10),
  model: z.string().optional(),
  image: z.string().startsWith("data:image/").max(12_000_000),
  yaml: z.string().max(400_000),
  intent: z.string().max(4000).optional(),
});

/** Visual self-check: the model looks at a render of its own YAML. */
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

  try {
    const result =
      parsed.provider === "anthropic"
        ? await anthropicCritique(parsed)
        : await geminiCritique(parsed);
    return NextResponse.json(result);
  } catch (err) {
    return providerErrorResponse(err);
  }
}
