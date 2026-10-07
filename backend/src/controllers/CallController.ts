import { Request, Response } from 'express';
import CallService from '../services/CallService';
import { normalizeIdempotencyKey } from '../utils/idempotency';

class CallController {
  async createCall(req: Request, res: Response) {
    try {
      const { tenantId, idempotencyKey: bodyIdempotencyKey, ...data } = req.body;
      const tenantIdNum = Number(tenantId);
      if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
        return res.status(400).json({ error: 'tenantId é obrigatório e deve ser um inteiro válido' });
      }

      const suppliedIdempotencyKey = req.header('Idempotency-Key') || bodyIdempotencyKey;
      if (!suppliedIdempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key é obrigatória para criar uma ligação' });
      }
      const idempotencyKey = normalizeIdempotencyKey(suppliedIdempotencyKey);
      const call = await CallService.createCall({ ...data, idempotencyKey }, tenantIdNum);
      res.json(call);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Requisição inválida' });
    }
  }

  async getCallById(req: Request, res: Response) {
    const { id } = req.params;
    const { tenantId } = req.query;
    const call = await CallService.getCallById(Number(id), Number(tenantId));
    res.json(call);
  }

  async updateCall(req: Request, res: Response) {
    const { id } = req.params;
    const { tenantId, ...data } = req.body;
    const call = await CallService.updateCall(Number(id), data, Number(tenantId));
    res.json(call);
  }

  async deleteCall(req: Request, res: Response) {
    const { id } = req.params;
    const { tenantId } = req.query;
    await CallService.deleteCall(Number(id), Number(tenantId));
    res.sendStatus(204);
  }

  async listCalls(req: Request, res: Response) {
    const { tenantId, limit, offset } = req.query;
    const calls = await CallService.listCalls(
      Number(tenantId),
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0
    );
    res.json(calls);
  }

  async executeTestCall(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;
      const result = await CallService.executeTestCall(Number(id), Number(tenantId));
      res.json(result);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  }
}

export default new CallController();
