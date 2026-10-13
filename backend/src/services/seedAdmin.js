const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seedInitialAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || "admin@123";

  if (process.env.NODE_ENV === "production" && !process.env.INITIAL_ADMIN_PASSWORD) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be set in production before startup.");
  }

  const existingAdmin = await User.findOne({ where: { email } });
  if (existingAdmin) return existingAdmin;

  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({
    fullName: process.env.INITIAL_ADMIN_NAME || "Fixora Administrator",
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  });
}

async function seedInitialSuperAdmin() {
  const email = (process.env.INITIAL_SUPER_ADMIN_EMAIL || "superadmin@gmail.com").trim().toLowerCase();
  const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD || "super@000";

  if (process.env.NODE_ENV === "production" && !process.env.INITIAL_SUPER_ADMIN_PASSWORD) {
    throw new Error("INITIAL_SUPER_ADMIN_PASSWORD must be set in production before startup.");
  }

  const existingSuperAdmin = await User.findOne({ where: { email } });
  if (existingSuperAdmin) {
    if (existingSuperAdmin.role !== "super_admin") {
      await existingSuperAdmin.update({ role: "super_admin" });
    }
    return existingSuperAdmin;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({
    fullName: process.env.INITIAL_SUPER_ADMIN_NAME || "Super Admin",
    email,
    passwordHash,
    role: "super_admin",
    isActive: true,
  });
}

module.exports = { seedInitialAdmin, seedInitialSuperAdmin };
