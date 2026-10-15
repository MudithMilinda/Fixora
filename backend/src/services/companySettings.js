function validateCompanySettings(body) {
  const values = {};
  for (const [field, max] of Object.entries({ name: 160, website: 500, email: 254, phone: 40, address: 1000 })) {
    if (typeof body?.[field] !== 'string' || body[field].trim().length > max) {
      throw new Error(`Enter a valid ${field} (maximum ${max} characters).`);
    }
    values[field] = body[field].trim();
  }
  if (!values.name) throw new Error('Enter a company name.');
  if (values.website) {
    let url;
    try { url = new URL(values.website); } catch { throw new Error('Enter a website starting with https:// or http://.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error('Enter a valid public website URL.');
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new Error('Enter a valid email address.');
  if (typeof body.reportBranding !== 'boolean') throw new Error('Choose a valid report branding setting.');
  values.reportBranding = body.reportBranding;
  values.logo = body.logo;
  if (values.logo !== null) {
    if (typeof values.logo !== 'string' || values.logo.length > 1400000) throw new Error('Choose a logo smaller than 1 MB.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(values.logo);
    if (!match) throw new Error('Choose a PNG, JPEG, or WebP logo.');
    const data = Buffer.from(match[2], 'base64');
    const valid = (match[1] === 'png' && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
      || (match[1] === 'jpeg' && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
      || (match[1] === 'webp' && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP');
    if (!valid || data.length > 1024 * 1024) throw new Error('Choose a valid PNG, JPEG, or WebP logo smaller than 1 MB.');
  }
  return values;
}

function serializeCompanySettings(company, settings) {
  return {
    id: company.id, code: company.code, name: company.name,
    website: settings?.website || '', email: settings?.email || '',
    phone: settings?.phone || '', address: settings?.address || '',
    logo: settings?.logo || null, reportBranding: settings?.reportBranding ?? true,
  };
}

module.exports = { validateCompanySettings, serializeCompanySettings };
