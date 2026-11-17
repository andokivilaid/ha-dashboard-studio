import { describe, expect, it } from "vitest";
import { redactKeys, statusForProviderError } from "@/lib/ai/errors";

describe("redactKeys", () => {
  it("truncates an Anthropic key to its prefix", () => {
    const out = redactKeys("bad key sk-ant-api03-SECRETSECRETSECRET end");
    expect(out).toContain("sk-ant-");
    expect(out).toContain("…");
    expect(out).not.toContain("SECRET");
  });

  it("never leaves a full key in the message", () => {
    for (const key of [
      "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789",
      "AIzaSyA1b2C3d4E5f6G7h8I9j0KLMNOPQRSTUV",
      "sk-proj-abcdefghijklmnopqrstuvwxyz",
    ]) {
      const out = redactKeys(`provider said: ${key}`);
      expect(out, key).not.toContain(key);
      expect(out).toContain("…");
    }
  });

  it("leaves ordinary text alone", () => {
    expect(redactKeys("rate limit exceeded")).toBe("rate limit exceeded");
  });
});

describe("statusForProviderError", () => {
  it.each([
    '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
    "invalid x-api-key",
    "invalid_api_key",
    "API key not valid. Please pass a valid API key.",
    "Unauthorized",
    "permission denied",
  ])("classifies %s as an auth failure", (message) => {
    expect(statusForProviderError(message)).toBe(401);
  });

  it.each(["429 rate limit exceeded", "overloaded_error", "fetch failed", "timeout"])(
    "classifies %s as upstream trouble",
    (message) => {
      expect(statusForProviderError(message)).toBe(502);
    },
  );
});
