import { Request, Response } from 'express';
import SettingsService from '../services/SettingsService';

class SettingsController {
  async createSetting(req: Request, res: Response) {
    try {
      const { tenantId, ...data } = req.body;
      const setting = await SettingsService.createSetting(data, tenantId);
      res.json(setting);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async getSettingById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;
      const setting = await SettingsService.getSettingById(Number(id), Number(tenantId));
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json(setting);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async getSettingByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { tenantId } = req.query;
      const setting = await SettingsService.getSettingByType(String(type), Number(tenantId));
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json(setting);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async updateSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, ...data } = req.body;
      const setting = await SettingsService.updateSetting(Number(id), data, Number(tenantId));
      res.json(setting);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async updateSettingByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { tenantId, ...data } = req.body;
      const setting = await SettingsService.updateSettingByType(String(type), data, Number(tenantId));
      res.json(setting);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async deleteSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;
      await SettingsService.deleteSetting(Number(id), Number(tenantId));
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async deleteSettingByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { tenantId } = req.query;
      await SettingsService.deleteSettingByType(String(type), Number(tenantId));
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async listSettings(req: Request, res: Response) {
    try {
      const { tenantId, limit, offset } = req.query;
      const settings = await SettingsService.listSettings(
        Number(tenantId),
        limit ? Number(limit) : 20,
        offset ? Number(offset) : 0
      );
      res.json(settings);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }

  async getAllSettingsByTenant(req: Request, res: Response) {
    try {
      const { tenantId } = req.query;
      const settings = await SettingsService.getAllSettingsByTenant(Number(tenantId));
      res.json(settings);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
}

export default new SettingsController(); 