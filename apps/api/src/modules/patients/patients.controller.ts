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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List patients' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Request() req: any, @Query('search') search?: string) {
    return this.patientsService.findAll(req.user.tenantId, search);
  }

  @Post()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Register a new patient' })
  create(@Request() req: any, @Body() body: any) {
    return this.patientsService.create(body, req.user.tenantId);
  }

  @Get(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Get patient by ID' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.patientsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update patient' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.patientsService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Delete patient' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.patientsService.remove(id, req.user.tenantId);
  }
}
