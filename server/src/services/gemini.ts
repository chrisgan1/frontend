import { GoogleGenAI, ApiError } from "@google/genai";

// Shared Gemini client wrapper used by every AI-touching service (fact
// extraction, answer engine). Extracted from the original evidence-draft
// service after three real failure modes were found and hardened against
// via live testing against the actual Gemini API:
//   1. ApiError with any status (not just 401/403) — a real invalid-key
//      response came back as 400, not 401.
//   2. AbortError (DOMException) — the SDK has no default request timeout;
//      a stalled connection hung indefinitely until one was wired in via
//      httpOptions.timeout, which aborts and throws this.
//   3. A plain TypeError("fetch failed") wrapping undici's own internal
//      HeadersTimeoutError — undici's internal timeout occasionally races
//      ahead of the SDK's own AbortController-based one.
// Rather than re-litigate this per AI-touching feature, every failure mode
// funnels through one place and comes out as a single typed error.

export class AiUnavailableError extends Error {}

// "-latest" alias rather than a dated model ID: Gemini's dated model IDs
// retire faster than this codebase gets touched (gemini-2.5-flash, current
// when this was first written, was rejected as "no longer available to
// new users" days later).
const MODEL = "gemini-flash-latest";

const TRANSIENT_STATUSES = new Set([429, 503]);
const RETRY_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 30000;

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiCallOptions {
  contents: GeminiPart[];
  systemInstruction: string;
  responseJsonSchema: object;
}

/** Calls Gemini with structured JSON output and returns the raw JSON text. Throws AiUnavailableError on any failure. */
export async function callGemini({ contents, systemInstruction, responseJsonSchema }: GeminiCallOptions): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiUnavailableError("AI features are not configured on this server (GEMINI_API_KEY is not set).");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const generationRequest = {
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  };

  let response;
  try {
    // Gemini's free-tier flash model returns a transient 429/503 ("high
    // demand" or quota) often enough in practice that a single retry
    // meaningfully improves success rate — observed directly against the
    // live API, not a speculative concern.
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
    // Any Gemini-side failure (bad key, rate limit, quota, timeout,
    // network blip, service outage) should degrade to a clear error, not
    // crash the request — every caller's job is only "here's a result or
    // here's why not."
    if (err instanceof ApiError) {
      const reason =
        err.status === 401 || err.status === 403 || err.status === 400
          ? "invalid or missing API credentials"
          : err.status === 429
            ? "rate limit or quota exceeded"
            : err.status === 503
              ? "the model is temporarily overloaded — try again shortly"
              : `provider error (status ${err.status})`;
      throw new AiUnavailableError(`AI features are not available right now: ${reason}.`);
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        "AI features are not available right now: the request took too long and was cancelled.",
      );
    }
    if (err instanceof Error) {
      throw new AiUnavailableError("AI features are not available right now: could not reach the AI provider.");
    }
    throw err;
  }

  const raw = response.text;
  if (!raw) {
    throw new AiUnavailableError("The AI provider returned an empty response.");
  }
  return raw;
}
