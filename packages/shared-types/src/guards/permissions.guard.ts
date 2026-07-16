import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Permission } from "../permissions"

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      "permissions",
      [context.getHandler(), context.getClass()]
    )

    if (!required || required.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const permissions: string[] | undefined = request?.user?.permissions

    if (!permissions) {
      return false
    }

    return required.every((perm: string) => permissions.includes(perm))
  }
}
