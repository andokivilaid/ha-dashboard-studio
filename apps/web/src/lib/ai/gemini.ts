import { GoogleGenAI } from "@google/genai";
import { CRITIC_SYSTEM, GENERATOR_SYSTEM } from "./prompts";
import {
  DEFAULT_MODELS,
  extractYaml,
  stripYaml,
  type AiResponse,
  type ChatTurn,
} from "./types";

export async function geminiGenerate(opts: {
  apiKey: string;
  model?: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<AiResponse> {
  const model = opts.model || DEFAULT_MODELS.gemini.generate;
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const result = await ai.models.generateContent({
    model,
    config: { systemInstruction: GENERATOR_SYSTEM, maxOutputTokens: 32000, temperature: 0.4 },
    contents: [
      ...opts.history.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      })),
      { role: "user", parts: [{ text: opts.userMessage }] },
    ],
  });
  const text = result.text ?? "";
  return {
    text: stripYaml(text),
    yaml: extractYaml(text),
    model,
    usage: {
      input: result.usageMetadata?.promptTokenCount,
      output: result.usageMetadata?.candidatesTokenCount,
    },
  };
}

export async function geminiCritique(opts: {
  apiKey: string;
  model?: string;
  image: string;
  yaml: string;
  intent?: string;
}): Promise<AiResponse> {
  const model = opts.model || DEFAULT_MODELS.gemini.vision;
  const match = opts.image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new Error("Screenshot must be a base64 PNG/JPEG/WebP data URL.");
  const [, mimeType, data] = match;

  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const result = await ai.models.generateContent({
    model,
    config: { systemInstruction: CRITIC_SYSTEM, maxOutputTokens: 32000, temperature: 0.3 },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data } },
          {
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
  const text = result.text ?? "";
  return { text: stripYaml(text), yaml: extractYaml(text), model };
}
