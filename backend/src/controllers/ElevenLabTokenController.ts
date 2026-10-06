import { Request, Response } from 'express';
import ElevenLabTokenService from '../services/ElevenLabTokenService';
import logger from '../utils/logger';
import { toCredentialList, toCredentialView } from '../utils/security';

class ElevenLabTokenController {
  async createElevenLabToken(req: Request, res: Response) {
    try {
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token é obrigatório' });
      }

      logger.info(`Criando credencial ElevenLabs tenant=${tenantIdNum} name=${String(name || '').slice(0, 80)}`);
      const created = await ElevenLabTokenService.createElevenLabToken({ token, name }, tenantIdNum);
      res.json(toCredentialView(created));
    } catch (error) {
      logger.error('Erro ao criar credencial ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getElevenLabTokenById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const token = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!token) return res.status(404).json({ error: 'Credencial não encontrada' });
      res.json(toCredentialView(token));
    } catch (error) {
      logger.error('Erro ao buscar credencial ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateElevenLabToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, token, name } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existingToken = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!existingToken) {
        return res.status(404).json({ error: 'Credencial não encontrada' });
      }

      const patch: Record<string, unknown> = {};
      if (typeof token === 'string' && token.trim()) patch.token = token;
      if (typeof name === 'string') patch.name = name;

      const updated = await ElevenLabTokenService.updateElevenLabToken(Number(id), patch, tenantIdNum);
      res.json({ message: 'Credencial atualizada com sucesso', token: toCredentialView(updated) });
    } catch (error) {
      logger.error('Erro ao atualizar credencial ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async deleteElevenLabToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const existingToken = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!existingToken) {
        return res.status(404).json({ error: 'Credencial não encontrada' });
      }

      await ElevenLabTokenService.deleteElevenLabToken(Number(id), tenantIdNum);
      res.json({ message: 'Credencial deletada com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar credencial ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listAgents(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const token = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!token) {
        return res.status(404).json({ error: 'Credencial não encontrada. Agents não estão disponíveis.' });
      }

      res.json(await ElevenLabTokenService.listAgents(token.token));
    } catch (error) {
      logger.error('Erro ao listar ElevenLabs agents: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }

  async listPhoneNumbers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantIdNum = Number(req.query.tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const token = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!token) {
        return res.status(404).json({ error: 'Credencial não encontrada. Phone numbers não estão disponíveis.' });
      }

      res.json(await ElevenLabTokenService.listPhoneNumbers(token.token));
    } catch (error) {
      logger.error('Erro ao listar ElevenLabs phone numbers: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao consultar provider de voz' });
    }
  }

  async makeOutboundCall(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, agentId, agentPhoneNumberId, toNumber, conversationInitiationClientData } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }
      if (!agentId || !agentPhoneNumberId || !toNumber) {
        return res.status(400).json({ error: 'agentId, agentPhoneNumberId e toNumber são obrigatórios' });
      }

      const token = await ElevenLabTokenService.getElevenLabTokenById(Number(id), tenantIdNum);
      if (!token) {
        return res.status(404).json({ error: 'Credencial não encontrada. Chamada não pode ser realizada.' });
      }

      const correlationId = String(req.header('Idempotency-Key') || req.header('X-Request-ID') || '').slice(0, 128) || undefined;
      const callResult = await ElevenLabTokenService.makeOutboundCall(
        token.token,
        String(agentId),
        String(agentPhoneNumberId),
        String(toNumber),
        conversationInitiationClientData,
        correlationId,
      );

      res.json(callResult);
    } catch (error) {
      logger.error('Erro ao realizar chamada ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha ao iniciar chamada no provider de voz; não tente novamente automaticamente' });
    }
  }

  async listElevenLabTokens(req: Request, res: Response) {
    try {
      const tokens = await ElevenLabTokenService.getAllElevenLabTokens();
      res.json(toCredentialList(tokens));
    } catch (error) {
      logger.error('Erro ao listar credenciais ElevenLabs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new ElevenLabTokenController();
