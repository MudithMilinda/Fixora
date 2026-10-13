require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { initializeDatabase } = require("./config/database");
require("./models/User");

const app = express();
const frontendOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://localhost:5174"]),
  ].filter(Boolean),
);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || frontendOrigins.has(origin));
    },
  }),
);

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fixora API is running",
    database: "connected",
  });
});

const port = Number(process.env.PORT) || 4000;

async function startServer() {
  await initializeDatabase();
  console.log("MySQL connection established and models synchronized.");

  return app.listen(port, () => {
    console.log(`Fixora API listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(
      "Backend startup failed. Check the MySQL service and DB_* values in .env.",
    );
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = app;
