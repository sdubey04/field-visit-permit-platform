require("dotenv").config();

const app = require("./app");
const pool = require("./db/database");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();