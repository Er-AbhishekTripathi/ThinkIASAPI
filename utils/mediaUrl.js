const publicR2Base = () => (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const originFrom = (req) => {
  const configured = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  if (req?.get) {
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      return `${proto}://${host}`;
    }
  }
  return `http://localhost:${process.env.PORT || 5000}`;
};

const publicUrlFromKey = (key) => {
  const base = publicR2Base();
  if (!base || !key) return null;
  return `${base}/${String(key).replace(/^\/+/, '')}`;
};

const fromPrivateR2 = (value) => {
  if (!value || !publicR2Base() || !value.includes('.r2.cloudflarestorage.com/')) return value;
  const pathAfterHost = value.split('.r2.cloudflarestorage.com/')[1]?.split(/[?#]/)[0];
  if (!pathAfterHost) return value;
  const bucketPrefix = `${process.env.R2_BUCKET_NAME || ''}/`;
  const key = bucketPrefix && pathAfterHost.startsWith(bucketPrefix)
    ? pathAfterHost.slice(bucketPrefix.length)
    : pathAfterHost;
  return publicUrlFromKey(key) || value;
};

const mediaUrl = (value, req) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return value;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (/^https?:\/\//i.test(raw)) return fromPrivateR2(raw);
  return `${originFrom(req)}/${raw.replace(/^\/+/, '')}`;
};

module.exports = { mediaUrl, publicUrlFromKey, fromPrivateR2, originFrom };
