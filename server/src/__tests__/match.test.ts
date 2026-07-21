import { describe, it, expect } from "vitest";
import { bestMatch, jaccardSimilarity, normalizeToWords } from "../utils/match.js";

describe("normalizeToWords", () => {
  it("lowercases, strips punctuation, and drops stopwords", () => {
    const words = normalizeToWords("Do you hold Cyber Essentials Plus certification?");
    expect(words.has("cyber")).toBe(true);
    expect(words.has("do")).toBe(false);
    expect(words.has("you")).toBe(false);
  });
});

describe("jaccardSimilarity", () => {
  it("is 1 for identical word sets", () => {
    const a = normalizeToWords("cyber essentials plus certification");
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it("is 0 for disjoint word sets", () => {
    const a = normalizeToWords("cyber essentials plus");
    const b = normalizeToWords("financial accounts credit rating");
    expect(jaccardSimilarity(a, b)).toBe(0);
  });
});

describe("bestMatch", () => {
  const candidates = [
    { id: "1", question: "Do you hold Cyber Essentials Plus certification?" },
    { id: "2", question: "Can you provide evidence of financial stability (accounts, credit rating)?" },
  ];

  it("picks the closer candidate even when phrased differently", () => {
    const result = bestMatch("Please confirm if you hold Cyber Essentials Plus certification", candidates);
    expect(result.id).toBe("1");
  });

  it("returns no match when nothing clears the threshold", () => {
    const result = bestMatch("What is your favourite colour scheme for branding", candidates);
    expect(result.id).toBeNull();
  });
});
