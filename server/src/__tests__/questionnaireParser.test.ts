import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ExcelJS from "exceljs";
import { parseQuestionnaire } from "../services/questionnaireParser.js";

describe("parseQuestionnaire", () => {
  let filePath: string;

  beforeAll(async () => {
    const workbook = new ExcelJS.Workbook();

    // Regression: a prose/instructions sheet whose title happens to
    // contain "questionnaire" must not be mistaken for a header row —
    // found by running a real messy multi-tab prime questionnaire
    // through this parser, where exactly this happened.
    const instructions = workbook.addWorksheet("Instructions");
    instructions.addRow(["SUPPLIER ASSURANCE QUESTIONNAIRE — PLEASE READ BEFORE COMPLETING"]);
    instructions.addRow(["Complete every tab and return by the due date."]);
    instructions.addRow(["Do not alter column headers or sheet names."]);

    const clean = workbook.addWorksheet("Clean Sheet");
    clean.addRow(["Question", "Response"]);
    clean.addRow(["Do you hold ISO 9001 certification?", ""]);
    clean.addRow(["What is your registered company number?", ""]);

    const unmapped = workbook.addWorksheet("Unmapped Sheet");
    unmapped.addRow(["Item", "Details Required"]);
    unmapped.addRow(["Confirm total headcount", ""]);

    filePath = path.join(os.tmpdir(), `parser-test-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
  });

  afterAll(() => {
    fs.rmSync(filePath, { force: true });
  });

  it("does not mistake a prose title containing 'questionnaire' for a header row", async () => {
    const result = await parseQuestionnaire(filePath);
    expect(result.unmappedSheets).toContain("Instructions");
    expect(result.questions.some((q) => q.sheetName === "Instructions")).toBe(false);
  });

  it("parses a sheet with recognisable headers", async () => {
    const result = await parseQuestionnaire(filePath);
    const cleanQuestions = result.questions.filter((q) => q.sheetName === "Clean Sheet");
    expect(cleanQuestions).toHaveLength(2);
    expect(cleanQuestions[0].questionText).toBe("Do you hold ISO 9001 certification?");
  });

  it("reports a sheet with unrecognised column names as unmapped, not guessed at", async () => {
    const result = await parseQuestionnaire(filePath);
    expect(result.unmappedSheets).toContain("Unmapped Sheet");
    expect(result.questions.some((q) => q.sheetName === "Unmapped Sheet")).toBe(false);
  });
});
