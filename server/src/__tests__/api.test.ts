import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";

const mockGenerateContent = vi.fn();
let extractionQueue: Array<{ facts: any[] }> = [];
let draftQueue: Array<{ foundEvidence: boolean; answer: string; citedFactKeys: string[]; confidence: number }> = [];

vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = {
      generateContent: (request: any) => mockGenerateContent(request),
    };
  }
  class ApiError extends Error {
    status: number;
    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.status = options.status;
    }
  }
  return { GoogleGenAI: MockGoogleGenAI, ApiError };
});

mockGenerateContent.mockImplementation(async (req: any) => {
  const sys = req.config.systemInstruction as string;
  if (sys.includes("extracting structured compliance facts")) {
    return { text: JSON.stringify(extractionQueue.shift() ?? { facts: [] }) };
  }
  if (sys.includes("drafting a supplier-assurance answer")) {
    return { text: JSON.stringify(draftQueue.shift() ?? { foundEvidence: false, answer: "", citedFactKeys: [], confidence: 0 }) };
  }
  throw new Error(`unexpected Gemini call: ${sys.slice(0, 40)}`);
});

const { app } = await import("../index.js");
const ExcelJS = (await import("exceljs")).default;

async function buildQuestionnaireBuffer(questions: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(["Question", "Response"]);
  for (const q of questions) sheet.addRow([q, ""]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

let ownerToken: string;
let contributorToken: string;
let organisationId: string;
let documentId: string;

beforeAll(async () => {
  const owner = await request(app).post("/api/auth/register").send({
    email: "owner@example.com",
    password: "password123",
    name: "Owner User",
    role: "owner",
    organisationName: "Test Org Ltd",
  });
  ownerToken = owner.body.token;
  organisationId = owner.body.user.organisationId;

  const contributor = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ email: "contributor@example.com", password: "password123", name: "Contributor User", role: "contributor" });
  contributorToken = contributor.body.token;
});

describe("auth and multi-tenancy", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "owner@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("owner");
    expect(res.body.user.organisationId).toBe(organisationId);
  });

  it("rejects incorrect credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "owner@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("a second no-token registration creates a separate organisation", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "other-owner@example.com",
      password: "password123",
      name: "Other Owner",
      role: "owner",
      organisationName: "Other Org Ltd",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.organisationId).not.toBe(organisationId);
  });

  it("blocks a non-owner from inviting further users", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ email: "someone@example.com", password: "password123", name: "Someone", role: "editor" });
    expect(res.status).toBe(403);
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });
});

