import axios from 'axios';
import { VoiceCallRequest, VoiceCallStartResult, VoiceProvider } from './VoiceProvider';

class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly name = 'elevenlabs';

  async startCall(request: VoiceCallRequest): Promise<VoiceCallStartResult> {
    const timeoutMs = Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000);

    // Deliberately no automatic retry for POST: an upstream timeout can be
    // ambiguous (the provider may already have accepted the call).
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call',
      {
        agent_id: request.agentId,
        agent_phone_number_id: request.phoneNumberId,
        to_number: request.toNumber,
        conversation_initiation_client_data: request.conversationInitiationClientData,
      },
      {
        timeout: timeoutMs,
        headers: {
          'xi-api-key': request.credential,
          'Content-Type': 'application/json',
          ...(request.correlationId ? { 'X-Request-ID': request.correlationId } : {}),
        },
      },
    );

    const data = response.data || {};
    return {
      provider: this.name,
      providerCallId: data.call_id || data.provider_call_id,
      conversationId: data.conversation_id,
      sipCallId: data.sip_call_id,
      raw: data,
    };
  }
}

export default new ElevenLabsVoiceProvider();
