import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LaboratoryService } from './laboratory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Laboratory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get('tests')
  @Roles(Role.LAB_SCIENTIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List lab tests' })
  findAllTests(@Request() req: any) {
    return this.laboratoryService.findAllTests(req.user.tenantId);
  }

  @Post('tests')
  @Roles(Role.LAB_SCIENTIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create lab test' })
  createTest(@Request() req: any, @Body() body: any) {
    return this.laboratoryService.createTest(body, req.user.tenantId);
  }

  @Get('orders')
  @Roles(Role.LAB_SCIENTIST, Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List lab orders' })
  findAllOrders(@Request() req: any) {
    return this.laboratoryService.findAllOrders(req.user.tenantId);
  }

  @Post('orders')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Create lab order' })
  createOrder(@Request() req: any, @Body() body: any) {
    return this.laboratoryService.createOrder(body, req.user.tenantId);
  }

  @Patch('orders/:id')
  @Roles(Role.LAB_SCIENTIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update lab order status' })
  updateOrder(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.laboratoryService.updateOrder(id, req.user.tenantId, body);
  }

  @Patch('order-items/:id/result')
  @Roles(Role.LAB_SCIENTIST)
  @ApiOperation({ summary: 'Record lab result' })
  recordResult(@Param('id') id: string, @Body() body: { result: string; unit?: string }) {
    return this.laboratoryService.updateOrderItemResult(id, body.result, body.unit);
  }
}
