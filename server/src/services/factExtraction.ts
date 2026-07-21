import fs from "node:fs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { callGemini, type GeminiPart } from "./gemini.js";
import { CANONICAL_FACTS, CANONICAL_FACT_BY_KEY } from "./canonicalFacts.js";

const extractionSchema = z.object({
  facts: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      pageReference: z.string().optional(),
      snippet: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          pageReference: { type: "string" },
          snippet: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["key", "value", "snippet", "confidence"],
      },
    },
  },
  required: ["facts"],
};

function buildSystemPrompt(): string {
  const factList = CANONICAL_FACTS.map((f) => `- ${f.key}: ${f.label} (domain ${f.domain})`).join("\n");
  return `You are extracting structured compliance facts from a UK defence supplier's evidence document, for a supplier-assurance record a director may later rely on.

Canonical facts you may extract (use the exact key):
${factList}

Only extract a fact if this specific document directly and clearly states it — do not infer, guess, or extrapolate. For every fact you extract, include a verbatim snippet (the exact supporting text) and, if the document has pages, a page reference. Confidence is your own 0-1 estimate of how clearly the document supports the extracted value. Omit any fact this document doesn't address entirely — do not invent a plausible-sounding value. Abstention beats hallucination.

Respond with JSON matching the provided schema only — no other text.`;
}

export interface ExtractableDocument {
  id: string;
  title: string;
  file_path: string;
  mime_type: string;
  organisation_id: string;
}

export interface ExtractionResult {
  factsUpdated: number;
  conflicts: number;
}

export async function extractFactsFromDocument(document: ExtractableDocument): Promise<ExtractionResult> {
  if (!fs.existsSync(document.file_path)) return { factsUpdated: 0, conflicts: 0 };

  const contents: GeminiPart[] = [];
  if (document.mime_type === "application/pdf" || document.mime_type.startsWith("image/")) {
    const data = fs.readFileSync(document.file_path).toString("base64");
    contents.push({ inlineData: { mimeType: document.mime_type, data } });
    contents.push({ text: `(The document above is titled "${document.title}".)` });
  } else if (document.mime_type.startsWith("text/")) {
    const text = fs.readFileSync(document.file_path, "utf-8");
    contents.push({ text: `Document "${document.title}":\n${text}` });
  } else {
    // Other mime types (docx, xlsx, etc.) aren't extracted in this pass.
    return { factsUpdated: 0, conflicts: 0 };
  }

  const raw = await callGemini({
    contents,
    systemInstruction: buildSystemPrompt(),
    responseJsonSchema: RESPONSE_JSON_SCHEMA,
  });

  let parsed;
  try {
    parsed = extractionSchema.parse(JSON.parse(raw));
  } catch {
    console.error(`Fact extraction returned unparseable output for document ${document.id}`);
    return { factsUpdated: 0, conflicts: 0 };
  }

  let factsUpdated = 0;
  let conflicts = 0;

  for (const extracted of parsed.facts) {
    const def = CANONICAL_FACT_BY_KEY.get(extracted.key);
    if (!def) continue; // hallucinated/unrecognized key — drop it

    const { rows: existingRows } = await pool.query(
      `SELECT * FROM facts WHERE organisation_id = $1 AND domain = $2 AND key = $3`,
      [document.organisation_id, def.domain, def.key],
    );
    let fact = existingRows[0];

    if (!fact) {
      const { rows } = await pool.query(
        `INSERT INTO facts (organisation_id, domain, key, label, current_value, status)
         VALUES ($1, $2, $3, $4, $5, 'unverified') RETURNING *`,
        [document.organisation_id, def.domain, def.key, def.label, extracted.value],
      );
      fact = rows[0];
    } else if (fact.status === "verified" && fact.current_value !== extracted.value) {
      // A verified fact means a human already confirmed a value — a new,
      // disagreeing extraction doesn't overwrite it, it flags a conflict
      // for a human to resolve (spec §3: "the Fact holds both, flags a
      // conflict, and blocks green status on any answer depending on it").
      await pool.query(`UPDATE facts SET conflict = true, updated_at = now() WHERE id = $1`, [fact.id]);
      conflicts += 1;
    } else if (fact.status === "unverified" && fact.current_value !== extracted.value) {
      await pool.query(`UPDATE facts SET current_value = $1, updated_at = now() WHERE id = $2`, [
        extracted.value,
        fact.id,
      ]);
    }

    await pool.query(
      `INSERT INTO fact_extractions (fact_id, document_id, page_reference, snippet, extracted_value, confidence)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fact.id, document.id, extracted.pageReference ?? null, extracted.snippet, extracted.value, extracted.confidence],
    );
    factsUpdated += 1;
  }

  return { factsUpdated, conflicts };
}
