import { describe, it, expect, vi, afterEach } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent };
  }
  class ApiError extends Error {
    status: number;
    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.status = options.status;
    }
  }
  return { GoogleGenAI: MockGoogleGenAI, ApiError };
});

import { ApiError } from "@google/genai";
import { callGemini, AiUnavailableError } from "../services/gemini.js";

const originalKey = process.env.GEMINI_API_KEY;
const baseCall = {
  contents: [{ text: "test" }],
  systemInstruction: "test",
  responseJsonSchema: { type: "object" },
};

describe("callGemini", () => {
  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    mockGenerateContent.mockReset();
  });

  it("throws AiUnavailableError when no API key is configured", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(callGemini(baseCall)).rejects.toThrow(AiUnavailableError);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns response.text on success", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({ text: '{"ok":true}' });
    await expect(callGemini(baseCall)).resolves.toBe('{"ok":true}');
  });

  it("retries once on a transient 503 and succeeds on the second attempt", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent
      .mockRejectedValueOnce(new (ApiError as any)({ message: "overloaded", status: 503 }))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    await expect(callGemini(baseCall)).resolves.toBe('{"ok":true}');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  // Regression: a real invalid key came back from Gemini as status 400
  // (INVALID_ARGUMENT / API_KEY_INVALID), not 401/403.
  it("converts any ApiError status — not just 401/403 — into an AiUnavailableError", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockRejectedValue(new (ApiError as any)({ message: "API key not valid.", status: 400 }));
    await expect(callGemini(baseCall)).rejects.toThrow(AiUnavailableError);
  });

  // Regression: a timed-out request aborts the underlying fetch, which
  // rejects with a DOMException named "AbortError" — not an ApiError.
  it("converts a request timeout (AbortError) into an AiUnavailableError", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const abortError = new Error("This operation was aborted");
    abortError.name = "AbortError";
    mockGenerateContent.mockRejectedValue(abortError);
    await expect(callGemini(baseCall)).rejects.toThrow(AiUnavailableError);
  });

  // Regression: live testing also observed a plain `TypeError: fetch
  // failed` (undici's own internal headers-timeout racing ahead of the
  // SDK's AbortController-based one).
  it("converts any other provider error into an AiUnavailableError", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockRejectedValue(new TypeError("fetch failed"));
    await expect(callGemini(baseCall)).rejects.toThrow(AiUnavailableError);
  });

  it("throws AiUnavailableError when the response has no text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({ text: "" });
    await expect(callGemini(baseCall)).rejects.toThrow(AiUnavailableError);
  });
});
