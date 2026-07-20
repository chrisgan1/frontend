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
import { draftAnswerFromEvidence, DraftUnavailableError } from "../services/evidenceDraft.js";

const originalKey = process.env.GEMINI_API_KEY;

describe("draftAnswerFromEvidence", () => {
  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    mockGenerateContent.mockReset();
  });

  it("throws DraftUnavailableError when no API key is configured", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(draftAnswerFromEvidence("Do you hold ISO 27001?", [])).rejects.toThrow(
      DraftUnavailableError,
    );
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("maps cited document titles back to their IDs and drops unrecognized titles", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        foundEvidence: true,
        answer: "Yes, we hold Cyber Essentials Plus.",
        usedDocumentTitles: ["Cyber Essentials Plus Certificate", "Some Hallucinated Title"],
      }),
    });

    const result = await draftAnswerFromEvidence("Do you hold Cyber Essentials Plus?", [
      {
        id: "doc-1",
        title: "Cyber Essentials Plus Certificate",
        mimeType: "text/plain",
        filePath: "/dev/null",
      },
    ]);

    expect(result.foundEvidence).toBe(true);
    expect(result.usedDocumentIds).toEqual(["doc-1"]);
  });

  it("reports no evidence found without fabricating an answer", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ foundEvidence: false, answer: "", usedDocumentTitles: [] }),
    });

    const result = await draftAnswerFromEvidence("What is your favourite colour?", []);
    expect(result.foundEvidence).toBe(false);
    expect(result.usedDocumentIds).toEqual([]);
  });

  it("fails clearly (not a crash) when the model returns unparseable output", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({ text: "not valid json" });

    await expect(draftAnswerFromEvidence("Do you hold ISO 27001?", [])).rejects.toThrow(
      DraftUnavailableError,
    );
  });

  // Regression: a real invalid key came back from Gemini as status 400
  // (INVALID_ARGUMENT / API_KEY_INVALID), not 401/403 — an earlier version
  // of this code only special-cased 401/403 and let everything else
  // (including this) propagate as a raw, uncaught ApiError.
  it("converts any ApiError status — not just 401/403 — into a DraftUnavailableError", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockRejectedValue(
      new (ApiError as any)({ message: "API key not valid.", status: 400 }),
    );

    await expect(draftAnswerFromEvidence("Do you hold ISO 27001?", [])).rejects.toThrow(
      DraftUnavailableError,
    );
  });

  // Regression: a request that exceeds httpOptions.timeout aborts the
  // underlying fetch, which rejects with a DOMException named "AbortError" —
  // not an ApiError (there's no HTTP response to derive a status from).
  // Confirmed directly by inspecting the SDK's compiled apiCall/
  // includeExtraHttpOptionsToRequestInit in node_modules/@google/genai/dist.
  it("converts a request timeout (AbortError) into a DraftUnavailableError", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const abortError = new Error("This operation was aborted");
    abortError.name = "AbortError";
    mockGenerateContent.mockRejectedValue(abortError);

    await expect(draftAnswerFromEvidence("Do you hold ISO 27001?", [])).rejects.toThrow(
      DraftUnavailableError,
    );
  });
});
