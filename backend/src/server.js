require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

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
  });
});

const port = Number(process.env.PORT) || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Fixora API listening on http://localhost:${port}`);
  });
}

module.exports = app;
