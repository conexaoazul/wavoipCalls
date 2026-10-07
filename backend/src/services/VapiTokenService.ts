import VapiToken from '../models/VapiToken';
import axios from 'axios';

class VapiTokenService {
  async createVapiToken(data: any, tenantId: number) {
    return VapiToken.create({ ...data, tenantId });
  }

  async getVapiTokenById(id: number, tenantId: number) {
    return VapiToken.findOne({ where: { id, tenantId } });
  }

  async updateVapiToken(id: number, data: any, tenantId: number) {
    await VapiToken.update(data, { where: { id, tenantId } });
    return VapiToken.findOne({ where: { id, tenantId } });
  }

  async deleteVapiToken(id: number, tenantId: number) {
    return VapiToken.destroy({ where: { id, tenantId } });
  }

  async listAssistants(vapiToken: string) {
    const response = await axios.get('https://api.vapi.ai/assistant', {
      timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
      headers: {
        'Authorization': `Bearer ${vapiToken}`,
      },
    });

    return response.data;
  }

  async listPhoneNumbers(vapiToken: string) {
    const response = await axios.get('https://api.vapi.ai/phone-number', {
      timeout: Number(process.env.VOICE_PROVIDER_TIMEOUT_MS || 10000),
      headers: {
        'Authorization': `Bearer ${vapiToken}`,
      },
    });

    return response.data;
  }

  async getVapiTokensByTenant(tenantId: number) {
    return VapiToken.findAll({ where: { tenantId } });
  }
}

export default new VapiTokenService(); 