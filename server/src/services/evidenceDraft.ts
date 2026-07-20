import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

// Tier 2 of the "compliance passport" AI feature: draft an answer to an
// incoming question directly from the document vault, for questions with no
// existing passport entry to match against. Always a draft — the caller is
// responsible for requiring human confirmation before it becomes a real
// answer (see requests.ts: stored as ai_draft_answer, only promoted to
// custom_answer once a human explicitly accepts it).

const draftSchema = z.object({
  foundEvidence: z.boolean(),
  answer: z.string(),
  usedDocumentTitles: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are drafting a formal compliance response for a UK defence supplier. The draft you produce will be reviewed and edited by a human before it is sent to anyone — you are not sending this yourself.

Only state facts that are directly and clearly supported by the evidence documents provided in this message. Do not infer, extrapolate, or guess at details the documents don't contain. If the documents do not address the question, set foundEvidence to false, leave answer as an empty string, and do not invent a plausible-sounding answer.

When you do have supporting evidence: keep the answer concise (2-4 sentences), factual, and professional. In usedDocumentTitles, list the exact titles (copied verbatim from what was given to you) of only the documents you actually drew on — omit any you didn't use.`;

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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DraftUnavailableError(
      "AI drafting is not configured on this server (ANTHROPIC_API_KEY is not set).",
    );
  }

  const client = new Anthropic();
  const titleToId = new Map<string, string>();
  const content: Anthropic.MessageParam["content"] = [];

  for (const doc of docs) {
    if (!fs.existsSync(doc.filePath)) continue;
    titleToId.set(doc.title, doc.id);

    if (doc.mimeType === "application/pdf") {
      const data = fs.readFileSync(doc.filePath).toString("base64");
      content.push({
        type: "document",
        title: doc.title,
        source: { type: "base64", media_type: "application/pdf", data },
      });
    } else if (doc.mimeType.startsWith("text/")) {
      const text = fs.readFileSync(doc.filePath, "utf-8");
      content.push({ type: "text", text: `Document "${doc.title}":\n${text}` });
    }
    // Other mime types (images, docx, etc.) aren't extracted for this pass —
    // they simply aren't offered as evidence to the model.
  }

  content.push({ type: "text", text: `Question: ${question}` });

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(draftSchema) },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new DraftUnavailableError("AI drafting is not available: invalid API credentials.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new DraftUnavailableError("The drafting request was declined.");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new DraftUnavailableError("Could not generate a draft from the available evidence.");
  }

  const usedDocumentIds = parsed.usedDocumentTitles
    .map((title) => titleToId.get(title))
    .filter((id): id is string => !!id);

  return { foundEvidence: parsed.foundEvidence, answer: parsed.answer, usedDocumentIds };
}
