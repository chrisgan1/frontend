import fs from "node:fs";
import { GoogleGenAI, ApiError } from "@google/genai";
import { z } from "zod";

// Tier 2 of the "compliance passport" AI feature: draft an answer to an
// incoming question directly from the document vault, for questions with no
// existing passport entry to match against. Always a draft — the caller is
// responsible for requiring human confirmation before it becomes a real
// answer (see requests.ts: stored as ai_draft_answer, only promoted to
// custom_answer once a human explicitly accepts it).
//
// Uses Gemini's free tier (Gemini Developer API via GEMINI_API_KEY) rather
// than a paid API — this is a single grounded-QA call, well within what a
// free-tier flash model handles, so there's no reason to spend on a
// frontier-tier model for it.

const draftSchema = z.object({
  foundEvidence: z.boolean(),
  answer: z.string(),
  usedDocumentTitles: z.array(z.string()),
});

// Matches draftSchema above. Gemini's responseJsonSchema accepts a real JSON
// Schema (a documented subset), unlike responseSchema's OpenAPI-subset format.
const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    foundEvidence: { type: "boolean" },
    answer: { type: "string" },
    usedDocumentTitles: { type: "array", items: { type: "string" } },
  },
  required: ["foundEvidence", "answer", "usedDocumentTitles"],
};

const SYSTEM_PROMPT = `You are drafting a formal compliance response for a UK defence supplier. The draft you produce will be reviewed and edited by a human before it is sent to anyone — you are not sending this yourself.

Only state facts that are directly and clearly supported by the evidence documents provided in this message. Do not infer, extrapolate, or guess at details the documents don't contain. If the documents do not address the question, set foundEvidence to false, leave answer as an empty string, and do not invent a plausible-sounding answer.

When you do have supporting evidence: keep the answer concise (2-4 sentences), factual, and professional. In usedDocumentTitles, list the exact titles (copied verbatim from what was given to you) of only the documents you actually drew on — omit any you didn't use.

Respond with JSON matching the provided schema only — no other text.`;

// "-latest" alias rather than a dated model ID: Gemini's dated model IDs
// retire faster than this codebase gets touched (gemini-2.5-flash, current
// at the time this was first written, was already rejected as "no longer
// available to new users" by the time this was live-tested days later).
const MODEL = "gemini-flash-latest";

const TRANSIENT_STATUSES = new Set([429, 503]);
const RETRY_DELAY_MS = 1500;
// The SDK has no default request timeout — a stalled connection to Gemini
// (observed directly: one request hung indefinitely rather than erroring)
// would otherwise leave the caller's request, and the user's browser,
// waiting forever.
const REQUEST_TIMEOUT_MS = 30000;

export interface EvidenceDoc {
  id: string;
  title: string;
  mimeType: string;
  filePath: string;
}

export interface DraftResult {
  foundEvidence: boolean;
  answer: string;
  usedDocumentIds: string[];
}

export class DraftUnavailableError extends Error {}

export async function draftAnswerFromEvidence(
  question: string,
  docs: EvidenceDoc[],
): Promise<DraftResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new DraftUnavailableError(
      "AI drafting is not configured on this server (GEMINI_API_KEY is not set).",
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const titleToId = new Map<string, string>();
  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  for (const doc of docs) {
    if (!fs.existsSync(doc.filePath)) continue;
    titleToId.set(doc.title, doc.id);

    if (doc.mimeType === "application/pdf") {
      const data = fs.readFileSync(doc.filePath).toString("base64");
      contents.push({ inlineData: { mimeType: "application/pdf", data } });
      contents.push({ text: `(The document above is titled "${doc.title}".)` });
    } else if (doc.mimeType.startsWith("text/")) {
      const text = fs.readFileSync(doc.filePath, "utf-8");
      contents.push({ text: `Document "${doc.title}":\n${text}` });
    }
    // Other mime types (images, docx, etc.) aren't extracted for this pass —
    // they simply aren't offered as evidence to the model.
  }

  contents.push({ text: `Question: ${question}` });

  const generationRequest = {
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  };

  let response;
  try {
    // Gemini's free-tier flash model returns a transient 503 ("high demand")
    // often enough in practice that a single retry meaningfully improves
    // success rate — observed directly while testing this against the live
    // API, not a speculative concern.
    try {
      response = await ai.models.generateContent(generationRequest);
    } catch (err) {
      if (err instanceof ApiError && TRANSIENT_STATUSES.has(err.status)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        response = await ai.models.generateContent(generationRequest);
      } else {
        throw err;
      }
    }
  } catch (err) {
    // Any Gemini-side failure (bad key, rate limit, quota, service outage)
    // should degrade to a clear error, not crash the request — the caller's
    // job is only "here's a draft or here's why not."
    if (err instanceof ApiError) {
      const reason =
        err.status === 401 || err.status === 403 || err.status === 400
          ? "invalid or missing API credentials"
          : err.status === 429
            ? "rate limit or quota exceeded"
            : err.status === 503
              ? "the model is temporarily overloaded — try again shortly"
              : `provider error (status ${err.status})`;
      throw new DraftUnavailableError(`AI drafting is not available right now: ${reason}.`);
    }
    // A timed-out request aborts the underlying fetch, which rejects with a
    // DOMException named "AbortError" — not an ApiError, since the request
    // never got an HTTP response to derive a status from. Confirmed by
    // reading the SDK's compiled apiCall/includeExtraHttpOptionsToRequestInit
    // (node_modules/@google/genai/dist/index.mjs): no retryOptions are
    // configured here, so apiCall is a bare `fetch(url, requestInit)`, and
    // the AbortController set up from httpOptions.timeout aborts that
    // fetch's signal directly.
    if (err instanceof Error && err.name === "AbortError") {
      throw new DraftUnavailableError(
        "AI drafting is not available right now: the request took too long and was cancelled.",
      );
    }
    throw err;
  }

  const raw = response.text;
  if (!raw) {
    throw new DraftUnavailableError("Could not generate a draft from the available evidence.");
  }

  let parsed;
  try {
    parsed = draftSchema.parse(JSON.parse(raw));
  } catch {
    throw new DraftUnavailableError("Could not generate a draft from the available evidence.");
  }

  const usedDocumentIds = parsed.usedDocumentTitles
    .map((title) => titleToId.get(title))
    .filter((id): id is string => !!id);

  return { foundEvidence: parsed.foundEvidence, answer: parsed.answer, usedDocumentIds };
}
