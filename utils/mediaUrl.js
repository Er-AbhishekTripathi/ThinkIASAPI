function mediaUrl(value, req) {
  if (value == null || value === '') return null;

  const url = String(value).trim();
  if (!url) return null;
  if (/^(https?:\/\/|data:)/i.test(url)) return url;
  if (!url.startsWith('/') || url.startsWith('//')) return url;

  const host = req?.get?.('host') || req?.headers?.host;
  if (!host) return url;

  const protocol = req.protocol === 'https' ? 'https' : 'http';
  return new URL(url, `${protocol}://${host}`).toString();
}

module.exports = { mediaUrl };
