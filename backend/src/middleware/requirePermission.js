function requirePermission(permission) {
  return (req, res, next) => {
    // Super Admin is the platform/developer-level role and is never limited by
    // company-level permission checks. Other roles will use granular RBAC here.
    if (req.user?.role === "super_admin") return next();
    return res.status(403).json({
      success: false,
      message: `Missing permission: ${permission}.`,
    });
  };
}

module.exports = { requirePermission };
