export type ProviderId = "anthropic" | "gemini";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  provider: ProviderId;
  apiKey: string;
  model?: string;
  request: string;
  history: ChatTurn[];
  inventory: string;
  areas: string;
  currentYaml?: string | null;
}

export interface CritiqueRequest {
  provider: ProviderId;
  apiKey: string;
  model?: string;
  /** PNG data URL of the rendered dashboard. */
  image: string;
  yaml: string;
  intent?: string;
}

export interface AiResponse {
  text: string;
  yaml: string | null;
  model: string;
  usage?: { input?: number; output?: number };
}

export const DEFAULT_MODELS: Record<ProviderId, { generate: string; vision: string }> = {
  // Claude Opus 5.5 is the current Opus and handles both jobs.
  anthropic: { generate: "claude-opus-5-5", vision: "claude-opus-5-5" },
  gemini: { generate: "gemini-3.8-flash", vision: "gemini-3.8-flash" },
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
};

export const PROVIDER_KEY_HELP: Record<ProviderId, { url: string; prefix: string }> = {
  anthropic: { url: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-" },
  gemini: { url: "https://aistudio.google.com/apikey", prefix: "AIza" },
};

/** Pulls the last fenced yaml block out of a model reply. */
export function extractYaml(text: string): string | null {
  const fences = [...text.matchAll(/```(?:ya?ml)?\s*\n([\s\S]*?)```/g)];
  if (!fences.length) return null;
  const last = fences[fences.length - 1][1].trim();
  return last.length ? last : null;
}

/** Everything outside the fenced blocks, i.e. the model's prose. */
export function stripYaml(text: string): string {
  return text
    .replace(/```(?:ya?ml)?\s*\n[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
