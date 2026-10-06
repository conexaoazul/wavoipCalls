import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function source(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'src', file), 'utf8');
}

test('credential controllers do not log entire request bodies', () => {
  for (const file of [
    'controllers/ElevenLabTokenController.ts',
    'controllers/VapiTokenController.ts',
    'controllers/WavoipTokenController.ts',
  ]) {
    const body = source(file);
    assert.equal(body.includes('JSON.stringify(req.body)'), false, file);
  }
});

test('generic HTTP executor is disabled by default and allowlisted', () => {
  const body = source('controllers/CurlExecutorController.ts');
  assert.equal(body.includes("ENABLE_CURL_EXECUTOR !== 'true'"), true);
  assert.equal(body.includes('CURL_EXECUTOR_ALLOWED_HOSTS'), true);
  assert.equal(body.includes("parsed.protocol !== 'https:'"), true);
});

test('legacy token-in-path route is disabled by default', () => {
  const body = source('controllers/WavoipTokenController.ts');
  assert.equal(body.includes("ENABLE_LEGACY_TOKEN_PATHS !== 'true'"), true);
});

test('direct provider outbound is disabled by default', () => {
  const body = source('controllers/ElevenLabTokenController.ts');
  assert.equal(body.includes("ENABLE_UNSAFE_DIRECT_PROVIDER_OUTBOUND !== 'true'"), true);
});

test('scheduler claims before dispatch and marks ambiguous errors unknown', () => {
  const body = source('services/CallSchedulerService.ts');
  assert.equal(body.includes("dispatchState: 'dispatching'"), true);
  assert.equal(body.includes("dispatchState: 'unknown'"), true);
  assert.equal(body.includes('automatic_retry=false'), true);
});
