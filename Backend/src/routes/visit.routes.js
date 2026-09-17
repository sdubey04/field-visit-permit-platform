const express = require("express");
const authenticate = require("../middleware/auth.middleware");

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

router.post("/", createVisit);
router.get("/", listVisits);
router.get("/:id", getVisitById);

router.put("/:id", updateVisit);
router.post("/:id/submit", submitVisit);
router.post("/:id/decision", decideVisit);
router.post("/:id/complete", completeVisit);

module.exports = router;