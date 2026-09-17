const validateVisit = (req, res, next) => {
  const {
    title,
    purpose,
    location_id,
    planned_date,
    estimated_cost,
  } = req.body;

  if (title !== undefined && (!String(title).trim() || String(title).length > 200)) {
    return res.status(400).json({
      message: "Title must be between 1 and 200 characters",
    });
  }

  if (purpose !== undefined && !String(purpose).trim()) {
    return res.status(400).json({
      message: "Purpose cannot be empty",
    });
  }

  if (
    location_id !== undefined &&
    (!Number.isInteger(Number(location_id)) || Number(location_id) <= 0)
  ) {
    return res.status(400).json({
      message: "Invalid location_id",
    });
  }

  if (planned_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(planned_date)) {
    return res.status(400).json({
      message: "planned_date must be in YYYY-MM-DD format",
    });
  }

  if (
    estimated_cost !== undefined &&
    (Number.isNaN(Number(estimated_cost)) || Number(estimated_cost) < 0)
  ) {
    return res.status(400).json({
      message: "estimated_cost must be a non-negative number",
    });
  }

  next();
};

module.exports = validateVisit;