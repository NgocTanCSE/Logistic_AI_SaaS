import { Body, Controller, Post, Get, Patch, UseGuards, Req, Headers } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { LoginResponse } from "../shared-types"
import { LoginRequestDto } from "../dtos/login.dto"
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, UpdateProfileDto } from "../dtos/forgot-password.dto"
import { AuthService } from "../auth/auth.service"
import { ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from "../auth/jwt-auth.guard"

@ApiTags('Client Auth')
@Controller("client/auth")
export class ClientAuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post("login")
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: LoginRequestDto,
    @Headers("x-tenant-slug") tenantSlug: string
  ): Promise<LoginResponse> {
    if (!tenantSlug) {
      return { ok: false, message: "Missing x-tenant-slug header" }
    }

    try {
      const result = await this.authService.loginTenantUser(tenantSlug, body.email, body.password);
      return {
        ok: true,
        accessToken: result.access_token,
      }
    } catch (error: any) {
      return { ok: false, message: error.message || "Invalid credentials" }
    }
  }

  @Post("forgot-password")
  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @Headers("x-tenant-slug") tenantSlug: string
  ): Promise<any> {
    if (!tenantSlug) {
      return { ok: false, message: "Missing x-tenant-slug header" }
    }
    return this.authService.forgotPasswordTenantUser(tenantSlug, body.email);
  }

  @Post("reset-password")
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Headers("x-tenant-slug") tenantSlug: string
  ): Promise<any> {
    if (!tenantSlug) {
      return { ok: false, message: "Missing x-tenant-slug header" }
    }
    return this.authService.resetPasswordTenantUser(tenantSlug, body.email, body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: any,
  ): Promise<any> {
    return this.authService.changePasswordTenantUser(req.user.sub, req.user.email, body.oldPassword, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() req: any): Promise<any> {
    return this.authService.getProfileTenantUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(@Body() body: UpdateProfileDto, @Req() req: any): Promise<any> {
    return this.authService.updateProfileTenantUser(req.user.sub, body);
  }
}
