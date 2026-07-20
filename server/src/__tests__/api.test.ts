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

describe("supplier pack generation", () => {
  it("generates a downloadable ZIP and logs the generation", async () => {
    const before = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${adminToken}`);
    const countBefore = before.body.supplierPacksGenerated;

    const res = await request(app)
      .post("/api/supplier-pack/generate")
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

    const after = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${adminToken}`);
    expect(after.body.supplierPacksGenerated).toBe(countBefore + 1);
  });
});
