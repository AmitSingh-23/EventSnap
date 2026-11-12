const test = require('node:test');
const assert = require('node:assert/strict');

const { imageFileFilter, MAX_FILE_SIZE } = require('../cloudinary');

function run(mimetype) {
  return new Promise((resolve) => {
    imageFileFilter({}, { mimetype }, (err, accepted) => resolve({ err, accepted }));
  });
}

test('JPEG and PNG uploads are accepted', async () => {
  assert.equal((await run('image/jpeg')).accepted, true);
  assert.equal((await run('image/png')).accepted, true);
});

test('non-image uploads are rejected with a 400', async () => {
  for (const type of ['application/pdf', 'text/html', 'application/x-msdownload', 'image/svg+xml']) {
    const { err, accepted } = await run(type);
    assert.ok(err instanceof Error, `${type} should be rejected`);
    assert.equal(err.status, 400);
    assert.equal(accepted, undefined);
  }
});

test('per-file size limit is 15 MB', () => {
  assert.equal(MAX_FILE_SIZE, 15 * 1024 * 1024);
});
