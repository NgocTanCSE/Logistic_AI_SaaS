import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Param, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { S3Service } from '../services/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Upload')
@Controller('mobile/uploads')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Post('pod/:deliveryId')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        return cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async uploadPOD(
    @Param('deliveryId') deliveryId: string,
    @UploadedFile() file: any,
    @Body('type') type: 'IMAGE' | 'SIGNATURE',
    @Body('codCollected') codCollected?: string,
  ) {
    // 1. Upload to S3/MinIO
    const folder = type === 'SIGNATURE' ? 'signatures' : 'pod';
    const result = await this.s3Service.uploadFile(file, folder);

    // 2. Cập nhật thông tin Delivery
    const updateData: any = {};
    if (type === 'SIGNATURE') {
      updateData.podSignatureUrl = result.url;
    } else {
      updateData.podImageUrl = result.url;
    }

    if (codCollected) {
      updateData.codAmountCollected = parseFloat(codCollected);
    }

    // Nếu đã có cả ảnh và chữ ký (hoặc chỉ cần 1 tùy nghiệp vụ), đánh dấu thành công
    // Ở đây ta giả định nhận được ảnh là coi như thành công bước đầu
    updateData.status = 'DELIVERED';

    await this.prisma.tenantClient.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    });

    return { ok: true, url: result.url };
  }
}
