const completedStatuses = ['Delivered', 'Closed'];
function localDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = name => parts.find(value => value.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function warrantyDates(days, now = new Date()) {
  if (!Number.isInteger(days) || days < 0 || days > 3650) throw Object.assign(new Error('Enter a warranty period from 0 to 3650 days.'), { status: 400 });
  if (!days) return { warrantyDays: 0, warrantyStart: null, warrantyEnd: null };
  const start = localDay(now), date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days - 1);
  return { warrantyDays: days, warrantyStart: start, warrantyEnd: date.toISOString().slice(0, 10) };
}
function warrantyPeriodDates(count, unit, now = new Date()) {
  const limits = { days: 3650, months: 120, years: 10 };
  if (!Object.hasOwn(limits, unit) || !Number.isInteger(count) || count < 0 || count > limits[unit]) throw Object.assign(new Error('Enter a valid warranty period.'), { status: 400 });
  if (unit === 'days') return warrantyDates(count, now);
  if (!count) return { warrantyDays: 0, warrantyStart: null, warrantyEnd: null };
  const start = localDay(now), date = new Date(`${start}T00:00:00Z`);
  const months = unit === 'years' ? count * 12 : count;
  const originalDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(originalDay, lastDay));
  const days = Math.round((target.getTime() - date.getTime()) / 86400000);
  target.setUTCDate(target.getUTCDate() - 1);
  return { warrantyDays: days, warrantyStart: start, warrantyEnd: target.toISOString().slice(0, 10) };
}
function warrantyStatus(job, now = new Date()) {
  if (job.warrantyDays == null) return 'not_recorded';
  if (!job.warrantyDays) return 'none';
  const today = localDay(now);
  if (!job.warrantyStart || !job.warrantyEnd) return 'not_recorded';
  return today < job.warrantyStart ? 'not_started' : today <= job.warrantyEnd ? 'active' : 'expired';
}
module.exports = { completedStatuses, localDay, warrantyDates, warrantyPeriodDates, warrantyStatus };
