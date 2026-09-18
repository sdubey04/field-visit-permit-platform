const pool = require("../db/database");

const getLocations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        address
      FROM locations
      ORDER BY name
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Get locations error:", error);

    return res.status(500).json({
      message: "Failed to fetch locations",
    });
  }
};

module.exports = {
  getLocations,
};