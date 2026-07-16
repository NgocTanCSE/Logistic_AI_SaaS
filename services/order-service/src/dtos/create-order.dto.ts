import { IsString, MinLength } from "class-validator"

export class CreateOrderDto {
  @IsString()
  @MinLength(3)
  trackingCode!: string

  @IsString()
  @MinLength(2)
  recipient!: string
}
