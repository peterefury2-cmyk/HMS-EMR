import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List appointments' })
  findAll(
    @Request() req,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('date') date?: string,
  ) {
    return this.appointmentsService.findAll(req.user.tenantId, { doctorId, patientId, date });
  }

  @Post()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create appointment' })
  create(@Request() req, @Body() body: any) {
    return this.appointmentsService.create(body, req.user.tenantId);
  }

  @Get(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update appointment' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.appointmentsService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Cancel appointment' })
  cancel(@Request() req, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, req.user.tenantId);
  }
}
