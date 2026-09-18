require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const authenticate = require("./middleware/auth.middleware");
const authorize = require("./middleware/authorize.middleware");
const visitRoutes = require("./routes/visit.routes");
const summaryRoutes = require("./routes/summary.routes");
const locationRoutes = require("./routes/location.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/visits", visitRoutes);

app.use("/api/summary", summaryRoutes);

app.use("/api/locations", locationRoutes);

app.get("/", authenticate,(req, res) => {
  res.json({ message: "Field Visit API is running" });
});

//Created only for testing purpose during the development

// app.get("/api/protected", authenticate, (req, res) => {
//   res.json({
//     message: "You are authenticated",
//     user: req.user,
//   });
// });

// app.get(
//   "/api/officer-test",
//   authenticate,
//   authorize("FIELD_OFFICER"),
//   (req, res) => {
//     res.json({ message: "Officer access granted" });
//   }
// );

// app.get(
//   "/api/hq-test",
//   authenticate,
//   authorize("HQ_APPROVER", "ADMIN"),
//   (req, res) => {
//     res.json({ message: "HQ access granted" });
//   }
// );

// app.get(
//   "/api/admin-test",
//   authenticate,
//   authorize("ADMIN"),
//   (req, res) => {
//     res.json({ message: "Admin access granted" });
//   }
// );

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

module.exports = app;