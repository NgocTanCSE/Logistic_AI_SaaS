import { Controller, Get, Post, Patch, Body, UseGuards, Query, Param, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { LogisticsService } from "../services/logistics.service"
import * as XLSX from "xlsx"
import { ApiTags } from "@nestjs/swagger"

const ALLOWED_EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Finance')
@Controller("logistics/finance")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get("remittances")
  @RequirePermissions(Permissions.TripsRead)
  async listRemittances(@Query() query: any) {
    return this.logisticsService.getRemittances(query)
  }

  @Patch("remittances/:id/status")
  @RequirePermissions(Permissions.TripsDispatch)
  async approveRemittance(@Param("id") id: string, @Body() body: { status: string }) {
    return this.logisticsService.updateRemittanceStatus(id, body.status)
  }

  @Post("reconcile")
  @RequirePermissions(Permissions.TripsDispatch)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_EXCEL_MIMES.includes(file.mimetype)) {
        return cb(new BadRequestException('Only Excel and CSV files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async reconcileBankStatement(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // 1. Đọc file Excel từ ngân hàng
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    // 2. Map data sang format chuẩn (Reference, Amount, Date)
    const entries = data.map(row => ({
      reference: String(row['Reference'] || row['Nội dung'] || ''),
      amount: Number(row['Amount'] || row['Số tiền'] || 0),
      transactionDate: String(row['Date'] || row['Ngày'] || ''),
    }));

    // 3. Thực hiện đối soát
    return this.logisticsService.reconcileBankStatement(entries);
  }

  @Get("expenses")
  @RequirePermissions(Permissions.TripsRead)
  async listExpenses(@Query("driverId") driverId: string) {
    return this.logisticsService.getDriverExpenses(driverId)
  }

  @Get("sos")
  @RequirePermissions(Permissions.TripsRead)
  async listSos(@Query("status") status: string) {
    return this.logisticsService.getSosAlerts(status)
  }

  @Patch("sos/:id/resolve")
  @RequirePermissions(Permissions.TripsDispatch)
  async resolveSos(@Param("id") id: string, @Body() body: { status: string }) {
    return this.logisticsService.resolveSos(id, body.status)
  }

  @Post("ai/feedback")
  @RequirePermissions(Permissions.TripsDispatch)
  async submitAiFeedback(@Body() body: any) {
    return this.logisticsService.submitAiFeedback(body)
  }
}
