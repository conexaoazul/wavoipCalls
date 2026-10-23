import { Sequelize } from 'sequelize-typescript';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Call from '../models/Call';
import CallLog from '../models/CallLog';
import WavoipToken from '../models/WavoipToken';
import VapiToken from '../models/VapiToken';
import ElevenLabToken from '../models/ElevenLabToken';
import Settings from '../models/Settings';
import CallSchedulerService from '../services/CallSchedulerService';
import SettingsService from '../services/SettingsService';
import logger from '../utils/logger';

const dbConfig = require("../config/database");
const sequelize = new Sequelize(dbConfig);

sequelize.addModels([
  User, Tenant, Call, CallLog, WavoipToken, VapiToken, ElevenLabToken, Settings
]);

let databaseReady = false;
let initializationPromise: Promise<void> | null = null;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function initializeDatabase(): Promise<void> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    await sequelize.authenticate();

    const tenants = await Tenant.findAll();
    for (const tenant of tenants) {
      let intervalSeconds = 60;
      try {
        const setting = await SettingsService.getSettingByType('interval', tenant.id);
        if (setting?.value && !isNaN(Number(setting.value))) {
          intervalSeconds = Number(setting.value);
        }
      } catch (error) {
        logger.warn(`Tenant ${tenant.id}: interval indisponível; usando 60s`);
      }
      await CallSchedulerService.startScheduler(intervalSeconds, tenant.id);
    }

    databaseReady = true;
    logger.info('Banco autenticado e schedulers inicializados.');
  })().catch((error) => {
    databaseReady = false;
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

export async function closeDatabase(): Promise<void> {
  databaseReady = false;
  await sequelize.close();
}

export default sequelize;
