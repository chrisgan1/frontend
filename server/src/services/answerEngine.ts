import { z } from "zod";
import { pool } from "../db/pool.js";
import { callGemini, AiUnavailableError } from "./gemini.js";
import { bestMatch, type MatchCandidate } from "../utils/match.js";

// Layered per the spec (§4.3.3 / M4): answer-library match (reuse a
// previously human-approved answer) -> fact-grounded draft -> abstain.
// Retrieval over the raw document vault (the spec's third tier) is
// deferred for this slice — with only ~27 canonical facts wired up, the
// verified Fact Base itself is small enough to hand the model directly as
// grounding, without standing up embeddings/a vector store. A real
// document-chunk retrieval tier is a natural next addition once fact
// coverage and data volume justify it.

const LIBRARY_MATCH_THRESHOLD = 0.4;
// Green requires both a high self-reported confidence AND (enforced in
// code, not just trusted from the model) that every cited fact is
// human-verified and conflict-free — a conflicted or unverified fact can
// never produce a green answer, regardless of what the model claims.
const GREEN_CONFIDENCE_THRESHOLD = 0.85;

const draftSchema = z.object({
  foundEvidence: z.boolean(),
  answer: z.string(),
  citedFactKeys: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    foundEvidence: { type: "boolean" },
    answer: { type: "string" },
    citedFactKeys: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["foundEvidence", "answer", "citedFactKeys", "confidence"],
};

function buildSystemPrompt(facts: Array<{ key: string; label: string; value: string; domain: string }>): string {
  const factList = facts.length
    ? facts.map((f) => `- ${f.key} [${f.domain}] ${f.label}: ${f.value}`).join("\n")
    : "(no verified facts available)";
  return `You are drafting a supplier-assurance answer for a UK defence SME, to a question from one of their primes (BAE, Babcock, Leonardo, Thales, MBDA, Rolls-Royce, or similar). The audience is an experienced supplier-assurance analyst who reads hundreds of these and can smell padding.

Verified Facts available to you:
${factList}

Ground your answer strictly in these facts — do not infer, extrapolate, or guess anything they don't directly support. If they don't address the question, set foundEvidence to false, leave answer and citedFactKeys empty, and confidence 0. A confidently wrong answer is a liability, not a bug — abstention beats hallucination, always.

House style when you do answer: 1-3 sentences, terse, factual, British English, no marketing language, no hedging. In citedFactKeys, list only the exact fact keys you relied on.

confidence reflects how directly and completely the cited facts answer the question: 0.9+ only for a direct, unambiguous restatement; lower for anything requiring interpretation or partial coverage.

Respond with JSON matching the provided schema only — no other text.`;
}

interface QuestionRow {
  id: string;
  question_text: string;
}

export interface AnswerEngineResult {
  total: number;
  green: number;
  amber: number;
  red: number;
}

export async function runAnswerEngine(questionnaireId: string, organisationId: string): Promise<AnswerEngineResult> {
  // Skip anything a human has already confirmed — re-running the engine
  // (e.g. after uploading more evidence) must never clobber a confirmed
  // answer out from under a reviewer.
  const { rows: questions } = await pool.query<QuestionRow>(
    `SELECT qi.id, qi.question_text FROM question_instances qi
     JOIN answers a ON a.question_instance_id = qi.id
     WHERE qi.questionnaire_id = $1 AND a.confirmed = false
     ORDER BY qi.sort_order`,
    [questionnaireId],
  );

  const { rows: libraryEntries } = await pool.query(
    `SELECT * FROM answer_library WHERE organisation_id = $1`,
    [organisationId],
  );
  const libraryCandidates: MatchCandidate[] = libraryEntries.map((e) => ({ id: e.id, question: e.canonical_question_text }));

  const { rows: verifiedFacts } = await pool.query(
    `SELECT id, key, label, current_value, domain FROM facts
     WHERE organisation_id = $1 AND status = 'verified' AND conflict = false AND current_value IS NOT NULL`,
    [organisationId],
  );
  const factByKey = new Map(verifiedFacts.map((f) => [f.key, f]));
  const factContext = verifiedFacts.map((f) => ({ key: f.key, label: f.label, value: f.current_value, domain: f.domain }));

  const counts: AnswerEngineResult = { total: questions.length, green: 0, amber: 0, red: 0 };

  for (const question of questions) {
    // Clear whatever gap may have been auto-created by a previous run.
    await pool.query(`DELETE FROM gaps WHERE question_instance_id = $1`, [question.id]);

    const libraryMatch = libraryCandidates.length
      ? bestMatchAtThreshold(question.question_text, libraryCandidates, LIBRARY_MATCH_THRESHOLD)
      : null;

    if (libraryMatch) {
      const entry = libraryEntries.find((e) => e.id === libraryMatch.id)!;
      await pool.query(
        `UPDATE answers SET text = $1, status = 'green', confidence = $2, source = 'library',
           cited_fact_ids = '{}', cited_document_ids = '{}', is_override = false, updated_at = now()
         WHERE question_instance_id = $3`,
        [entry.approved_answer, libraryMatch.score, question.id],
      );
      await pool.query(`UPDATE answer_library SET last_used_at = now() WHERE id = $1`, [entry.id]);
      counts.green += 1;
      continue;
    }

    let draft: z.infer<typeof draftSchema> | null = null;
    try {
      const raw = await callGemini({
        contents: [{ text: `Question: ${question.question_text}` }],
        systemInstruction: buildSystemPrompt(factContext),
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
      });
      draft = draftSchema.parse(JSON.parse(raw));
    } catch (err) {
      if (!(err instanceof AiUnavailableError)) console.error(`Answer engine failed for question ${question.id}:`, err);
      draft = null;
    }

    const citedFacts = (draft?.citedFactKeys ?? []).map((k) => factByKey.get(k)).filter(Boolean) as typeof verifiedFacts;
    const allCitedFactsVerified = citedFacts.length > 0; // already filtered to verified+conflict-free above

    if (draft?.foundEvidence && draft.answer.trim()) {
      const isGreen = draft.confidence >= GREEN_CONFIDENCE_THRESHOLD && allCitedFactsVerified;
      await pool.query(
        `UPDATE answers SET text = $1, status = $2, confidence = $3, source = 'generated',
           cited_fact_ids = $4, cited_document_ids = '{}', is_override = false, updated_at = now()
         WHERE question_instance_id = $5`,
        [draft.answer, isGreen ? "green" : "amber", draft.confidence, citedFacts.map((f) => f.id), question.id],
      );
      if (isGreen) counts.green += 1;
      else counts.amber += 1;
      continue;
    }

    // Abstained — no library match, no fact-grounded draft. Genuine gap.
    await pool.query(
      `UPDATE answers SET text = '', status = 'red', confidence = $1, source = 'generated',
         cited_fact_ids = '{}', cited_document_ids = '{}', is_override = false, updated_at = now()
       WHERE question_instance_id = $2`,
      [draft?.confidence ?? null, question.id],
    );
    // Heuristic gap typing: if the model found *something* relevant but not
    // enough to answer, treat it as "evidence exists, not fully uploaded/
    // verified" (type a); if it found nothing at all, treat it as a real
    // control gap (type c). Types b/d need human judgement in this slice.
    const gapType = (draft?.citedFactKeys?.length ?? 0) > 0 ? "a" : "c";
    await pool.query(`INSERT INTO gaps (question_instance_id, type) VALUES ($1, $2)`, [question.id, gapType]);
    counts.red += 1;
  }

  return counts;
}

function bestMatchAtThreshold(questionText: string, candidates: MatchCandidate[], threshold: number) {
  const result = bestMatch(questionText, candidates);
  // bestMatch() applies its own lower threshold internally; re-check
  // against the library's stricter bar since a library "reuse" auto-goes
  // green, unlike a merely-suggested passport match.
  return result.id && result.score >= threshold ? result : null;
}
