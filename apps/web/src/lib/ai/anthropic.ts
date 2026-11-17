import Anthropic from "@anthropic-ai/sdk";
import { CRITIC_SYSTEM, GENERATOR_SYSTEM } from "./prompts";
import {
  DEFAULT_MODELS,
  extractYaml,
  stripYaml,
  type AiResponse,
  type ChatTurn,
} from "./types";

function client(apiKey: string) {
  return new Anthropic({ apiKey, maxRetries: 2 });
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function anthropicGenerate(opts: {
  apiKey: string;
  model?: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<AiResponse> {
  const model = opts.model || DEFAULT_MODELS.anthropic.generate;
  // Streaming: 128K-capable models need it for large max_tokens, and a
  // dashboard rewrite routinely runs long.
  const stream = client(opts.apiKey).messages.stream({
    model,
    max_tokens: 32000,
    system: [{ type: "text", text: GENERATOR_SYSTEM, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    messages: [
      ...opts.history.map((t) => ({ role: t.role, content: t.content })),
      { role: "user" as const, content: opts.userMessage },
    ],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error(
      `Claude declined this request (${message.stop_details?.category ?? "unspecified"}).`,
    );
  }
  const text = textOf(message);
  return {
    text: stripYaml(text),
    yaml: extractYaml(text),
    model,
    usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}

export async function anthropicCritique(opts: {
  apiKey: string;
  model?: string;
  image: string;
  yaml: string;
  intent?: string;
}): Promise<AiResponse> {
  const model = opts.model || DEFAULT_MODELS.anthropic.vision;
  const match = opts.image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new Error("Screenshot must be a base64 PNG/JPEG/WebP data URL.");
  const [, mediaType, data] = match;

  const stream = client(opts.apiKey).messages.stream({
    model,
    max_tokens: 32000,
    system: CRITIC_SYSTEM,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/png", data },
          },
          {
            type: "text",
            text: [
              opts.intent ? `The user asked for: ${opts.intent}` : "",
              "YAML that produced this render:",
              "```yaml",
              opts.yaml,
              "```",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined to review this screenshot.");
  }
  const text = textOf(message);
  return {
    text: stripYaml(text),
    yaml: extractYaml(text),
    model,
    usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}
