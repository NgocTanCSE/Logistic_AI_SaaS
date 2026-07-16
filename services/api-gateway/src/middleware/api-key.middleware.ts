import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const API_KEY_PATHS = [
  '/api/v1/public',
  '/api/v1/client',
  '/api/v1/webhooks',
];

const BYPASS_PATHS = [
  '/api/v1/public/track',
  '/api/v1/public/verify',
];

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiKeyMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];

    if (!this.requiresApiKey(path)) {
      return next();
    }

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(401).json({
        statusCode: 401,
        message: 'Missing X-API-Key header',
        error: 'Unauthorized',
      });
      return;
    }

    const authHeader = req.headers.authorization as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    this.logger.debug(`API key validation skipped (delegated to IAM service): ${path}`);
    next();
  }

  private requiresApiKey(path: string): boolean {
    if (BYPASS_PATHS.some((bp) => path.startsWith(bp))) {
      return false;
    }
    return API_KEY_PATHS.some((prefix) => path.startsWith(prefix));
  }
}
