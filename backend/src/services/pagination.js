function pagination(query = {}) {
  if (query.page === undefined) return null;
  const page = Number(query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw Object.assign(new Error('Enter a valid page.'), { status: 400 });
  const pageSize = 10;
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}
module.exports = { pagination };