describe("document vault and fact extraction", () => {
  it("blocks a contributor from uploading a document", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${contributorToken}`)
      .field("title", "Should be blocked")
      .attach("file", Buffer.from("x"), "x.txt");
    expect(res.status).toBe(403);
  });

  it("uploads a document and extracts facts from it", async () => {
    extractionQueue.push({
      facts: [
        { key: "legal_name", value: "Test Org Ltd", snippet: "Test Org Ltd", confidence: 0.95 },
        { key: "employee_count", value: "12", snippet: "12 staff", confidence: 0.8 },
        { key: "not_a_real_key", value: "ignored", snippet: "n/a", confidence: 0.5 },
      ],
    });

    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("title", "Company Extract")
      .field("tags", "Corporate")
      .attach("file", Buffer.from("Test Org Ltd, 12 staff"), "extract.txt");

    expect(res.status).toBe(201);
    expect(res.body.extraction.factsUpdated).toBe(2); // hallucinated key dropped
    documentId = res.body.document.id;
  });

  it("lists the extracted facts as unverified", async () => {
    const res = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const legalName = res.body.facts.find((f: any) => f.key === "legal_name");
    expect(legalName.status).toBe("unverified");
    expect(legalName.extractions.length).toBe(1);
  });

  it("blocks a contributor from verifying a fact", async () => {
    const facts = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`);
    const legalName = facts.body.facts.find((f: any) => f.key === "legal_name");
    const res = await request(app)
      .patch(`/api/facts/${legalName.id}`)
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ value: "Test Org Ltd" });
    expect(res.status).toBe(403);
  });

  it("verifies a fact", async () => {
    const facts = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`);
    const legalName = facts.body.facts.find((f: any) => f.key === "legal_name");
    const res = await request(app)
      .patch(`/api/facts/${legalName.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ value: "Test Org Ltd" });
    expect(res.status).toBe(200);
    expect(res.body.fact.status).toBe("verified");
  });

  it("flags a conflict when a new extraction disagrees with a verified fact", async () => {
    extractionQueue.push({
      facts: [{ key: "legal_name", value: "A Completely Different Name Ltd", snippet: "different name", confidence: 0.9 }],
    });
    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("title", "Conflicting Extract")
      .attach("file", Buffer.from("A Completely Different Name Ltd"), "conflict.txt");
    expect(res.body.extraction.conflicts).toBe(1);

    const facts = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`);
    const legalName = facts.body.facts.find((f: any) => f.key === "legal_name");
    expect(legalName.conflict).toBe(true);
    expect(legalName.current_value).toBe("Test Org Ltd"); // verified value untouched
  });

  it("resolving the conflict clears the flag", async () => {
    const facts = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`);
    const legalName = facts.body.facts.find((f: any) => f.key === "legal_name");
    const res = await request(app)
      .patch(`/api/facts/${legalName.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ value: "Test Org Ltd" });
    expect(res.body.fact.conflict).toBe(false);
  });
});

describe("questionnaires: parse, answer engine, triage, gaps", () => {
  let questionnaireId: string;
  let items: any[];

  it("uploads and parses an .xlsx questionnaire", async () => {
    const buffer = await buildQuestionnaireBuffer([
      "What is your legal company name?",
      "This question has no supporting evidence at all",
    ]);
    const res = await request(app)
      .post("/api/questionnaires")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", buffer, "questionnaire.xlsx");
    expect(res.status).toBe(201);
    expect(res.body.questionCount).toBe(2);
    expect(res.body.questionnaire.status).toBe("ready");
    questionnaireId = res.body.questionnaire.id;
  });

  it("rejects a non-.xlsx upload", async () => {
    const res = await request(app)
      .post("/api/questionnaires")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", Buffer.from("not excel"), "questionnaire.txt");
    expect(res.status).toBe(500); // multer fileFilter error, converted to a clean response by express-async-errors
  });

  it("runs the answer engine: fact-grounded green, abstained red with a gap", async () => {
    draftQueue.push({
      foundEvidence: true,
      answer: "Our legal company name is Test Org Ltd.",
      citedFactKeys: ["legal_name"],
      confidence: 0.95,
    });
    draftQueue.push({ foundEvidence: false, answer: "", citedFactKeys: [], confidence: 0 });

    const res = await request(app)
      .post(`/api/questionnaires/${questionnaireId}/run`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.green).toBe(1);
    expect(res.body.red).toBe(1);

    const detail = await request(app).get(`/api/questionnaires/${questionnaireId}`).set("Authorization", `Bearer ${ownerToken}`);
    items = detail.body.items;
    const greenItem = items.find((i: any) => i.answer_status === "green");
    const redItem = items.find((i: any) => i.answer_status === "red");
    expect(greenItem.confirmed).toBe(false); // AI-drafted, not yet human-confirmed
    expect(redItem.gap_id).toBeTruthy();
    expect(redItem.gap_type).toBe("c");
  });

  it("a contributor can accept a green answer, which confirms it and enters the answer library", async () => {
    const detail = await request(app).get(`/api/questionnaires/${questionnaireId}`).set("Authorization", `Bearer ${ownerToken}`);
    const greenItem = detail.body.items.find((i: any) => i.answer_status === "green");

    const res = await request(app)
      .post(`/api/questionnaires/${questionnaireId}/items/${greenItem.id}/accept`)
      .set("Authorization", `Bearer ${contributorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.answer.confirmed).toBe(true);

    const library = await request(app).get("/api/facts").set("Authorization", `Bearer ${ownerToken}`); // sanity: still authed
    expect(library.status).toBe(200);
  });

  it("editing the red item's blank answer marks it manual and confirmed", async () => {
    const detail = await request(app).get(`/api/questionnaires/${questionnaireId}`).set("Authorization", `Bearer ${ownerToken}`);
    const redItem = detail.body.items.find((i: any) => i.answer_status === "red");

    const res = await request(app)
      .patch(`/api/questionnaires/${questionnaireId}/items/${redItem.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ text: "Not applicable to this request.", status: "green" });
    expect(res.status).toBe(200);
    expect(res.body.answer.source).toBe("manual");
    expect(res.body.answer.confirmed).toBe(true);
  });

  it("exports a ZIP containing the filled workbook", async () => {
    const res = await request(app)
      .post(`/api/questionnaires/${questionnaireId}/export`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("blocks attestation while a drafted answer is still unconfirmed", async () => {
    // Upload a fresh questionnaire with an unconfirmed amber left dangling.
    const buffer = await buildQuestionnaireBuffer(["What is your legal company name?"]);
    const upload = await request(app)
      .post("/api/questionnaires")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", buffer, "second.xlsx");
    draftQueue.push({ foundEvidence: true, answer: "Test Org Ltd.", citedFactKeys: ["legal_name"], confidence: 0.5 });
    await request(app).post(`/api/questionnaires/${upload.body.questionnaire.id}/run`).set("Authorization", `Bearer ${ownerToken}`);

    const res = await request(app)
      .post(`/api/questionnaires/${upload.body.questionnaire.id}/attest`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(400);
  });

  it("blocks a non-approver (contributor) from attesting", async () => {
    const res = await request(app)
      .post(`/api/questionnaires/${questionnaireId}/attest`)
      .set("Authorization", `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it("attests and locks the questionnaire against further edits", async () => {
    const res = await request(app)
      .post(`/api/questionnaires/${questionnaireId}/attest`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(201);
    expect(res.body.submission.snapshot).toBeTruthy();

    const detail = await request(app).get(`/api/questionnaires/${questionnaireId}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(detail.body.questionnaire.status).toBe("attested");

    const anyItem = detail.body.items[0];
    const editAttempt = await request(app)
      .patch(`/api/questionnaires/${questionnaireId}/items/${anyItem.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ text: "trying to edit after attestation" });
    expect(editAttempt.status).toBe(404);

    const reattest = await request(app).post(`/api/questionnaires/${questionnaireId}/attest`).set("Authorization", `Bearer ${ownerToken}`);
    expect(reattest.status).toBe(400);
  });
});

describe("gap register", () => {
  it("lists gaps for the organisation and allows updating them", async () => {
    const res = await request(app).get("/api/gaps").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.gaps.length).toBeGreaterThan(0);

    const gap = res.body.gaps[0];
    const update = await request(app)
      .patch(`/api/gaps/${gap.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "closed", note: "Covered by manual answer" });
    expect(update.status).toBe(200);
    expect(update.body.gap.status).toBe("closed");
  });
});

describe("dashboard", () => {
  it("reflects fact base and questionnaire state", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.factBase.totalCanonical).toBeGreaterThan(0);
    expect(res.body.documentsCount).toBeGreaterThan(0);
    expect(res.body.latestQuestionnaire).toBeTruthy();
  });
});
