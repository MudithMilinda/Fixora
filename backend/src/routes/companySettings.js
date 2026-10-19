const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Company = require('../models/Company');
const CompanySettings = require('../models/CompanySettings');
const { validateCompanySettings, serializeCompanySettings } = require('../services/companySettings');

const router = express.Router();
router.use(requireAuth);
router.use((req, res, next) => {
  if (!req.user.companyId) return res.status(400).json({ message: 'Your account is not assigned to a company.' });
  return next();
});

router.get('/', async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.user.companyId);
    if (!company || !company.isActive) return res.status(404).json({ message: 'Company not found.' });
    const settings = await CompanySettings.findByPk(company.id);
    return res.json({ success: true, company: serializeCompanySettings(company, settings) });
  } catch (error) { next(error); }
});

router.put('/', async (req, res, next) => {
  if (!req.permissionsChecked && (req.user.customRoleId || !['admin', 'super_admin'].includes(req.user.role))) return res.status(403).json({ message: 'Only administrators can update company settings.' });
  let values;
  try { values = validateCompanySettings(req.body); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const result = await Company.sequelize.transaction(async (transaction) => {
      const company = await Company.findByPk(req.user.companyId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!company || !company.isActive) return null;
      const { name, ...settings } = values;
      await company.update({ name }, { transaction });
      await CompanySettings.upsert({ ...settings, companyId: company.id }, { transaction });
      return serializeCompanySettings(company, settings);
    });
    if (!result) return res.status(404).json({ message: 'Company not found.' });
    return res.json({ success: true, company: result });
  } catch (error) { next(error); }
});

module.exports = router;
