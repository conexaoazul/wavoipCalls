import { Request, Response } from 'express';
import WavoipTokenService from '../services/WavoipTokenService';
import logger from '../utils/logger';
import { toCredentialList, toCredentialView } from '../utils/security';

class WavoipTokenController {
  async createWavoipToken(req: Request, res: Response) {
    try {
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token é obrigatório' });
      }

      logger.info(`Criando credencial Wavoip tenant=${tenantIdNum} name=${String(name || '').slice(0, 80)}`);
      const created = await WavoipTokenService.createWavoipToken({ token, name }, tenantIdNum);
      res.json({ message: 'Credencial criada com sucesso', token: toCredentialView(created) });
    } catch (error) {
      logger.error('Erro ao criar credencial Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getWavoipTokenById(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      const token = await WavoipTokenService.getWavoipTokenById(Number(req.params.id), tenantIdNum);
      if (!token) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(toCredentialView(token));
    } catch (error) {
      logger.error('Erro ao buscar credencial Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateWavoipToken(req: Request, res: Response) {
    try {
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existing = await WavoipTokenService.getWavoipTokenById(Number(req.params.id), tenantIdNum);
      if (!existing) return res.status(404).json({ error: 'Credencial não encontrada' });

      const patch: Record<string, unknown> = {};
      if (typeof token === 'string' && token.trim()) patch.token = token;
      if (typeof name === 'string') patch.name = name;

      const updated = await WavoipTokenService.updateWavoipToken(Number(req.params.id), patch, tenantIdNum);
      res.json({ message: 'Credencial atualizada com sucesso', token: toCredentialView(updated) });
    } catch (error) {
      logger.error('Erro ao atualizar credencial Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async deleteWavoipToken(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existing = await WavoipTokenService.getWavoipTokenById(Number(req.params.id), tenantIdNum);
      if (!existing) return res.status(404).json({ error: 'Credencial não encontrada' });

      await WavoipTokenService.deleteWavoipToken(Number(req.params.id), tenantIdNum);
      res.json({ message: 'Credencial deletada com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar credencial Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listWavoipTokens(req: Request, res: Response) {
    try {
      res.json(toCredentialList(await WavoipTokenService.getAllWavoipTokens()));
    } catch (error) {
      logger.error('Erro ao listar credenciais Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listWavoipTokensByTenant(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.params.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      res.json(toCredentialList(await WavoipTokenService.getWavoipTokensByTenant(tenantIdNum)));
    } catch (error) {
      logger.error('Erro ao listar credenciais Wavoip por tenant: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async checkDeviceAvailabilityById(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      const credential = await WavoipTokenService.getWavoipTokenById(Number(req.params.id), tenantIdNum);
      if (!credential) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(await WavoipTokenService.isDeviceAvailable(credential.token));
    } catch (error) {
      logger.error('Erro ao verificar disponibilidade Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }

  async checkDeviceAvailabilityLegacy(req: Request, res: Response) {
    if (process.env.ENABLE_LEGACY_TOKEN_PATHS !== 'true') {
      return res.status(410).json({
        error: 'Endpoint legado desabilitado. Use /wavoip-tokens/:id/availability?tenantId=...',
      });
    }

    try {
      const tokenValue = String(req.params.token || '').trim();
      if (!tokenValue) return res.status(400).json({ error: 'Token inválido' });
      res.setHeader('Warning', '299 - Legacy token-in-path endpoint is deprecated');
      res.json(await WavoipTokenService.isDeviceAvailable(tokenValue));
    } catch (error) {
      logger.error('Erro no endpoint legado Wavoip: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }
}

export default new WavoipTokenController();
