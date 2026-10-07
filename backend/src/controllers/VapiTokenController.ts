import { Request, Response } from 'express';
import VapiTokenService from '../services/VapiTokenService';
import logger from '../utils/logger';
import { toCredentialList, toCredentialView } from '../utils/security';

class VapiTokenController {
  async createVapiToken(req: Request, res: Response) {
    try {
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token é obrigatório' });
      }

      logger.info(`Criando credencial Vapi tenant=${tenantIdNum} name=${String(name || '').slice(0, 80)}`);
      const created = await VapiTokenService.createVapiToken({ token, name }, tenantIdNum);
      res.json(toCredentialView(created));
    } catch (error) {
      logger.error('Erro ao criar credencial Vapi: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getVapiTokenById(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const token = await VapiTokenService.getVapiTokenById(Number(req.params.id), tenantIdNum);
      if (!token) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(toCredentialView(token));
    } catch (error) {
      logger.error('Erro ao buscar credencial Vapi: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateVapiToken(req: Request, res: Response) {
    try {
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existing = await VapiTokenService.getVapiTokenById(Number(req.params.id), tenantIdNum);
      if (!existing) return res.status(404).json({ error: 'Credencial não encontrada' });

      const patch: Record<string, unknown> = {};
      if (typeof token === 'string' && token.trim()) patch.token = token;
      if (typeof name === 'string') patch.name = name;

      const updated = await VapiTokenService.updateVapiToken(Number(req.params.id), patch, tenantIdNum);
      res.json({ message: 'Credencial atualizada com sucesso', token: toCredentialView(updated) });
    } catch (error) {
      logger.error('Erro ao atualizar credencial Vapi: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async deleteVapiToken(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existing = await VapiTokenService.getVapiTokenById(Number(req.params.id), tenantIdNum);
      if (!existing) return res.status(404).json({ error: 'Credencial não encontrada' });

      await VapiTokenService.deleteVapiToken(Number(req.params.id), tenantIdNum);
      res.json({ message: 'Credencial deletada com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar credencial Vapi: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listAssistants(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      const token = await VapiTokenService.getVapiTokenById(Number(req.params.id), tenantIdNum);
      if (!token) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(await VapiTokenService.listAssistants(token.token));
    } catch (error) {
      logger.error('Erro ao listar Vapi assistants: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }

  async listPhoneNumbers(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      const token = await VapiTokenService.getVapiTokenById(Number(req.params.id), tenantIdNum);
      if (!token) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(await VapiTokenService.listPhoneNumbers(token.token));
    } catch (error) {
      logger.error('Erro ao listar Vapi phone numbers: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }

  async listVapiTokens(req: Request, res: Response) {
    try {
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      res.json(toCredentialList(await VapiTokenService.getVapiTokensByTenant(tenantIdNum)));
    } catch (error) {
      logger.error('Erro ao listar credenciais Vapi: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new VapiTokenController();
