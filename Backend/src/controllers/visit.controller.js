const pool = require("../db/database");

// Create a new visit
const createVisit = async (req, res) => {
  try {
    const { title, purpose, location_id, planned_date, estimated_cost } = req.body;

    if (
      !title ||
      !purpose ||
      !location_id ||
      !planned_date ||
      estimated_cost === undefined
    ) {
      return res.status(400).json({
        message: "All visit fields are required",
      });
    }

    const locationResult = await pool.query(
      "SELECT id FROM locations WHERE id = $1",
      [location_id]
    );

    if (locationResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid location",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO visits
      (title, purpose, location_id, planned_date, estimated_cost, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        title,
        purpose,
        location_id,
        planned_date,
        estimated_cost,
        req.user.userId,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create visit error:", error);

    return res.status(500).json({
      message: "Failed to create visit",
    });
  }
};

// List visits
const listVisits = async (req, res) => {
  try {
    const { status, location_id, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );
    const offset = (pageNumber - 1) * limitNumber;

    const conditions = [];
    const values = [];

    if (req.user.role === "FIELD_OFFICER") {
      values.push(req.user.userId);
      conditions.push(`v.created_by = $${values.length}`);
    } else if (req.user.role === "HQ_APPROVER") {
      conditions.push(`v.status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')`);
    }

    if (status) {
      values.push(status);
      conditions.push(`v.status = $${values.length}`);
    }

    if (location_id) {
      values.push(location_id);
      conditions.push(`v.location_id = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    values.push(limitNumber);
    values.push(offset);

    const result = await pool.query(
      `
      SELECT
        v.*,
        l.name AS location_name,
        u.name AS created_by_name
      FROM visits v
      JOIN locations l ON l.id = v.location_id
      JOIN users u ON u.id = v.created_by
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    return res.json({
      page: pageNumber,
      limit: limitNumber,
      data: result.rows,
    });
  } catch (error) {
    console.error("List visits error:", error);

    return res.status(500).json({
      message: "Failed to fetch visits",
    });
  }
};

// Get one visit with decision history
const getVisitById = async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);

    if (Number.isNaN(visitId)) {
      return res.status(400).json({
        message: "Invalid visit ID",
      });
    }

    const visitResult = await pool.query(
      `
      SELECT
        v.*,
        l.name AS location_name,
        l.address AS location_address,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM visits v
      JOIN locations l ON l.id = v.location_id
      JOIN users u ON u.id = v.created_by
      WHERE v.id = $1
      `,
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({
        message: "Visit not found",
      });
    }

    const visit = visitResult.rows[0];

    // Field officer can only view their own visit
    if (
      req.user.role === "FIELD_OFFICER" &&
      visit.created_by !== req.user.userId
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    // HQ approver can view submitted visits, not drafts
    if (
      req.user.role === "HQ_APPROVER" &&
      visit.status === "DRAFT"
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const decisionResult = await pool.query(
      `
      SELECT
        ad.id,
        ad.decision,
        ad.remark,
        ad.created_at,
        u.name AS decided_by_name,
        u.email AS decided_by_email
      FROM approval_decisions ad
      JOIN users u ON u.id = ad.decided_by
      WHERE ad.visit_id = $1
      ORDER BY ad.created_at ASC
      `,
      [visitId]
    );

    return res.json({
      visit,
      decision_history: decisionResult.rows,
    });
  } catch (error) {
    console.error("Get visit error:", error);

    return res.status(500).json({
      message: "Failed to fetch visit",
    });
  }
};

// Update an editable visit
const updateVisit = async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);

    if (Number.isNaN(visitId)) {
      return res.status(400).json({ message: "Invalid visit ID" });
    }

    const visitResult = await pool.query(
      "SELECT * FROM visits WHERE id = $1",
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const visit = visitResult.rows[0];

    // Only the creator can edit
    if (
      req.user.role !== "FIELD_OFFICER" ||
      visit.created_by !== req.user.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only DRAFT and REJECTED visits are editable
    if (!["DRAFT", "REJECTED"].includes(visit.status)) {
      return res.status(400).json({
        message: "Visit can only be edited in DRAFT or REJECTED state",
      });
    }

    const {
      title,
      purpose,
      location_id,
      planned_date,
      estimated_cost,
    } = req.body;

    const fields = [];
    const values = [];

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }

      values.push(title);
      fields.push(`title = $${values.length}`);
    }

    if (purpose !== undefined) {
      if (!String(purpose).trim()) {
        return res.status(400).json({ message: "Purpose cannot be empty" });
      }

      values.push(purpose);
      fields.push(`purpose = $${values.length}`);
    }

    if (location_id !== undefined) {
      const locationResult = await pool.query(
        "SELECT id FROM locations WHERE id = $1",
        [location_id]
      );

      if (locationResult.rows.length === 0) {
        return res.status(400).json({ message: "Invalid location" });
      }

      values.push(location_id);
      fields.push(`location_id = $${values.length}`);
    }

    if (planned_date !== undefined) {
      if (!planned_date) {
        return res.status(400).json({
          message: "Planned date cannot be empty",
        });
      }

      values.push(planned_date);
      fields.push(`planned_date = $${values.length}`);
    }

    if (estimated_cost !== undefined) {
      if (Number(estimated_cost) < 0) {
        return res.status(400).json({
          message: "Estimated cost cannot be negative",
        });
      }

      values.push(estimated_cost);
      fields.push(`estimated_cost = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    values.push(visitId);

    const result = await pool.query(
      `
      UPDATE visits
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
      `,
      values
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update visit error:", error);

    return res.status(500).json({
      message: "Failed to update visit",
    });
  }
};


// Submit or resubmit a visit
const submitVisit = async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);

    if (Number.isNaN(visitId)) {
      return res.status(400).json({ message: "Invalid visit ID" });
    }

    const result = await pool.query(
      "SELECT * FROM visits WHERE id = $1",
      [visitId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const visit = result.rows[0];

    // Only creator can submit/resubmit
    if (
      req.user.role !== "FIELD_OFFICER" ||
      visit.created_by !== req.user.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!["DRAFT", "REJECTED"].includes(visit.status)) {
      return res.status(400).json({
        message: "Only DRAFT or REJECTED visits can be submitted",
      });
    }

    const updated = await pool.query(
      `
      UPDATE visits
      SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [visitId]
    );

    return res.json(updated.rows[0]);
  } catch (error) {
    console.error("Submit visit error:", error);

    return res.status(500).json({
      message: "Failed to submit visit",
    });
  }
};


// Approve or reject a pending visit
const decideVisit = async (req, res) => {
  const client = await pool.connect();

  try {
    const visitId = parseInt(req.params.id, 10);
    const { decision, remark } = req.body;

    if (Number.isNaN(visitId)) {
      return res.status(400).json({ message: "Invalid visit ID" });
    }

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({
        message: "Decision must be APPROVED or REJECTED",
      });
    }

    if (decision === "REJECTED" && !remark?.trim()) {
      return res.status(400).json({
        message: "Rejection remark is required",
      });
    }

    // Only HQ approver and admin can decide
    if (!["HQ_APPROVER", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    await client.query("BEGIN");

    const visitResult = await client.query(
      "SELECT * FROM visits WHERE id = $1 FOR UPDATE",
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Visit not found" });
    }

    const visit = visitResult.rows[0];

    if (visit.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Only PENDING visits can be approved or rejected",
      });
    }

    // Creator cannot approve/reject their own visit
    if (visit.created_by === req.user.userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Creator cannot approve or reject their own visit",
      });
    }

    await client.query(
      `
      INSERT INTO approval_decisions
      (visit_id, decided_by, decision, remark)
      VALUES ($1, $2, $3, $4)
      `,
      [visitId, req.user.userId, decision, remark || null]
    );

    const updated = await client.query(
      `
      UPDATE visits
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [decision, visitId]
    );

    await client.query("COMMIT");

    return res.json(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Decision error:", error);

    return res.status(500).json({
      message: "Failed to process decision",
    });
  } finally {
    client.release();
  }
};


// Complete an approved visit
const completeVisit = async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);

    if (Number.isNaN(visitId)) {
      return res.status(400).json({ message: "Invalid visit ID" });
    }

    const result = await pool.query(
      "SELECT * FROM visits WHERE id = $1",
      [visitId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const visit = result.rows[0];

    // Only creator can complete
    if (
      req.user.role !== "FIELD_OFFICER" ||
      visit.created_by !== req.user.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (visit.status !== "APPROVED") {
      return res.status(400).json({
        message: "Only APPROVED visits can be completed",
      });
    }

    const updated = await pool.query(
      `
      UPDATE visits
      SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [visitId]
    );

    return res.json(updated.rows[0]);
  } catch (error) {
    console.error("Complete visit error:", error);

    return res.status(500).json({
      message: "Failed to complete visit",
    });
  }
};

module.exports = {
  createVisit,
  listVisits,
  getVisitById,
  updateVisit,
  submitVisit,
  decideVisit,
  completeVisit,
};