'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const apiToken = 'timezone-test-token-0123456789-abcdef';
const storageRoot = path.join(os.tmpdir(), `monitoring-gateway-${process.pid}-${Date.now()}`);

process.env.MONITORING_API_TOKEN = apiToken;
process.env.MONITORING_STORAGE_ROOT = storageRoot;
process.env.MONITORING_TIMEZONE = 'Asia/Jakarta';

const { app } = require('../server');

async function post(baseUrl, endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return { status: response.status, json: await response.json() };
}

test('evidence and snapshots use the Jakarta calendar date', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const evidence = await post(baseUrl, '/api/kebersihan/evidence', {
    createdAt: '2026-08-23T23:08:25.823Z',
    contentType: 'image/jpeg',
    fileName: 'TOILET-SENIOR-MANAGER',
    base64: Buffer.from('photo').toString('base64')
  });
  assert.equal(evidence.status, 201);
  assert.equal(evidence.json.timezone, 'Asia/Jakarta');
  assert.equal(evidence.json.storedPath, 'EVIDENCE/2026/08/24/TOILET-SENIOR-MANAGER.jpg');

  const snapshot = await post(baseUrl, '/api/kebersihan/snapshot', {
    createdAt: '2026-07-31T18:00:00.000Z',
    base64: Buffer.from('workbook').toString('base64')
  });
  assert.equal(snapshot.status, 201);
  assert.equal(snapshot.json.timezone, 'Asia/Jakarta');
  assert.equal(snapshot.json.storedPath, 'SNAPSHOTS/2026/08/database-2026-08-01T01-00-00.xlsx');
});
