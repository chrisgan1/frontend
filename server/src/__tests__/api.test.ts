import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { pool } from "../db/pool.js";

let adminToken: string;
let auditorToken: string;
let frameworkKey: string;
let controlId: string;

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

  frameworkKey = "test-framework";
  await pool.query(
    `INSERT INTO frameworks (key, name) VALUES ($1, 'Test Framework') ON CONFLICT DO NOTHING`,
    [frameworkKey],
  );
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
  it("allows admin to create a control", async () => {
    const res = await request(app)
      .post("/api/controls")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        frameworkKey,
        code: "TST-01",
        title: "Test control",
        category: "Testing",
        profileLevel: "low",
      });
    expect(res.status).toBe(201);
    controlId = res.body.control.id;
  });

  it("blocks an auditor (read-only role) from creating a control", async () => {
    const res = await request(app)
      .post("/api/controls")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({
        frameworkKey,
        code: "TST-02",
        title: "Should be blocked",
        category: "Testing",
        profileLevel: "low",
      });
    expect(res.status).toBe(403);
  });

  it("allows an auditor to read controls", async () => {
    const res = await request(app)
      .get("/api/controls")
      .set("Authorization", `Bearer ${auditorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.controls)).toBe(true);
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/controls");
    expect(res.status).toBe(401);
  });
});

describe("evidence-to-control mapping", () => {
  it("uploads evidence and maps it to a control", async () => {
    const uploadRes = await request(app)
      .post("/api/evidence")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Test evidence")
      .field("controlIds", controlId)
      .attach("file", Buffer.from("evidence contents"), "evidence.txt");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.evidence.title).toBe("Test evidence");

    const controlRes = await request(app)
      .get(`/api/controls/${controlId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(controlRes.status).toBe(200);
    expect(controlRes.body.evidence).toHaveLength(1);
    expect(controlRes.body.evidence[0].title).toBe("Test evidence");
  });
});
