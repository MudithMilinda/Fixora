const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');

const router = express.Router();
router.use(requireAuth);

const makeCode = (name) => name
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 32);

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'Your user is not assigned to a company.' });
    }
    const [branches, access] = await Promise.all([
      Branch.findAll({ where: { companyId: req.user.companyId }, order: [['name', 'ASC']] }),
      UserBranch.findAll({ where: { userId: req.user.id } }),
    ]);
    const accessibleBranchIds = new Set(access.map((row) => row.branchId));
    return res.json({
      success: true,
      branches: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        isActive: branch.isActive,
        hasAccess: accessibleBranchIds.has(branch.id),
        isCurrent: branch.id === req.user.activeBranchId,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  if (req.user.customRoleId) return res.status(403).json({ success: false, message: 'Administrator access required.' });
  const transaction = await Branch.sequelize.transaction();
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const codeInput = typeof req.body.code === 'string' ? req.body.code : name;
    const code = makeCode(codeInput);

    if (!req.user.companyId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Your user is not assigned to a company.' });
    }
    if (!name || !code) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Enter a branch name and a valid branch code.' });
    }

    const existing = await Branch.findOne({
      where: { companyId: req.user.companyId, code },
      transaction,
    });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'This branch code already exists.' });
    }

    const branch = await Branch.create({ companyId: req.user.companyId, name, code }, { transaction });
    await UserBranch.create({ userId: req.user.id, branchId: branch.id }, { transaction });
    await transaction.commit();
    return res.status(201).json({ success: true, branch: { id: branch.id, name: branch.name, code: branch.code } });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

module.exports = router;
