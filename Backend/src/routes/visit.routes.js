const express = require("express");
const authenticate = require("../middleware/auth.middleware");

const validateVisit = require("../middleware/validate.middleware");


const authorize = require("../middleware/authorize.middleware");


const {
  createVisit,
  listVisits,
  getVisitById,
  updateVisit,
  submitVisit,
  decideVisit,
  completeVisit,
} = require("../controllers/visit.controller");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize("FIELD_OFFICER"),
  validateVisit,
  createVisit
);
router.get("/", listVisits);
router.get("/:id", getVisitById);

router.put("/:id", validateVisit, updateVisit);
router.post("/:id/submit", submitVisit);
router.post("/:id/decision", decideVisit);
router.post("/:id/complete", completeVisit);

module.exports = router;