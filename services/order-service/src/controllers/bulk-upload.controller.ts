import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaEventService } from '../services/kafka-event.service';
import { ApiTags } from '@nestjs/swagger';

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Bulk Upload')
@Controller('orders/bulk')
@UseGuards(JwtAuthGuard)
export class BulkUploadController {
  private readonly logger = new Logger('BulkUploadController');

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaEvent: KafkaEventService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { 
    storage: diskStorage({ destination: os.tmpdir() }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(new BadRequestException('Only Excel and CSV files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as { row: number, message: string }[]
    };

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file.path, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      worksheets: 'emit',
    });

    try {
      let sheetIndex = 0;
      for await (const worksheetReader of workbookReader) {
        sheetIndex++;
        // Only process the first sheet
        if (sheetIndex !== 1) continue;

        let isHeader = true;
        let headers: string[] = [];

        for await (const row of worksheetReader) {
          if (isHeader) {
            headers = row.values as string[];
            isHeader = false;
            continue;
          }
          
          results.total++;
          const rowData = row.values as any[];
          // ExcelJS row.values starts at index 1
          const mapRow = (colName: string) => {
            const idx = headers.indexOf(colName);
            return idx > -1 ? rowData[idx] : undefined;
          };

          const name = mapRow('Recipient Name') || mapRow('Name');
          const phone = mapRow('Phone');
          const address = mapRow('Address');
          const cod = mapRow('COD');
          const fee = mapRow('Fee');
          const orderRef = mapRow('OrderRef');
          const sku = mapRow('SKU');
          const qty = mapRow('Qty');
          
          try {
            await this.prisma.tenantClient.$transaction(async (tx: any) => {
              if (!name || !phone || !address) {
                throw new Error(`Missing mandatory info (Name, Phone, or Address)`);
              }

              const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
              const trackingCode = `SLG-${dateStr}-${randomSuffix}`;

              const order = await tx.order.create({
                data: {
                  trackingCode,
                  recipientName: String(name),
                  recipientPhone: String(phone),
                  recipientAddress: String(address),
                  codAmount: Number(cod) || 0,
                  shippingFee: Number(fee) || 0,
                  clientOrderRef: orderRef ? String(orderRef) : undefined,
                  status: 'NEW',
                }
              });

              await tx.orderTrackingEvent.create({
                data: {
                  orderId: order.id,
                  status: 'NEW',
                  location: 'System',
                  description: 'Order created via Bulk Upload',
                }
              });

              if (sku && qty) {
                 const product = await tx.product.findUnique({ where: { sku: String(sku) } });
                 if (product) {
                   await tx.orderItem.create({
                     data: {
                       orderId: order.id,
                       productId: product.id,
                       quantity: Number(qty)
                     }
                   });
                 }
              }
            });
            results.success++;
          } catch (e: any) {
            results.failed++;
            results.errors.push({ row: results.total + 1, message: e?.message || 'Unknown error' });
          }
        }
      }
    } finally {
      // Clean up temp file to free up disk space
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    if (results.success > 0) {
      this.kafkaEvent.emit('order.bulk_uploaded', {
        totalUploaded: results.success,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }
}
