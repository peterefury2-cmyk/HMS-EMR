import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get billing summary' })
  getSummary(@Request() req) {
    return this.billingService.getBillingSummary(req.user.tenantId);
  }

  @Get('invoices')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Request() req) {
    return this.billingService.findAllInvoices(req.user.tenantId);
  }

  @Post('invoices')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create invoice' })
  create(@Request() req, @Body() body: any) {
    return this.billingService.createInvoice(body, req.user.tenantId);
  }

  @Get('invoices/:id')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.billingService.findOneInvoice(id, req.user.tenantId);
  }

  @Patch('invoices/:id')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update invoice' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.billingService.updateInvoice(id, req.user.tenantId, body);
  }

  @Post('payments')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Process payment' })
  processPayment(@Request() req, @Body() body: any) {
    return this.billingService.processPayment(body, req.user.tenantId);
  }
}
