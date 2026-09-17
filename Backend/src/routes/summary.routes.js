const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const { getSummary } = require("../controllers/summary.controller");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("HQ_APPROVER", "ADMIN"),
  getSummary
);

module.exports = router;