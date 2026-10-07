export interface VoiceCallRequest {
  credential: string;
  agentId: string;
  phoneNumberId: string;
  toNumber: string;
  conversationInitiationClientData?: Record<string, unknown>;
  correlationId?: string;
}

export interface VoiceCallStartResult {
  provider: string;
  providerCallId?: string;
  conversationId?: string;
  sipCallId?: string;
  raw: unknown;
}

export interface VoiceProvider {
  readonly name: string;
  startCall(request: VoiceCallRequest): Promise<VoiceCallStartResult>;
}
