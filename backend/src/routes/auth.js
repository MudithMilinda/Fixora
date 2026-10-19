const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Branch = require("../models/Branch");
const UserBranch = require("../models/UserBranch");
const { cookieOptions, createSessionToken } = require("../config/auth");
const { requireAuth } = require("../middleware/requireAuth");
const { effective } = require("../services/permissions");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

async function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, customRoleId: user.customRoleId, companyId: user.companyId, activeBranchId: user.activeBranchId, permissions: await effective(user) };
}

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password || email.length > 254 || password.length > 1024) {
      return res.status(400).json({ success: false, message: "Enter a valid email address and password." });
    }

    const user = await User.findOne({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !user.isActive || !passwordMatches) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    res.cookie("fixora_session", createSessionToken(user), cookieOptions);
    return res.status(200).json({ success: true, user: await publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try { res.status(200).json({ success: true, user: await publicUser(req.user) }); } catch (error) { next(error); }
});

router.get('/branches', requireAuth, async (req,res,next) => { try { const access=await UserBranch.findAll({where:{userId:req.user.id}}); const branchIds=access.map(row=>row.branchId); const branches=await Branch.findAll({where:{id:branchIds,isActive:true},order:[['name','ASC']]}); res.json({success:true,branches:branches.map(branch=>({id:branch.id,name:branch.name,code:branch.code}))}); } catch(error){next(error)} });
router.patch('/active-branch', requireAuth, async (req,res,next) => { try { const branchId=typeof req.body.branchId==='string'?req.body.branchId:''; const access=await UserBranch.findOne({where:{userId:req.user.id,branchId}}); if(!access)return res.status(403).json({success:false,message:'You do not have access to this branch.'}); await req.user.update({activeBranchId:branchId}); return res.json({success:true,user:await publicUser(req.user)}); } catch(error){next(error)} });

router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim().replace(/\s+/g, " ") : "";

    if (fullName.length < 2 || fullName.length > 120) {
      return res.status(400).json({ success: false, message: "Enter a name between 2 and 120 characters." });
    }

    await req.user.update({ fullName });
    return res.status(200).json({ success: true, message: "Profile saved.", user: await publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Enter your current and new password." });
    }
    if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Use at least 12 characters, including uppercase, lowercase, and a number." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "Your new password must be different from the current password." });
    }
    if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Your current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.update({
      passwordHash,
      sessionVersion: req.user.sessionVersion + 1,
    });

    // The new cookie keeps this browser signed in; all older sessions now fail
    // the session-version check in requireAuth.
    res.cookie("fixora_session", createSessionToken(req.user), cookieOptions);
    return res.status(200).json({ success: true, message: "Your password has been updated." });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("fixora_session", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  res.status(204).end();
});

module.exports = router;
