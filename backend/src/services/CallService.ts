import Call from '../models/Call';
import CallSchedulerService from './CallSchedulerService';
import { buildCallRequestFingerprint } from '../utils/callFingerprint';

class CallService {
  private assertExactlyOneProvider(vapiTokenId?: unknown, elevenLabTokenId?: unknown) {
    const count = Number(Boolean(vapiTokenId)) + Number(Boolean(elevenLabTokenId));
    if (count !== 1) {
      throw new Error('A ligação deve ter exatamente um provider: Vapi ou ElevenLabs');
    }
  }

  private assertMutable(call: Call) {
    if (call.executed || call.dispatchState !== 'pending') {
      throw new Error(`Ligação não pode ser alterada no estado ${call.dispatchState}`);
    }
  }

  async createCall(data: any, tenantId: number) {
    const idempotencyKey = String(data.idempotencyKey || '');
    if (!idempotencyKey) throw new Error('idempotencyKey é obrigatória');
    this.assertExactlyOneProvider(data.vapiTokenId, data.elevenLabTokenId);

    const requestFingerprint = buildCallRequestFingerprint(data, tenantId);
    const existing = await Call.findOne({ where: { tenantId, idempotencyKey } });
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new Error('Idempotency-Key já usada com payload diferente');
      }
      return existing;
    }

    const safeData = { ...data };
    delete safeData.executed;
    delete safeData.dispatchState;
    delete safeData.dispatchStartedAt;
    delete safeData.providerCallId;
    delete safeData.conversationId;
    delete safeData.sipCallId;

    try {
      return await Call.create({
        ...safeData,
        tenantId,
        requestFingerprint,
        dispatchState: 'pending',
        executed: false,
      });
    } catch (error) {
      // Handles a concurrent duplicate create racing on the unique index.
      const raced = await Call.findOne({ where: { tenantId, idempotencyKey } });
      if (raced) {
        if (raced.requestFingerprint !== requestFingerprint) {
          throw new Error('Idempotency-Key já usada com payload diferente');
        }
        return raced;
      }
      throw error;
    }
  }

  async getCallById(id: number, tenantId: number) {
    return Call.findOne({ where: { id, tenantId } });
  }

  async updateCall(id: number, data: any, tenantId: number) {
    const call = await Call.findOne({ where: { id, tenantId } });
    if (!call) throw new Error('Call não encontrada');
    this.assertMutable(call);

    const safeData = { ...data };
    for (const protectedField of [
      'idempotencyKey',
      'requestFingerprint',
      'executed',
      'dispatchState',
      'dispatchStartedAt',
      'providerCallId',
      'conversationId',
      'sipCallId',
      'tenantId',
    ]) {
      delete safeData[protectedField];
    }

    const nextVapi = Object.prototype.hasOwnProperty.call(safeData, 'vapiTokenId')
      ? safeData.vapiTokenId
      : call.vapiTokenId;
    const nextEleven = Object.prototype.hasOwnProperty.call(safeData, 'elevenLabTokenId')
      ? safeData.elevenLabTokenId
      : call.elevenLabTokenId;
    this.assertExactlyOneProvider(nextVapi, nextEleven);

    return Call.update(safeData, { where: { id, tenantId, executed: false, dispatchState: 'pending' } });
  }

  async deleteCall(id: number, tenantId: number) {
    const call = await Call.findOne({ where: { id, tenantId } });
    if (!call) throw new Error('Call não encontrada');
    this.assertMutable(call);
    return Call.destroy({ where: { id, tenantId, executed: false, dispatchState: 'pending' } });
  }

  async listCalls(tenantId: number, limit = 20, offset = 0) {
    const [calls, totalCalls] = await Promise.all([
      Call.findAll({
        where: { tenantId },
        limit,
        offset,
        order: [['id', 'DESC']]
      }),
      Call.count({ where: { tenantId } })
    ]);

    return {
      calls,
      totalCalls,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCalls / limit)
    };
  }

  async executeTestCall(id: number, tenantId: number) {
    return CallSchedulerService.executeCallById(id, tenantId);
  }
}

export default new CallService();
