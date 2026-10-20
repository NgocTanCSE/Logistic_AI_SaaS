import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import type { Permission } from "../permissions"

@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Read metadata directly from reflect-metadata instead of injecting Nest's
    // Reflector. This avoids DI token mismatches when this package resolves a
    // different copy of @nestjs/core than the host application (pnpm deploy).
    const required =
      (Reflect.getMetadata("permissions", context.getHandler()) as
        | Permission[]
        | undefined) ??
      (Reflect.getMetadata("permissions", context.getClass()) as
        | Permission[]
        | undefined)

    if (!required || required.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()

    // Super admins are platform-level operators and intentionally bypass the
    // tenant permission matrix. They can never be auto-provisioned (see IAM
    // Google login), so this does not widen the self-service attack surface.
    if (request?.user?.role === 'SUPER_ADMIN') {
      return true
    }

    const permissions: string[] | undefined = request?.user?.permissions

    if (!permissions) {
      return false
    }

    return required.every((perm: string) => permissions.includes(perm))
  }
}
