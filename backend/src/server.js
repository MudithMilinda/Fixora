require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { initializeDatabase } = require("./config/database");
const { seedInitialAdmin, seedInitialSuperAdmin } = require("./services/seedAdmin");
const authRoutes = require("./routes/auth");
const repairRoutes = require("./routes/repairs");
const itemRoutes = require("./routes/items");
const stockRoutes = require("./routes/stocks");
const stockRequestRoutes = require("./routes/stockRequests");
const usersRoutes = require('./routes/users');
const stockMovementRoutes = require('./routes/stockMovements');
const salesRoutes = require('./routes/sales');
const warrantyClaimRoutes = require('./routes/warrantyClaims');
const supplierReturnRoutes = require('./routes/supplierReturns');
const reportsRoutes = require('./routes/reports');
const branchRoutes = require("./routes/branches");
const supplierRoutes = require("./routes/suppliers");
const quotationRoutes = require("./routes/quotations");
const { router: purchaseOrderRoutes } = require("./routes/purchaseOrders");
const companySettingsRoutes = require("./routes/companySettings");
const technicianRoutes = require("./routes/technicians");
require("./models/User");
require("./models/RepairJob");
require("./models/Item");
require("./models/Stock");
require("./models/StockRequest");
require("./models/Company");
require("./models/Branch");
require("./models/UserBranch");
require("./models/Role");
require("./models/Supplier");
require("./models/Quotation");
require("./models/PurchaseOrder");
require("./models/Technician");

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
    credentials: true,
  }),
);

app.use('/api/company-settings', express.json({ limit: '2mb' }));
app.use('/api/quotations', express.json({ limit: '3mb' }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fixora API is running",
    database: "connected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/stock-movements", stockMovementRoutes);
app.use("/api/stock-requests", stockRequestRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/warranty-claims", warrantyClaimRoutes);
app.use("/api/supplier-returns", supplierReturnRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/company-settings", companySettingsRoutes);
app.use("/api/technicians", technicianRoutes);

const port = Number(process.env.PORT) || 4000;

async function startServer() {
  await initializeDatabase();
  await seedInitialAdmin();
  await seedInitialSuperAdmin();
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
