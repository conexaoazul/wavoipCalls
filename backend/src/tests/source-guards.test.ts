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


test('control-plane routes require bearer auth', () => {
  const body = source('routes/index.ts');
  const publicProbe = body.indexOf("router.get('/auth/validate-token'");
  const authGate = body.indexOf('router.use(requireApiToken)');
  const credentialRoute = body.indexOf("router.post('/elevenlab-tokens'");
  assert.equal(publicProbe >= 0, true);
  assert.equal(authGate > publicProbe, true);
  assert.equal(credentialRoute > authGate, true);
});


test('new call API requires caller supplied idempotency', () => {
  const body = source('controllers/CallController.ts');
  assert.equal(body.includes("Idempotency-Key é obrigatória"), true);
  assert.equal(body.includes("req.header('Idempotency-Key')"), true);
});


test('master voice dispatch kill switch is required', () => {
  const body = source('services/CallSchedulerService.ts');
  assert.equal(body.includes("VOICE_DISPATCH_ENABLED === 'true'"), true);
  assert.equal(body.includes('Voice dispatch está desabilitado por feature flag'), true);
});


test('provider and ElevenLabs refs are allowlisted before dispatch', () => {
  const body = source('services/CallSchedulerService.ts');
  assert.equal(body.includes('VOICE_ENABLED_PROVIDERS'), true);
  assert.equal(body.includes('VOICE_ELEVENLABS_AGENT_ALLOWLIST'), true);
  assert.equal(body.includes('VOICE_ELEVENLABS_PHONE_ALLOWLIST'), true);
  assert.equal(body.includes("allowed.size > 0 && allowed.has(value)"), true);
});


test('credential list endpoints require tenant scope', () => {
  for (const file of [
    'controllers/ElevenLabTokenController.ts',
    'controllers/VapiTokenController.ts',
    'controllers/WavoipTokenController.ts',
  ]) {
    const body = source(file);
    assert.equal(body.includes('Number(req.query.tenantId)'), true, file);
  }
});


test('pending calls are the only mutable calls and exactly one provider is required', () => {
  const body = source('services/CallService.ts');
  assert.equal(body.includes('assertExactlyOneProvider'), true);
  assert.equal(body.includes("call.dispatchState !== 'pending'"), true);
  assert.equal(body.includes("dispatchState: 'pending'"), true);
});
