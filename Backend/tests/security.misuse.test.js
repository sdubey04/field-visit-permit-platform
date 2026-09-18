require("dotenv").config();

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db/database");

jest.setTimeout(15000);

describe("Security and misuse tests", () => {
  let officer1Token;
  let officer2Token;
  let approverToken;
  let adminToken;

  let officerVisitId;
  let approverVisitId;

  // ============================================================
  // LOGIN ALL TEST USERS
  // ============================================================

  beforeAll(async () => {
    const login = async (email, password) => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email,
          password,
        });

      expect(response.statusCode).toBe(200);

      return response.body.token;
    };

    officer1Token = await login(
      "fieldofficer1@eaii.org",
      "Officer1@123",
    );

    officer2Token = await login(
      "fieldofficer2@eaii.org",
      "Officer2@123",
    );

    approverToken = await login(
      "approver1@eaii.org",
      "Approver1@123",
    );

    adminToken = await login(
      "admin1@eaii.org",
      "Admin1@123",
    );

    // ==========================================================
    // CREATE A VISIT OWNED BY OFFICER 1
    // ==========================================================

    const officerVisit = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officer1Token}`,
      )
      .send({
        title: "Security Test Visit",
        purpose: "Testing cross-user access",
        location_id: 1,
        planned_date: "2026-10-10",
        estimated_cost: 2000,
      });

    expect(officerVisit.statusCode).toBe(201);

    officerVisitId = officerVisit.body.id;

    // ==========================================================
    // DIRECTLY CREATE AN APPROVER-OWNED PENDING VISIT
    //
    // This exists only to test the rule:
    // "An approver can never approve/reject their own visit."
    //
    // The normal API does not allow an approver to create visits.
    // ==========================================================

    const approverVisit = await pool.query(
      `
      INSERT INTO visits
      (
        title,
        purpose,
        location_id,
        planned_date,
        estimated_cost,
        status,
        created_by
      )
      VALUES
      (
        'Approver Ownership Test',
        'Testing self-approval protection',
        1,
        '2026-10-11',
        1500,
        'PENDING',
        3
      )
      RETURNING id
      `,
    );

    approverVisitId = approverVisit.rows[0].id;
  });

  // ============================================================
  // 1. UNAUTHENTICATED ACCESS
  // ============================================================

  test("Unauthenticated user cannot list visits", async () => {
    const response = await request(app)
      .get("/api/visits");

    expect(response.statusCode).toBe(401);
  });

  test("Unauthenticated user cannot get a visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${officerVisitId}`);

    expect(response.statusCode).toBe(401);
  });

  test("Unauthenticated user cannot access summary", async () => {
    const response = await request(app)
      .get("/api/summary");

    expect(response.statusCode).toBe(401);
  });

  // ============================================================
  // 2. WRONG ROLE ACCESS
  // ============================================================

  test("HQ approver cannot create a visit", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        title: "Unauthorized Visit",
        purpose: "Should not be created",
        location_id: 1,
        planned_date: "2026-10-12",
        estimated_cost: 1000,
      });

    expect(response.statusCode).toBe(403);
  });

  test("Admin cannot create a visit", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${adminToken}`,
      )
      .send({
        title: "Unauthorized Admin Visit",
        purpose: "Should not be created",
        location_id: 1,
        planned_date: "2026-10-12",
        estimated_cost: 1000,
      });

    expect(response.statusCode).toBe(403);
  });

  test("Field officer cannot access HQ summary", async () => {
    const response = await request(app)
      .get("/api/summary")
      .set(
        "Authorization",
        `Bearer ${officer1Token}`,
      );

    expect(response.statusCode).toBe(403);
  });

  // ============================================================
  // 3. CROSS-USER ACCESS
  // ============================================================

  test("Officer 2 cannot view Officer 1's visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${officerVisitId}`)
      .set(
        "Authorization",
        `Bearer ${officer2Token}`,
      );

    expect(response.statusCode).toBe(403);
  });

  test("Officer 2 cannot edit Officer 1's visit", async () => {
    const response = await request(app)
      .put(`/api/visits/${officerVisitId}`)
      .set(
        "Authorization",
        `Bearer ${officer2Token}`,
      )
      .send({
        estimated_cost: 9999,
      });

    expect(response.statusCode).toBe(403);
  });

  test("Officer 2 cannot submit Officer 1's visit", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${officerVisitId}/submit`,
      )
      .set(
        "Authorization",
        `Bearer ${officer2Token}`,
      );

    expect(response.statusCode).toBe(403);
  });

  test("Officer 2 cannot complete Officer 1's visit", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${officerVisitId}/complete`,
      )
      .set(
        "Authorization",
        `Bearer ${officer2Token}`,
      );

    expect(response.statusCode).toBe(403);
  });

  // ============================================================
  // 4. APPROVER CANNOT APPROVE OWN VISIT
  // ============================================================

  test("Approver cannot approve their own visit", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${approverVisitId}/decision`,
      )
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "APPROVED",
        remark: "Trying to approve own visit",
      });

    expect(response.statusCode).toBe(403);
  });

  test("Approver cannot reject their own visit", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${approverVisitId}/decision`,
      )
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "REJECTED",
        remark: "Trying to reject own visit",
      });

    expect(response.statusCode).toBe(403);
  });

  // ============================================================
  // 5. INVALID LIFECYCLE TRANSITIONS
  // ============================================================

  test("DRAFT visit cannot be completed", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${officerVisitId}/complete`,
      )
      .set(
        "Authorization",
        `Bearer ${officer1Token}`,
      );

    expect(response.statusCode).toBe(400);
  });

  test("DRAFT visit cannot be approved", async () => {
    const response = await request(app)
      .post(
        `/api/visits/${officerVisitId}/decision`,
      )
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "APPROVED",
      });

    expect(response.statusCode).toBe(400);
  });

  test("Rejection without remark is rejected", async () => {
    // First submit the visit so it becomes PENDING.
    const submitResponse = await request(app)
      .post(
        `/api/visits/${officerVisitId}/submit`,
      )
      .set(
        "Authorization",
        `Bearer ${officer1Token}`,
      );

    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.body.status).toBe(
      "PENDING",
    );

    // Then attempt rejection without a remark.
    const response = await request(app)
      .post(
        `/api/visits/${officerVisitId}/decision`,
      )
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "REJECTED",
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 6. ADMIN ACCESS
  // ============================================================

  test("Admin can view another user's visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${officerVisitId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`,
      );

    expect(response.statusCode).toBe(200);
  });

  test("Admin can access HQ summary", async () => {
    const response = await request(app)
      .get("/api/summary")
      .set(
        "Authorization",
        `Bearer ${adminToken}`,
      );

    expect(response.statusCode).toBe(200);
  });

  // ============================================================
  // CLEAN TEST DATA
  // ============================================================

  afterAll(async () => {
    await pool.query(
      `
      DELETE FROM approval_decisions
      WHERE visit_id IN ($1, $2)
      `,
      [officerVisitId, approverVisitId],
    );

    await pool.query(
      `
      DELETE FROM visits
      WHERE id IN ($1, $2)
      `,
      [officerVisitId, approverVisitId],
    );

    await pool.end();
  });
});