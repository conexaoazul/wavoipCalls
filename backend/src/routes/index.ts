import { Router } from 'express';
import UserController from '../controllers/UserController';
import TenantController from '../controllers/TenantController';
import CallController from '../controllers/CallController';
import CallLogController from '../controllers/CallLogController';
import WavoipTokenController from '../controllers/WavoipTokenController';
import VapiTokenController from '../controllers/VapiTokenController';
import ElevenLabTokenController from '../controllers/ElevenLabTokenController';
import SettingsController from '../controllers/SettingsController';
import AuthController from '../controllers/AuthController';
import CurlExecutorController from '../controllers/CurlExecutorController';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const handleAsync = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// User routes
router.post('/users', UserController.createUser);
router.get('/users/:id', UserController.getUserById);
router.put('/users/:id', UserController.updateUser);
router.delete('/users/:id', UserController.deleteUser);

// Tenant routes
router.post('/tenants', TenantController.createTenant);
router.get('/tenants/:id', TenantController.getTenantById);
router.put('/tenants/:id', TenantController.updateTenant);
router.delete('/tenants/:id', TenantController.deleteTenant);

// Call routes
router.post('/calls', CallController.createCall);
router.get('/calls/:id', CallController.getCallById);
router.put('/calls/:id', CallController.updateCall);
router.delete('/calls/:id', CallController.deleteCall);
router.get('/calls', handleAsync(CallController.listCalls));
router.post('/calls/:id/execute-test', handleAsync(CallController.executeTestCall));

// CallLog routes
router.post('/call-logs', CallLogController.createCallLog);
router.get('/call-logs/:id', CallLogController.getCallLogById);
router.put('/call-logs/:id', CallLogController.updateCallLog);
router.delete('/call-logs/:id', CallLogController.deleteCallLog);
router.get('/call-logs', handleAsync(CallLogController.listCallLogs));

// WavoipToken routes
router.post('/wavoip-tokens', handleAsync(WavoipTokenController.createWavoipToken));
router.get('/wavoip-tokens/tenant/:tenantId', handleAsync(WavoipTokenController.listWavoipTokensByTenant));
router.get('/wavoip-tokens/:id/availability', handleAsync(WavoipTokenController.checkDeviceAvailabilityById));
// Legacy token-in-path route: disabled by default, kept only for controlled migration.
router.get('/wavoip-tokens/:token/check-availability', handleAsync(WavoipTokenController.checkDeviceAvailabilityLegacy));
router.get('/wavoip-tokens/:id', handleAsync(WavoipTokenController.getWavoipTokenById));
router.put('/wavoip-tokens/:id', handleAsync(WavoipTokenController.updateWavoipToken));
router.delete('/wavoip-tokens/:id', handleAsync(WavoipTokenController.deleteWavoipToken));
router.get('/wavoip-tokens', handleAsync(WavoipTokenController.listWavoipTokens));

// VapiToken routes
router.post('/vapi-tokens', handleAsync(VapiTokenController.createVapiToken));
router.get('/vapi-tokens/:id', handleAsync(VapiTokenController.getVapiTokenById));
router.put('/vapi-tokens/:id', handleAsync(VapiTokenController.updateVapiToken));
router.delete('/vapi-tokens/:id', handleAsync(VapiTokenController.deleteVapiToken));
router.get('/vapi-tokens', handleAsync(VapiTokenController.listVapiTokens));
router.get('/vapi-tokens/:id/assistants', handleAsync(VapiTokenController.listAssistants));
router.get('/vapi-tokens/:id/phone-numbers', handleAsync(VapiTokenController.listPhoneNumbers));

// ElevenLabToken routes
router.post('/elevenlab-tokens', handleAsync(ElevenLabTokenController.createElevenLabToken));
router.get('/elevenlab-tokens/:id', handleAsync(ElevenLabTokenController.getElevenLabTokenById));
router.put('/elevenlab-tokens/:id', handleAsync(ElevenLabTokenController.updateElevenLabToken));
router.delete('/elevenlab-tokens/:id', handleAsync(ElevenLabTokenController.deleteElevenLabToken));
router.get('/elevenlab-tokens', handleAsync(ElevenLabTokenController.listElevenLabTokens));
router.get('/elevenlab-tokens/:id/agents', handleAsync(ElevenLabTokenController.listAgents));
router.get('/elevenlab-tokens/:id/phone-numbers', handleAsync(ElevenLabTokenController.listPhoneNumbers));
router.post('/elevenlab-tokens/:id/outbound-call', handleAsync(ElevenLabTokenController.makeOutboundCall));

// Settings routes
router.post('/settings', handleAsync(SettingsController.createSetting));
router.get('/settings', handleAsync(SettingsController.listSettings));
router.get('/settings/tenant/all', handleAsync(SettingsController.getAllSettingsByTenant));
router.get('/settings/type/:type', handleAsync(SettingsController.getSettingByType));
router.put('/settings/type/:type', handleAsync(SettingsController.updateSettingByType));
router.delete('/settings/type/:type', handleAsync(SettingsController.deleteSettingByType));
router.get('/settings/:id', handleAsync(SettingsController.getSettingById));
router.put('/settings/:id', handleAsync(SettingsController.updateSetting));
router.delete('/settings/:id', handleAsync(SettingsController.deleteSetting));

// Generic HTTP executor is disabled by default and only works with explicit
// allowlists when ENABLE_CURL_EXECUTOR=true.
router.post('/curl-executor', handleAsync(CurlExecutorController.executeCurl));

// Auth routes
router.get('/auth/validate-token', AuthController.validateToken);

export default router;
