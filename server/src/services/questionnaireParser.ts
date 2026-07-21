import ExcelJS from "exceljs";

export interface ParsedQuestion {
  sheetName: string;
  rowRef: string;
  questionText: string;
  responseType: "free_text" | "yes_no" | "numeric" | "attachment";
  section: string;
  sortOrder: number;
}

export interface ParseResult {
  needsMapping: boolean;
  questions: ParsedQuestion[];
  unmappedSheets: string[];
}

export interface SheetPreview {
  sheetName: string;
  rows: string[][];
}

export interface ColumnHint {
  sheetName: string;
  headerRow: number;
  questionCol: number;
  responseCol: number;
}

const QUESTION_HEADER_KEYWORDS = ["question", "requirement", "control", "query"];
const RESPONSE_HEADER_KEYWORDS = ["response", "answer", "supplier response", "comments"];

function cellText(cell: ExcelJS.Cell): string {
  // ExcelJS's `.text` getter already flattens rich text, formulas, and
  // hyperlink display text into a plain string — no need to hand-unwrap
  // cell.value's many possible shapes.
  return (cell.text ?? "").toString().trim();
}

function inferResponseType(question: string): ParsedQuestion["responseType"] {
  const q = question.toLowerCase().trim();
  if (/^(do|does|is|are|have|has|will|can)\b.*\?$/.test(q)) return "yes_no";
  if (/how many|number of|headcount|quantity/.test(q)) return "numeric";
  return "free_text";
}

function detectHeader(sheet: ExcelJS.Worksheet): { headerRow: number; questionCol: number; responseCol: number } | null {
  const maxScanRow = Math.min(sheet.rowCount, 15);
  for (let r = 1; r <= maxScanRow; r++) {
    const row = sheet.getRow(r);
    let questionCol = -1;
    let responseCol = -1;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell).toLowerCase();
      if (questionCol === -1 && QUESTION_HEADER_KEYWORDS.some((k) => text.includes(k))) questionCol = colNumber;
      if (responseCol === -1 && RESPONSE_HEADER_KEYWORDS.some((k) => text.includes(k))) responseCol = colNumber;
    });
    if (questionCol !== -1) {
      return { headerRow: r, questionCol, responseCol: responseCol !== -1 ? responseCol : questionCol + 1 };
    }
  }
  return null;
}

function extractQuestions(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  questionCol: number,
  responseCol: number,
  startSortOrder: number,
): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let sortOrder = startSortOrder;
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const questionText = cellText(row.getCell(questionCol)).trim();
    if (!questionText || questionText.length < 4) continue;
    questions.push({
      sheetName: sheet.name,
      rowRef: JSON.stringify({ sheet: sheet.name, row: r, responseCol }),
      questionText,
      responseType: inferResponseType(questionText),
      section: sheet.name,
      sortOrder: sortOrder++,
    });
  }
  return questions;
}

/**
 * Auto-detects the question/response columns per sheet via header-row
 * keyword matching. Sheets it can't confidently map are reported in
 * `unmappedSheets` rather than guessed at — the caller falls back to
 * `getSheetPreview` + `parseWithHints` for those (spec §11: "Questionnaire
 * format unrecognised -> guided column-mapping screen, never a hard
 * failure").
 */
export async function parseQuestionnaire(filePath: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const questions: ParsedQuestion[] = [];
  const unmappedSheets: string[] = [];

  for (const sheet of workbook.worksheets) {
    const header = detectHeader(sheet);
    if (!header) {
      unmappedSheets.push(sheet.name);
      continue;
    }
    questions.push(
      ...extractQuestions(sheet, header.headerRow, header.questionCol, header.responseCol, questions.length),
    );
  }

  return { needsMapping: questions.length === 0, questions, unmappedSheets };
}

/** First few rows of every sheet, as plain text, for a guided-mapping picker. */
export async function getWorkbookPreview(filePath: string): Promise<SheetPreview[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return workbook.worksheets.map((sheet) => {
    const rows: string[][] = [];
    const maxRow = Math.min(sheet.rowCount, 5);
    for (let r = 1; r <= maxRow; r++) {
      const row = sheet.getRow(r);
      const maxCol = Math.min(sheet.columnCount || 10, 10);
      const cells: string[] = [];
      for (let c = 1; c <= maxCol; c++) cells.push(cellText(row.getCell(c)));
      rows.push(cells);
    }
    return { sheetName: sheet.name, rows };
  });
}

/** Parses one sheet using explicit column numbers supplied by a human, bypassing header detection. */
export async function parseWithHint(filePath: string, hint: ColumnHint): Promise<ParsedQuestion[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets.find((s) => s.name === hint.sheetName);
  if (!sheet) return [];
  return extractQuestions(sheet, hint.headerRow, hint.questionCol, hint.responseCol, 0);
}
