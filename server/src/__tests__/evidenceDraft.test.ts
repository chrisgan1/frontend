import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { parse: mockParse };
  }
  class AuthenticationError extends Error {}
  return { default: Object.assign(MockAnthropic, { AuthenticationError }) };
});

import { draftAnswerFromEvidence, DraftUnavailableError } from "../services/evidenceDraft.js";

const originalKey = process.env.ANTHROPIC_API_KEY;

describe("draftAnswerFromEvidence", () => {
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    mockParse.mockReset();
  });

  it("throws DraftUnavailableError when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(draftAnswerFromEvidence("Do you hold ISO 27001?", [])).rejects.toThrow(
      DraftUnavailableError,
    );
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("maps cited document titles back to their IDs and drops unrecognized titles", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: {
        foundEvidence: true,
        answer: "Yes, we hold Cyber Essentials Plus.",
        usedDocumentTitles: ["Cyber Essentials Plus Certificate", "Some Hallucinated Title"],
      },
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
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { foundEvidence: false, answer: "", usedDocumentTitles: [] },
    });

    const result = await draftAnswerFromEvidence("What is your favourite colour?", []);
    expect(result.foundEvidence).toBe(false);
    expect(result.usedDocumentIds).toEqual([]);
  });
});
