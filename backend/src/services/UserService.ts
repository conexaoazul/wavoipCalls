import User from '../models/User';
import logger from '../utils/logger';
import { timingSafeEqual } from 'crypto';

class UserService {
  async createUser(data: any, tenantId: number) {
    return User.create({ ...data, tenantId });
  }

  async getUserById(id: number, tenantId: number) {
    return User.findOne({ where: { id, tenantId } });
  }

  async updateUser(id: number, data: any, tenantId: number) {
    return User.update(data, { where: { id, tenantId } });
  }

  async deleteUser(id: number, tenantId: number) {
    return User.destroy({ where: { id, tenantId } });
  }

  async verifyToken(token: string): Promise<{ valid: boolean }> {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }
      const tokenBuffer = Buffer.from(token);
      const secretBuffer = Buffer.from(secret);
      if (tokenBuffer.length !== secretBuffer.length || !timingSafeEqual(tokenBuffer, secretBuffer)) {
        return { valid: false };
      }
      return { valid: true };
    } catch (error) {
      logger.error('Erro ao verificar token: ' + (error instanceof Error ? error.message : String(error)));
      return { valid: false };
    }
  }
}

export default new UserService(); 