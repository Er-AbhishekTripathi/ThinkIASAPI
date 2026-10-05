const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mediaUrl } = require('../utils/mediaUrl');

test('mediaUrl preserves absolute and embedded media URLs', () => {
  assert.equal(mediaUrl('https://cdn.example.com/image.png'), 'https://cdn.example.com/image.png');
  assert.equal(mediaUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.equal(mediaUrl(null), null);
});

test('mediaUrl resolves local paths against the request host and protocol', () => {
  const req = {
    protocol: 'https',
    get: name => name === 'host' ? 'api.example.com' : undefined
  };
  assert.equal(
    mediaUrl('/uploads/profiles/user.png', req),
    'https://api.example.com/uploads/profiles/user.png'
  );
});

test('mediaUrl leaves local paths relative when there is no request host', () => {
  assert.equal(mediaUrl('/uploads/profiles/user.png'), '/uploads/profiles/user.png');
});
