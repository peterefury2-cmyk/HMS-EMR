import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TelemedicineService } from './telemedicine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Telemedicine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @Get('sessions')
  @Roles(Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List telemedicine sessions' })
  findAll(@Request() req) {
    return this.telemedicineService.findAll(req.user.tenantId);
  }

  @Post('sessions')
  @Roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create telemedicine session' })
  create(@Request() req, @Body() body: any) {
    return this.telemedicineService.create(body, req.user.tenantId);
  }

  @Get('sessions/:id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get session details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.telemedicineService.findOne(id, req.user.tenantId);
  }

  @Patch('sessions/:id')
  @Roles(Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update session' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.telemedicineService.update(id, req.user.tenantId, body);
  }

  @Post('sessions/:id/start')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Start telemedicine session' })
  start(@Request() req, @Param('id') id: string) {
    return this.telemedicineService.startSession(id, req.user.tenantId);
  }

  @Post('sessions/:id/end')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'End telemedicine session' })
  end(@Request() req, @Param('id') id: string) {
    return this.telemedicineService.endSession(id, req.user.tenantId);
  }
}
