import { Controller, Post, Body, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'smartlogi-jwt-secret';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('refresh-token')
  async refreshToken(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(body.refreshToken, {
        secret: REFRESH_SECRET,
      });

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        tenant_id: payload.tenant_id,
        schema_name: payload.schema_name,
        permissions: payload.permissions,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: REFRESH_SECRET,
        expiresIn: '7d',
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(`Refresh token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }
}