import { Controller, Get } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"

@ApiTags("Health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  @Get()
  health() {
    return { status: "ok", service: "inventory-service" }
  }
}
