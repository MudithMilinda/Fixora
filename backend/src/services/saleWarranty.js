const { warrantyPeriodDates } = require('./repairWarranty');
const bad = message => Object.assign(new Error(message), { status: 400 });
function saleWarranty(input, quantity, now = new Date()) {
  // Older API clients do not send warranty information; preserve that distinction.
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('Enter valid warranty details.');
  const { count, unit, numbers } = input;
  const dates = warrantyPeriodDates(count, unit, now);
  if (!Array.isArray(numbers) || numbers.length > quantity || numbers.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 120)) throw bad('Enter at most one valid serial or warranty number per unit.');
  const cleaned = numbers.map(value => value.trim());
  return { count, unit, start: dates.warrantyStart, end: dates.warrantyEnd, numbers: cleaned };
}
module.exports = { saleWarranty };
