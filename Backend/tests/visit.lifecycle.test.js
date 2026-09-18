require("dotenv").config();

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db/database");

jest.setTimeout(15000);

describe("Visit lifecycle and authorization", () => {
  let officerToken;
  let officer2Token;
  let approverToken;
  let adminToken;

  let visitId;
  let draftVisitId;

  beforeAll(async () => {
    const login = async (email, password) => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

      expect(response.statusCode).toBe(200);

      return response.body.token;
    };

    officerToken = await login(
      "fieldofficer1@eaii.org",
      "Officer1@123"
    );

    officer2Token = await login(
      "fieldofficer2@eaii.org",
      "Officer2@123"
    );

    approverToken = await login(
      "approver1@eaii.org",
      "Approver1@123"
    );

    adminToken = await login(
      "admin1@eaii.org",
      "Admin1@123"
    );

    // Create test visit
    const visitResponse = await request(app)
      .post("/api/visits")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        title: "Automated Test Visit",
        purpose: "Testing visit lifecycle",
        location_id: 1,
        planned_date: "2026-10-01",
        estimated_cost: 1000
      });

    expect(visitResponse.statusCode).toBe(201);
    visitId = visitResponse.body.id;

    // Create another draft visit
    const draftResponse = await request(app)
      .post("/api/visits")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        title: "Draft Access Test",
        purpose: "Testing role-based access",
        location_id: 2,
        planned_date: "2026-10-02",
        estimated_cost: 1500
      });

    expect(draftResponse.statusCode).toBe(201);
    draftVisitId = draftResponse.body.id;
  });

test("HQ approver cannot create a visit", async () => {
  const response = await request(app)
    .post("/api/visits")
    .set("Authorization", `Bearer ${approverToken}`)
    .send({
      title: "Unauthorized Visit",
      purpose: "Testing creation authorization",
      location_id: 1,
      planned_date: "2026-10-05",
      estimated_cost: 1000
    });

  expect(response.statusCode).toBe(403);
});


  test("Officer 2 cannot view Officer 1's visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${visitId}`)
      .set("Authorization", `Bearer ${officer2Token}`);

    expect(response.statusCode).toBe(403);
  });

  test("HQ approver cannot view a DRAFT visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${draftVisitId}`)
      .set("Authorization", `Bearer ${approverToken}`);

    expect(response.statusCode).toBe(403);
  });

  test("Admin can view a DRAFT visit", async () => {
    const response = await request(app)
      .get(`/api/visits/${draftVisitId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
  });

  test("Officer can submit DRAFT visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/submit`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("PENDING");
  });

  test("Field officer cannot approve a visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        decision: "APPROVED",
        remark: "Trying to approve"
      });

    expect(response.statusCode).toBe(403);
  });

  test("Rejection without remark is rejected", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({
        decision: "REJECTED"
      });

    expect(response.statusCode).toBe(400);
  });

  test("HQ approver can reject PENDING visit with remark", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({
        decision: "REJECTED",
        remark: "Please revise the visit details."
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("REJECTED");
  });

  test("Rejected visit cannot be approved directly", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({
        decision: "APPROVED",
        remark: "Invalid transition"
      });

    expect(response.statusCode).toBe(400);
  });

  test("Creator can edit a REJECTED visit", async () => {
    const response = await request(app)
      .put(`/api/visits/${visitId}`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        estimated_cost: 1200
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.estimated_cost).toBe("1200.00");
  });

  test("Creator can resubmit a REJECTED visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/submit`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("PENDING");
  });

  test("HQ approver can approve PENDING visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({
        decision: "APPROVED",
        remark: "Approved after revision."
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("APPROVED");
  });

  test("Creator can complete APPROVED visit", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/complete`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("COMPLETED");
  });

  test("Completed visit cannot be submitted again", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/submit`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(400);
  });

  test("Completed visit cannot be completed again", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/complete`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(400);
  });

  test("Completed visit cannot be approved or rejected", async () => {
    const response = await request(app)
      .post(`/api/visits/${visitId}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({
        decision: "APPROVED",
        remark: "Invalid transition"
      });

    expect(response.statusCode).toBe(400);
  });

  afterAll(async () => {
    // Remove only the visits created by this test suite
    await pool.query(
      "DELETE FROM approval_decisions WHERE visit_id IN ($1, $2)",
      [visitId, draftVisitId]
    );

    await pool.query(
      "DELETE FROM visits WHERE id IN ($1, $2)",
      [visitId, draftVisitId]
    );

    await pool.end();
  });
});