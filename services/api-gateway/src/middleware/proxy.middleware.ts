import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SERVICES, ROUTE_MAP, PUBLIC_PATHS } from '../config/services.config';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private readonly circuitStates: Map<string, CircuitState> = new Map();
  private readonly maxFailures = 5;
  private readonly resetTimeoutMs = 30000;

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];

    if (PUBLIC_PATHS.includes(path)) {
      return next();
    }

    const targetUrl = this.resolveTarget(path);
    if (!targetUrl) {
      return next();
    }

    const serviceName = this.getServiceName(path);
    if (serviceName && this.isCircuitOpen(serviceName)) {
      this.logger.warn(`Circuit open for ${serviceName}, returning 503`);
      res.status(503).json({
        statusCode: 503,
        message: `Service ${serviceName} is temporarily unavailable`,
        error: 'Service Unavailable',
      });
      return;
    }

    const fullUrl = `${targetUrl}${req.originalUrl}`;
    this.logger.debug(`Proxying ${req.method} ${path} -> ${fullUrl}`);

    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] || 'application/json',
      'x-request-id': this.generateRequestId(),
    };

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string;
    }
    if (req.headers['x-tenant-id']) {
      headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;
    }
    if (req.headers['x-user-id']) {
      headers['x-user-id'] = req.headers['x-user-id'] as string;
    }
    if (req.headers['x-tenant-slug']) {
      headers['x-tenant-slug'] = req.headers['x-tenant-slug'] as string;
    }
    if (req.headers['x-mock-role']) {
      headers['x-mock-role'] = req.headers['x-mock-role'] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const timeoutMs = 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    fetch(fullUrl, fetchOptions)
      .then(async (upstreamRes) => {
        clearTimeout(timeoutId);
        if (!upstreamRes) {
          res.status(502).json({ statusCode: 502, message: 'Empty response from upstream', error: 'Bad Gateway' });
          return;
        }
        if (serviceName) this.recordSuccess(serviceName);
        res.status(upstreamRes.status);
        if (upstreamRes.headers && typeof upstreamRes.headers.forEach === 'function') {
          upstreamRes.headers.forEach((value, key) => {
            if (key !== 'transfer-encoding' && key !== 'connection') {
              res.setHeader(key, value);
            }
          });
        }
        const body = await upstreamRes.text();
        res.send(body);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (serviceName) this.recordFailure(serviceName);
        const errorMsg = error.name === 'AbortError' ? 'Request timeout' : error.message;
        this.logger.error(`Proxy error for ${serviceName || path}: ${errorMsg}`);
        res.status(error.name === 'AbortError' ? 504 : 502).json({
          statusCode: error.name === 'AbortError' ? 504 : 502,
          message: error.name === 'AbortError' ? 'Upstream service timeout' : 'Service unavailable',
          error: error.name === 'AbortError' ? 'Gateway Timeout' : 'Bad Gateway',
        });
      });
  }

  private getServiceName(path: string): string | null {
    for (const [prefix, name] of Object.entries(ROUTE_MAP)) {
      if (path.startsWith(prefix)) return name;
    }
    return null;
  }

  private resolveTarget(path: string): string | null {
    for (const [prefix, name] of Object.entries(ROUTE_MAP)) {
      if (path.startsWith(prefix)) {
        const service = SERVICES.find(s => s.name === name);
        return service ? service.url : null;
      }
    }
    return null;
  }

  private isCircuitOpen(serviceName: string): boolean {
    const state = this.circuitStates.get(serviceName);
    if (!state || !state.isOpen) return false;
    if (Date.now() - state.lastFailureTime > this.resetTimeoutMs) {
      state.isOpen = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  private recordSuccess(serviceName: string) {
    const state = this.circuitStates.get(serviceName);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
    }
  }

  private recordFailure(serviceName: string) {
    const now = Date.now();
    let state = this.circuitStates.get(serviceName);
    if (!state) {
      state = { failures: 0, lastFailureTime: now, isOpen: false };
      this.circuitStates.set(serviceName, state);
    }
    state.failures++;
    state.lastFailureTime = now;
    if (state.failures >= this.maxFailures) {
      state.isOpen = true;
      this.logger.warn(`Circuit opened for ${serviceName} after ${state.failures} failures`);
    }
  }

  private generateRequestId(): string {
    return `gw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
