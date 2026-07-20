// Deterministic text-similarity matching for mapping an incoming
// questionnaire question onto a passport Q&A entry. Deliberately not an
// LLM call: transparent, debuggable, no external dependency or cost, and
// good enough for short, keyword-dense compliance questions.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "do", "does", "did", "you", "your", "yours",
  "have", "has", "had", "of", "to", "for", "and", "or", "in", "on", "with",
  "please", "provide", "confirm", "if", "any", "we", "us", "our", "can",
  "will", "be", "it", "this", "that", "these", "those", "how", "what",
  "many", "outline", "detail", "details", "state",
]);

export function normalizeToWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MatchCandidate {
  id: string;
  question: string;
}

export interface MatchResult {
  id: string | null;
  score: number;
}

export const SUGGESTION_THRESHOLD = 0.2;

export function bestMatch(questionText: string, candidates: MatchCandidate[]): MatchResult {
  const questionWords = normalizeToWords(questionText);
  let best: MatchResult = { id: null, score: 0 };
  for (const candidate of candidates) {
    const score = jaccardSimilarity(questionWords, normalizeToWords(candidate.question));
    if (score > best.score) best = { id: candidate.id, score };
  }
  return best.score >= SUGGESTION_THRESHOLD ? best : { id: null, score: best.score };
}
