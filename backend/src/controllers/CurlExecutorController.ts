import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

interface CurlRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function allowedHosts(): Set<string> {
  return new Set(
    String(process.env.CURL_EXECUTOR_ALLOWED_HOSTS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function sanitizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const defaults = new Set(['accept', 'content-type', 'x-request-id']);
  const extra = String(process.env.CURL_EXECUTOR_ALLOWED_HEADERS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allow = new Set([...defaults, ...extra]);

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (allow.has(key.toLowerCase())) result[key] = value;
  }
  return result;
}

class CurlExecutorController {
  async executeCurl(req: Request, res: Response) {
    if (process.env.ENABLE_CURL_EXECUTOR !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const { method, url, headers, body }: CurlRequest = req.body;
      if (!url || !method) {
        return res.status(400).json({ error: 'method e url são obrigatórios' });
      }

      const parsed = new URL(url);
      const hosts = allowedHosts();
      if (!hosts.size || !hosts.has(parsed.hostname.toLowerCase())) {
        return res.status(403).json({ error: 'Host não permitido' });
      }
      if (parsed.protocol !== 'https:') {
        return res.status(403).json({ error: 'Somente HTTPS é permitido' });
      }

      const normalizedMethod = method.toLowerCase();
      if (!['get', 'post'].includes(normalizedMethod)) {
        return res.status(405).json({ error: 'Método não permitido' });
      }

      const config: any = {
        method: normalizedMethod,
        url: parsed.toString(),
        headers: {
          ...sanitizeHeaders(headers),
          'User-Agent': 'MagicaVoice-AllowlistedHttp/2.0',
        },
        timeout: Number(process.env.CURL_EXECUTOR_TIMEOUT_MS || 10000),
        maxRedirects: 0,
        validateStatus: () => true,
      };

      if (body !== undefined && normalizedMethod === 'post') config.data = body;
      const response: AxiosResponse = await axios(config);

      res.json({
        status: response.status,
        headers: {
          'content-type': response.headers['content-type'],
          'x-request-id': response.headers['x-request-id'],
        },
        data: response.data,
      });
    } catch (error) {
      logger.error('Erro no executor HTTP allowlisted: ' + (error instanceof Error ? error.message : String(error)));
      res.status(502).json({ error: 'Falha na requisição allowlisted' });
    }
  }
}

export default new CurlExecutorController();
