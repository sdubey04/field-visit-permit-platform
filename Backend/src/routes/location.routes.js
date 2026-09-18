const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { getLocations } = require("../controllers/location.controller");

const router = express.Router();

router.get("/", authenticate, getLocations);

module.exports = router;