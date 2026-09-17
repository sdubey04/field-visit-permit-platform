const pool = require("../db/database");

const getSummary = async (req, res) => {
  try {
    const statusResult = await pool.query(`
      SELECT
        status,
        COUNT(*)::int AS count
      FROM visits
      GROUP BY status
      ORDER BY status
    `);

    const locationResult = await pool.query(`
      SELECT
        l.id AS location_id,
        l.name AS location_name,
        COUNT(v.id)::int AS visit_count,
        COALESCE(SUM(v.estimated_cost), 0)::numeric(12,2) AS total_planned_cost
      FROM locations l
      LEFT JOIN visits v ON v.location_id = l.id
      GROUP BY l.id, l.name
      ORDER BY l.name
    `);

    return res.json({
      counts_by_status: statusResult.rows,
      by_location: locationResult.rows,
    });
  } catch (error) {
    console.error("Summary error:", error);

    return res.status(500).json({
      message: "Failed to generate summary",
    });
  }
};

module.exports = {
  getSummary,
};