import axios from 'axios';
import { Op } from 'sequelize';
import Call from '../models/Call';
import VapiToken from '../models/VapiToken';
import ElevenLabToken from '../models/ElevenLabToken';
import WavoipToken from '../models/WavoipToken';
import CallLogService from './CallLogService';
import WavoipTokenService from './WavoipTokenService';
import SettingsService from './SettingsService';
import ElevenLabsVoiceProvider from './providers/ElevenLabsVoiceProvider';
import logger from '../utils/logger';
import { maskPhone, sanitizeLogValue } from '../utils/security';

interface VapiCallResponse {
  id: string;
  status: string;
}

interface VapiPhoneNumberResponse {
  id: string;
  number: string;
}

type DispatchResponse =
  | VapiCallResponse
  | {
      provider: string;
      providerCallId?: string;
      conversationId?: string;
      sipCallId?: string;
      raw: unknown;
    };

class CallSchedulerService {
  private dispatchEnabled(): boolean {
    return process.env.VOICE_DISPATCH_ENABLED === 'true';
  }

  private preflightEnabled(): boolean {
    return process.env.VOICE_PREFLIGHT_ENABLED === 'true';
  }

  private enabledProviders(): Set<string> {
    return new Set(
      String(process.env.VOICE_ENABLED_PROVIDERS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private providerEnabled(provider: 'vapi' | 'elevenlabs'): boolean {
    return this.enabledProviders().has(provider);
  }

  private elevenLabsRefAllowed(value: string, envName: 'VOICE_ELEVENLABS_AGENT_ALLOWLIST' | 'VOICE_ELEVENLABS_PHONE_ALLOWLIST'): boolean {
    const allowed = new Set(
      String(process.env[envName] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
    return allowed.size > 0 && allowed.has(value);
  }

  private tenantSchedulers: Record<number, { intervalId: NodeJS.Timeout, currentInterval: number }> = {};

  private includeProviders() {
    return [
      { model: VapiToken, as: 'vapiToken', required: false },
      { model: ElevenLabToken, as: 'elevenLabToken', required: false },
    ];
  }

  private async findPendingCalls(tenantId?: number) {
    const where: any = {
      scheduleAt: { [Op.lte]: new Date() },
      executed: false,
      dispatchState: 'pending',
    };
    if (tenantId) where.tenantId = tenantId;

    return Call.findAll({
      where,
      include: this.includeProviders(),
      order: [['scheduleAt', 'ASC'], ['id', 'ASC']],
    });
  }

  async processScheduledCalls(): Promise<void> {
    if (!this.dispatchEnabled()) return;
    try {
      const calls = await this.findPendingCalls();
      logger.info(`Fila de voz: ${calls.length} chamada(s) pendente(s)`);
      for (const call of calls) await this.processOne(call);
    } catch (error) {
      logger.error('Erro no processamento da fila de voz: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private async processOne(call: Call): Promise<void> {
    let claimed = false;
    try {
      const isValid = await this.validatePhoneNumberAndWavoipToken(call);
      if (!isValid) {
        logger.warn(`Chamada ${call.id} não despachada: validação de provider falhou`);
        return;
      }

      claimed = await this.claimForDispatch(call);
      if (!claimed) {
        logger.info(`Chamada ${call.id} já foi reivindicada por outro worker`);
        return;
      }

      const response = await this.executeCall(call);
      await this.completeDispatch(call, response);

      await CallLogService.createCallLog({
        callId: call.id,
        option: this.responseSummary(response),
      }, call.tenantId);

      logger.info(`Chamada ${call.id} concluída no provider`);
    } catch (error) {
      logger.error(`Erro ao despachar chamada ${call.id}: ${error instanceof Error ? error.message : String(error)}`);

      if (claimed) {
        await Call.update(
          { dispatchState: 'unknown' },
          { where: { id: call.id, tenantId: call.tenantId, dispatchState: 'dispatching' } },
        );

        await CallLogService.createCallLog({
          callId: call.id,
          option: 'dispatch_state=unknown; automatic_retry=false',
        }, call.tenantId);
      }
    }
  }

  private async claimForDispatch(call: Call): Promise<boolean> {
    const [updated] = await Call.update(
      {
        dispatchState: 'dispatching',
        dispatchStartedAt: new Date(),
      },
      {
        where: {
          id: call.id,
          tenantId: call.tenantId,
          executed: false,
          dispatchState: 'pending',
        },
      },
    );
    return updated === 1;
  }

  private async completeDispatch(call: Call, response: DispatchResponse): Promise<void> {
    const normalized = response as any;
    const raw = normalized.raw || normalized;

    await Call.update(
      {
        executed: true,
        dispatchState: 'completed',
        providerCallId: normalized.providerCallId || raw.call_id || raw.id || null,
        conversationId: normalized.conversationId || raw.conversation_id || null,
        sipCallId: normalized.sipCallId || raw.sip_call_id || null,
      },
      {
        where: {
          id: call.id,
          tenantId: call.tenantId,
          dispatchState: 'dispatching',
        },
      },
    );
  }

  private responseSummary(response: DispatchResponse): string {
    const normalized = response as any;
    const raw = normalized.raw || normalized;
    const summary = {
      provider: normalized.provider || (raw.id ? 'vapi' : 'unknown'),
      providerCallId: normalized.providerCallId || raw.call_id || raw.id || null,
      conversationId: normalized.conversationId || raw.conversation_id || null,
      sipCallId: normalized.sipCallId || raw.sip_call_id || null,
      status: raw.status || null,
    };
    return `dispatch_result=${sanitizeLogValue(summary)}`;
  }

  private async validatePhoneNumberAndWavoipToken(call: Call): Promise<boolean> {
    try {
      if (call.vapiTokenId && call.vapiToken) {
        if (!this.providerEnabled('vapi')) {
          logger.warn(`Provider Vapi bloqueado por policy para chamada ${call.id}`);
          return false;
        }
        return await this.validateVapiCall(call);
      }
      if (call.elevenLabTokenId && call.elevenLabToken) {
        if (!this.providerEnabled('elevenlabs')) {
          logger.warn(`Provider ElevenLabs bloqueado por policy para chamada ${call.id}`);
          return false;
        }
        return await this.validateElevenLabsCall(call);
      }

      logger.error(`Chamada ${call.id} não possui provider válido`);
      return false;
    } catch (error) {
      logger.error(`Erro de validação da chamada ${call.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async validateVapiCall(call: Call): Promise<boolean> {
    try {
      const phoneResponse = await axios.get(
        `https://api.vapi.ai/phone-number/${encodeURIComponent(call.phoneNumberId)}`,
        {
          timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
          headers: {
            Authorization: `Bearer ${call.vapiToken!.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const phoneData: VapiPhoneNumberResponse = phoneResponse.data;
      logger.info(`Vapi phone validado para chamada ${call.id}: ${maskPhone(phoneData.number)}`);

      const wavoipTokens = await WavoipToken.findAll({
        where: {
          name: String(phoneData.number || '').replace('+', ''),
          tenantId: call.tenantId,
        },
      });

      if (wavoipTokens.length === 0) {
        logger.warn(`Nenhuma credencial Wavoip associada ao phone ref da chamada ${call.id}`);
        return false;
      }

      for (const wavoipToken of wavoipTokens) {
        try {
          const deviceStatus = await WavoipTokenService.isDeviceAvailable(wavoipToken.token);
          if (deviceStatus.available) {
            logger.info(`Wavoip disponível para chamada ${call.id} credential_id=${wavoipToken.id}`);
            return true;
          }
          logger.warn(`Wavoip ocupado para chamada ${call.id} credential_id=${wavoipToken.id}`);
        } catch (error) {
          logger.error(`Falha ao verificar Wavoip credential_id=${wavoipToken.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return false;
    } catch (error) {
      logger.error(`Falha ao validar Vapi para chamada ${call.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async validateElevenLabsCall(call: Call): Promise<boolean> {
    try {
      if (!this.elevenLabsRefAllowed(call.assistantId, 'VOICE_ELEVENLABS_AGENT_ALLOWLIST')) {
        logger.warn(`ElevenLabs agent ref bloqueado por allowlist para chamada ${call.id}`);
        return false;
      }
      if (!this.elevenLabsRefAllowed(call.phoneNumberId, 'VOICE_ELEVENLABS_PHONE_ALLOWLIST')) {
        logger.warn(`ElevenLabs phone ref bloqueado por allowlist para chamada ${call.id}`);
        return false;
      }

      const timeout = Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000);
      await axios.get(
        `https://api.elevenlabs.io/v1/convai/phone-numbers/${encodeURIComponent(call.phoneNumberId)}`,
        {
          timeout,
          headers: { 'xi-api-key': call.elevenLabToken!.token },
        },
      );

      await axios.get(
        `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(call.assistantId)}`,
        {
          timeout,
          headers: { 'xi-api-key': call.elevenLabToken!.token },
        },
      );

      logger.info(`ElevenLabs refs validados para chamada ${call.id}`);
      return true;
    } catch (error) {
      logger.error(`Falha ao validar ElevenLabs para chamada ${call.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async executeCall(call: Call): Promise<DispatchResponse> {
    if (call.vapiTokenId && call.vapiToken) {
      return this.executeVapiCall(call);
    }
    if (call.elevenLabTokenId && call.elevenLabToken) {
      return this.executeElevenLabsCall(call);
    }
    throw new Error(`Chamada ${call.id} não possui provider válido`);
  }

  private async executeVapiCall(call: Call): Promise<VapiCallResponse> {
    const payload = {
      customers: [{ number: call.customerNumber }],
      assistantId: call.assistantId,
      phoneNumberId: call.phoneNumberId,
    };

    logger.info(`Dispatch Vapi call_id=${call.id} to=${maskPhone(call.customerNumber)}`);

    const response = await axios.post('https://api.vapi.ai/call', payload, {
      timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
      headers: {
        Authorization: `Bearer ${call.vapiToken!.token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': call.idempotencyKey || `call:${call.tenantId}:${call.id}`,
      },
    });

    return response.data;
  }

  private async executeElevenLabsCall(call: Call) {
    logger.info(`Dispatch ElevenLabs call_id=${call.id} to=${maskPhone(call.customerNumber)}`);

    return ElevenLabsVoiceProvider.startCall({
      credential: call.elevenLabToken!.token,
      agentId: call.assistantId,
      phoneNumberId: call.phoneNumberId,
      toNumber: call.customerNumber,
      correlationId: call.idempotencyKey || `call:${call.tenantId}:${call.id}`,
    });
  }

  async startScheduler(initialIntervalSeconds: number = 60, tenantId: number): Promise<void> {
    let currentInterval = initialIntervalSeconds;

    const runScheduler = async () => {
      let intervalSeconds = 60;
      try {
        const setting = await SettingsService.getSettingByType('interval', tenantId);
        if (setting && setting.value && !isNaN(Number(setting.value))) {
          intervalSeconds = Number(setting.value);
        }
      } catch (error) {
        logger.warn(`Tenant ${tenantId}: não foi possível ler interval; usando 60s`);
      }

      if (this.tenantSchedulers[tenantId] && intervalSeconds !== currentInterval) {
        clearInterval(this.tenantSchedulers[tenantId].intervalId);
        currentInterval = intervalSeconds;
        const intervalId = setInterval(runScheduler, intervalSeconds * 1000);
        this.tenantSchedulers[tenantId] = { intervalId, currentInterval: intervalSeconds };
        logger.info(`Tenant ${tenantId}: scheduler alterado para ${intervalSeconds}s`);
        return;
      }

      await this.processScheduledCallsForTenant(tenantId);
    };

    if (this.tenantSchedulers[tenantId]) {
      clearInterval(this.tenantSchedulers[tenantId].intervalId);
    }

    const intervalId = setInterval(runScheduler, currentInterval * 1000);
    this.tenantSchedulers[tenantId] = { intervalId, currentInterval };
    logger.info(`Tenant ${tenantId}: scheduler iniciado com ${currentInterval}s`);
    await runScheduler();
  }

  async processScheduledCallsForTenant(tenantId: number): Promise<void> {
    if (!this.dispatchEnabled()) return;
    try {
      const calls = await this.findPendingCalls(tenantId);
      logger.info(`Tenant ${tenantId}: ${calls.length} chamada(s) pendente(s)`);
      for (const call of calls) await this.processOne(call);
    } catch (error) {
      logger.error(`Tenant ${tenantId}: erro no scheduler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async preflightCallById(callId: number, tenantId: number): Promise<unknown> {
    if (!this.preflightEnabled()) {
      throw new Error('Voice preflight está desabilitado por feature flag');
    }

    const call = await Call.findOne({
      where: { id: callId, tenantId },
      include: this.includeProviders(),
    });
    if (!call) throw new Error('Call não encontrada');
    if (call.executed || call.dispatchState !== 'pending') {
      throw new Error(`Call não elegível para preflight: state=${call.dispatchState} executed=${call.executed}`);
    }

    const valid = await this.validatePhoneNumberAndWavoipToken(call);
    if (!valid) throw new Error('Validação de provider/policy falhou');

    return {
      ok: true,
      callId: call.id,
      provider: call.elevenLabTokenId ? 'elevenlabs' : 'vapi',
      dispatchState: call.dispatchState,
      idempotencyKeyPresent: Boolean(call.idempotencyKey),
      networkDispatchPerformed: false,
    };
  }

  public async executeCallById(callId: number, tenantId: number): Promise<unknown> {
    if (!this.dispatchEnabled()) {
      throw new Error('Voice dispatch está desabilitado por feature flag');
    }

    const call = await Call.findOne({
      where: { id: callId, tenantId },
      include: this.includeProviders(),
    });
    if (!call) throw new Error('Call não encontrada');
    if (call.executed || call.dispatchState !== 'pending') {
      throw new Error(`Call não elegível para dispatch: state=${call.dispatchState} executed=${call.executed}`);
    }

    const isValid = await this.validatePhoneNumberAndWavoipToken(call);
    if (!isValid) throw new Error('Validação de provider falhou');

    const claimed = await this.claimForDispatch(call);
    if (!claimed) throw new Error('Call já foi reivindicada por outro worker');

    try {
      const response = await this.executeCall(call);
      await this.completeDispatch(call, response);
      await CallLogService.createCallLog({
        callId: call.id,
        option: this.responseSummary(response),
      }, call.tenantId);
      return response;
    } catch (error) {
      await Call.update(
        { dispatchState: 'unknown' },
        { where: { id: call.id, tenantId: call.tenantId, dispatchState: 'dispatching' } },
      );
      await CallLogService.createCallLog({
        callId: call.id,
        option: 'dispatch_state=unknown; automatic_retry=false',
      }, call.tenantId);
      throw error;
    }
  }
}

export default new CallSchedulerService();
