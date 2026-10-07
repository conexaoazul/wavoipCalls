import ElevenLabToken from '../models/ElevenLabToken';
import axios from 'axios';

class ElevenLabTokenService {
  async createElevenLabToken(data: any, tenantId: number) {
    return ElevenLabToken.create({ ...data, tenantId });
  }

  async getElevenLabTokenById(id: number, tenantId: number) {
    return ElevenLabToken.findOne({ where: { id, tenantId } });
  }

  async updateElevenLabToken(id: number, data: any, tenantId: number) {
    await ElevenLabToken.update(data, { where: { id, tenantId } });
    return ElevenLabToken.findOne({ where: { id, tenantId } });
  }

  async deleteElevenLabToken(id: number, tenantId: number) {
    return ElevenLabToken.destroy({ where: { id, tenantId } });
  }

  async listAgents(elevenLabToken: string) {
    const response = await axios.get('https://api.elevenlabs.io/v1/convai/agents', {
      timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
      headers: {
        'xi-api-key': elevenLabToken,
      },
    });

    return response.data;
  }

  async listPhoneNumbers(elevenLabToken: string) {
    const response = await axios.get('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
      headers: {
        'xi-api-key': elevenLabToken,
      },
    });

    return response.data;
  }

  async getElevenLabTokensByTenant(tenantId: number) {
    return ElevenLabToken.findAll({ where: { tenantId } });
  }
}

export default new ElevenLabTokenService();
