const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { runTest } = require('../lib/runTest');

function startTestServer(html) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('runTest reports PASS for a clean page', async () => {
  const server = await startTestServer('<html><head><title>Hello</title></head><body>OK</body></html>');
  const { port } = server.address();

  try {
    const result = await runTest(`http://127.0.0.1:${port}`);
    assert.equal(result.status, 'PASS');
    assert.equal(result.httpStatus, 200);
    assert.equal(result.title, 'Hello');
    assert.equal(result.consoleErrors.length, 0);
    assert.equal(result.screenshot, null);
  } finally {
    server.close();
  }
});

test('runTest reports FAIL and saves a screenshot when the page cannot be reached', async () => {
  const result = await runTest('http://127.0.0.1:1');
  assert.equal(result.status, 'FAIL');
  assert.ok(result.error);
});
