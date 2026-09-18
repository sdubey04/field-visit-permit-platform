require("dotenv").config();

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db/database");

jest.setTimeout(15000);

describe("API edge cases and misuse", () => {
  let officerToken;
  let approverToken;

  let testVisitId;

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

    officerToken = await login(
      "fieldofficer1@eaii.org",
      "Officer1@123",
    );

    approverToken = await login(
      "approver1@eaii.org",
      "Approver1@123",
    );
  });

  // ============================================================
  // 1. MALFORMED TOKEN
  // ============================================================

  test("Malformed JWT is rejected", async () => {
    const response = await request(app)
      .get("/api/visits")
      .set("Authorization", "Bearer this-is-not-a-valid-jwt");

    expect(response.statusCode).toBe(401);
  });

  // ============================================================
  // 2. INVALID VISIT ID
  // ============================================================

  test("Invalid visit ID is rejected", async () => {
    const response = await request(app)
      .get("/api/visits/not-a-number")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      );

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 3. INVALID LOCATION
  // ============================================================

  test("Non-existent location is rejected", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      )
      .send({
        title: "Invalid Location Test",
        purpose: "Testing location validation",
        location_id: 999999,
        planned_date: "2026-10-20",
        estimated_cost: 1000,
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 4. NEGATIVE COST
  // ============================================================

  test("Negative estimated cost is rejected", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      )
      .send({
        title: "Negative Cost Test",
        purpose: "Testing cost validation",
        location_id: 1,
        planned_date: "2026-10-20",
        estimated_cost: -100,
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 5. BLANK TITLE
  // ============================================================

  test("Blank title is rejected", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      )
      .send({
        title: "   ",
        purpose: "Testing blank title",
        location_id: 1,
        planned_date: "2026-10-20",
        estimated_cost: 1000,
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 6. PROTECTED STATUS FIELD
  //
  // Client attempts to create an APPROVED visit.
  // Server must ignore the submitted status.
  // ============================================================

  test("Client cannot force a new visit to APPROVED", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      )
      .send({
        title: "Protected Status Test",
        purpose: "Testing status protection",
        location_id: 1,
        planned_date: "2026-10-21",
        estimated_cost: 1200,
        status: "APPROVED",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe("DRAFT");

    testVisitId = response.body.id;
  });

  // ============================================================
  // 7. PROTECTED created_by FIELD
  //
  // Client attempts to make another user the creator.
  // Server must use the authenticated user's ID.
  // ============================================================

  test("Client cannot change created_by", async () => {
    const response = await request(app)
      .post("/api/visits")
      .set(
        "Authorization",
        `Bearer ${officerToken}`,
      )
      .send({
        title: "Protected Owner Test",
        purpose: "Testing owner protection",
        location_id: 1,
        planned_date: "2026-10-22",
        estimated_cost: 1300,
        created_by: 999999,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.created_by).toBe(1);

    if (!testVisitId) {
      testVisitId = response.body.id;
    }
  });

  // ============================================================
  // 8. INVALID DECISION VALUE
  // ============================================================

  test("Invalid decision value is rejected", async () => {
    const response = await request(app)
      .post("/api/visits/1/decision")
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "COMPLETED",
        remark: "Invalid decision",
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 9. APPROVER CANNOT DECIDE ON DRAFT
  // ============================================================

  test("Approver cannot decide on a DRAFT visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${testVisitId}/decision`)
      .set(
        "Authorization",
        `Bearer ${approverToken}`,
      )
      .send({
        decision: "APPROVED",
        remark: "Should not be allowed",
      });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // 10. ROOT ENDPOINT MUST REQUIRE AUTHENTICATION
  //
  // Assignment says every endpoint except login requires auth.
  // This test may currently fail because "/" is public.
  // ============================================================

  test("Root endpoint requires authentication", async () => {
    const response = await request(app)
      .get("/");

    expect(response.statusCode).toBe(401);
  });

  // ============================================================
  // CLEANUP
  // ============================================================

  afterAll(async () => {
    if (testVisitId) {
      await pool.query(
        `
        DELETE FROM approval_decisions
        WHERE visit_id = $1
        `,
        [testVisitId],
      );

      await pool.query(
        `
        DELETE FROM visits
        WHERE id = $1
        `,
        [testVisitId],
      );
    }

    await pool.end();
  });
});