import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const API_KEY_PATHS = [
  '/api/v1/public',
  '/api/v1/client',
  '/api/v1/webhooks',
];

/**
 * Paths that must stay reachable WITHOUT an API key (and without a JWT),
 * otherwise users can never obtain a token in the first place.
 * Everything listed here is either a public endpoint or is protected
 * by its own guard inside the target service (e.g. JwtAuthGuard).
 */
const BYPASS_PATHS = [
  '/api/v1/public/track',
  '/api/v1/public/verify',
  // Auth endpoints under /api/v1/client/* (login, google, forgot/reset password).
  // NOTE: /api/v1/client/auth/change-password is still protected by JwtAuthGuard
  // in iam-service, so bypassing only the API-key check is safe.
  '/api/v1/client/auth',
];

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiKeyMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];

    if (!this.requiresApiKey(path)) {
      return next();
    }

    // JWT-authenticated browser sessions are already verified by the target
    // service's JwtAuthGuard. They must not also need an API key, otherwise
    // every portal page (which sends a Bearer token) is rejected at the edge.
    const authHeader = req.headers.authorization as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Anonymous / server-to-server calls to API-key protected paths still
    // need the header. Phase 3 of the API-key track will validate the value.
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(401).json({
        statusCode: 401,
        message: 'Missing X-API-Key header',
        error: 'Unauthorized',
      });
      return;
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
