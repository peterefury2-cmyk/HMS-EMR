import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LaboratoryService } from './laboratory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { LabOrderStatus } from '@prisma/client';

interface RequestWithUser extends Request {
  user: { tenantId: string };
}

@ApiTags('Laboratory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get('tests')
  @Roles(Role.LAB_SCIENTIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List lab tests' })
  findAllTests(@Request() req: RequestWithUser) {
    return this.laboratoryService.findAllTests(req.user.tenantId);
  }

  @Get('orders')
  @Roles(Role.LAB_SCIENTIST, Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List lab orders' })
  findAllOrders(@Request() req: RequestWithUser) {
    return this.laboratoryService.findAllOrders(req.user.tenantId);
  }

  @Post('orders')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Create lab order' })
  createOrder(@Request() req: RequestWithUser, @Body() body: CreateLabOrderDto) {
    return this.laboratoryService.createOrder(body, req.user.tenantId);
  }

  @Patch('orders/:id/status')
  @Roles(Role.LAB_SCIENTIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update lab order status' })
  updateOrderStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { status: LabOrderStatus },
  ) {
    return this.laboratoryService.updateOrderStatus(id, body.status, req.user.tenantId);
  }

  @Patch('order-items/:id/result')
  @Roles(Role.LAB_SCIENTIST)
  @ApiOperation({ summary: 'Record lab result' })
  recordResult(@Param('id') id: string, @Body() body: EnterResultDto) {
    return this.laboratoryService.enterResult(id, body);
  }

  @Get('critical-alerts')
  @Roles(Role.LAB_SCIENTIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get critical lab results' })
  getCriticalAlerts(@Request() req: RequestWithUser) {
    return this.laboratoryService.getCriticalAlerts(req.user.tenantId);
  }
}
