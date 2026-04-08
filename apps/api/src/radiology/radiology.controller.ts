import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RadiologyService } from './radiology.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Radiology')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('radiology')
export class RadiologyController {
  constructor(private readonly radiologyService: RadiologyService) {}

  @Get('orders')
  @Roles(Role.RADIOLOGIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List radiology orders' })
  findAll(@Request() req) {
    return this.radiologyService.findAll(req.user.tenantId);
  }

  @Post('orders')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create radiology order' })
  create(@Request() req, @Body() body: any) {
    return this.radiologyService.create(body, req.user.tenantId);
  }

  @Get('orders/:id')
  @Roles(Role.RADIOLOGIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get radiology order' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.radiologyService.findOne(id, req.user.tenantId);
  }

  @Patch('orders/:id')
  @Roles(Role.RADIOLOGIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update radiology order' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.radiologyService.update(id, req.user.tenantId, body);
  }

  @Post('orders/:id/report')
  @Roles(Role.RADIOLOGIST)
  @ApiOperation({ summary: 'Add radiology report' })
  addReport(@Request() req, @Param('id') id: string, @Body() body: { report: string }) {
    return this.radiologyService.addReport(id, req.user.tenantId, body.report, req.user.userId);
  }
}
