import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";

let adminToken: string;
let auditorToken: string;
let documentId: string;

beforeAll(async () => {
  const admin = await request(app).post("/api/auth/register").send({
    email: "admin@example.com",
    password: "password123",
    name: "Admin User",
    role: "admin",
  });
  adminToken = admin.body.token;

  const auditor = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email: "auditor@example.com",
      password: "password123",
      name: "Auditor User",
      role: "auditor",
    });
  auditorToken = auditor.body.token;
});

describe("auth", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });

  it("rejects incorrect credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});

describe("RBAC", () => {
  it("blocks an auditor (read-only role) from adding a certification", async () => {
    const res = await request(app)
      .post("/api/certifications")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({ name: "Should be blocked", validUntil: "2030-01-01" });
    expect(res.status).toBe(403);
  });

  it("allows an auditor to read certifications", async () => {
    const res = await request(app).get("/api/certifications").set("Authorization", `Bearer ${auditorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.certifications)).toBe(true);
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/certifications");
    expect(res.status).toBe(401);
  });
});

describe("document vault", () => {
  it("uploads a document with tags", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Test Certificate")
      .field("tags", "Security")
      .field("tags", "Quality")
      .attach("file", Buffer.from("certificate contents"), "cert.txt");

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe("Test Certificate");
    expect(res.body.document.tags).toEqual(["Security", "Quality"]);
    documentId = res.body.document.id;
  });

  it("rejects a tag outside the allowed set", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Bad tag doc")
      .field("tags", "NotARealTag")
      .attach("file", Buffer.from("x"), "bad.txt");
    expect(res.status).toBe(400);
  });

  it("filters documents by tag", async () => {
    const res = await request(app)
      .get("/api/documents?tag=Security")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.documents.some((d: any) => d.id === documentId)).toBe(true);
  });
});

describe("certifications", () => {
  it("computes expiring_soon status within 45 days", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const res = await request(app)
      .post("/api/certifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Insurance", validUntil: soon.toISOString().slice(0, 10), documentId });
    expect(res.status).toBe(201);
    expect(res.body.certification.status).toBe("expiring_soon");
  });

  it("computes valid status for a far-future date", async () => {
    const res = await request(app)
      .post("/api/certifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "ISO 27001", validUntil: "2099-01-01" });
    expect(res.status).toBe(201);
    expect(res.body.certification.status).toBe("valid");
  });
});

describe("clearance tracking and project matching", () => {
  it("creates employees with different clearance levels", async () => {
    const scEmployee = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "SC Employee", bpssCleared: true, scStatus: "granted", scExpiry: "2099-01-01" });
    expect(scEmployee.status).toBe(201);

    const bpssOnly = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "BPSS Only Employee", bpssCleared: true, scStatus: "none" });
    expect(bpssOnly.status).toBe(201);
  });

  it("matches only SC-and-above cleared staff to an SC-restricted project", async () => {
    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Restricted Project", requiredClearance: "sc" });
    expect(project.status).toBe(201);

    const eligible = await request(app)
      .get(`/api/projects/${project.body.project.id}/eligible-employees`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(eligible.status).toBe(200);
    const names = eligible.body.eligibleEmployees.map((e: any) => e.name);
    expect(names).toContain("SC Employee");
    expect(names).not.toContain("BPSS Only Employee");
  });
});

describe("compliance passport", () => {
  it("adds a confirmed passport entry", async () => {
    const res = await request(app)
      .post("/api/passport")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        topic: "Security",
        question: "Do you hold Cyber Essentials Plus certification?",
        answer: "Yes, valid until June 2027.",
      });
    expect(res.status).toBe(201);
    expect(res.body.entry.status).toBe("confirmed");
  });

  it("blocks an auditor from adding a passport entry", async () => {
    const res = await request(app)
      .post("/api/passport")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({ topic: "Security", question: "Should be blocked?", answer: "n/a" });
    expect(res.status).toBe(403);
  });
});

describe("requests: matching an incoming questionnaire to the passport", () => {
  let requestId: string;

  it("creates a request", async () => {
    const res = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ requesterName: "Test Prime Ltd" });
    expect(res.status).toBe(201);
    requestId = res.body.request.id;
  });

  it("suggests a passport match for a differently-worded question", async () => {
    const res = await request(app)
      .post(`/api/requests/${requestId}/items`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        questions: [
          "Please confirm if you hold Cyber Essentials Plus certification",
          "What is your company's favourite colour scheme for branding purposes",
        ],
      });
    expect(res.status).toBe(201);
    const [strongMatch, noMatch] = res.body.items;
    expect(strongMatch.status).toBe("suggested");
    expect(strongMatch.suggested_question).toContain("Cyber Essentials Plus");
    expect(noMatch.status).toBe("unmatched");
  });

  it("confirms a suggested match and reflects it in the request detail", async () => {
    const detail = await request(app)
      .get(`/api/requests/${requestId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const item = detail.body.items.find((i: any) => i.status === "suggested");

    const confirm = await request(app)
      .patch(`/api/requests/${requestId}/items/${item.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ matchedQaEntryId: item.suggested_qa_entry_id });
    expect(confirm.status).toBe(200);
    expect(confirm.body.item.status).toBe("confirmed");
  });

  it("blocks an auditor from requesting an AI draft", async () => {
    const detail = await request(app)
      .get(`/api/requests/${requestId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const item = detail.body.items.find((i: any) => i.status === "unmatched");

    const res = await request(app)
      .post(`/api/requests/${requestId}/items/${item.id}/draft`)
      .set("Authorization", `Bearer ${auditorToken}`);
    expect(res.status).toBe(403);
  });

  it("fails clearly (not a crash) when no AI provider is configured", async () => {
    // This test environment has no ANTHROPIC_API_KEY set, which is the real
    // out-of-the-box state for anyone who hasn't configured the feature —
    // it should degrade to a clear error, not a 500 or an unhandled crash.
    const detail = await request(app)
      .get(`/api/requests/${requestId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const item = detail.body.items.find((i: any) => i.status === "unmatched");

    const res = await request(app)
      .post(`/api/requests/${requestId}/items/${item.id}/draft`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(502);
    expect(typeof res.body.error).toBe("string");
  });

  it("writes a custom answer for an unmatched item", async () => {
    const detail = await request(app)
      .get(`/api/requests/${requestId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const item = detail.body.items.find((i: any) => i.status === "unmatched");

    const confirm = await request(app)
      .patch(`/api/requests/${requestId}/items/${item.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customAnswer: "Not applicable to this request." });
    expect(confirm.status).toBe(200);
    expect(confirm.body.item.custom_answer).toBe("Not applicable to this request.");
  });

  it("exports the request as a ZIP and logs it, moving status to submitted", async () => {
    const res = await request(app)
      .post(`/api/requests/${requestId}/export`)
      .set("Authorization", `Bearer ${adminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const detail = await request(app)
      .get(`/api/requests/${requestId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.request.status).toBe("submitted");
  });
});
