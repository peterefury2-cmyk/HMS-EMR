import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmrService } from './emr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('EMR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emr')
export class EmrController {
  constructor(private readonly emrService: EmrService) {}

  @Post('visits')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Create a new visit' })
  createVisit(@Request() req, @Body() body: any) {
    return this.emrService.createVisit(body, req.user.tenantId);
  }

  @Get('visits/:id')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Get visit details' })
  getVisit(@Request() req, @Param('id') id: string) {
    return this.emrService.getVisit(id, req.user.tenantId);
  }

  @Post('visits/:id/notes')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Add clinical note to visit' })
  addNote(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.emrService.addClinicalNote(id, { ...body, authorId: req.user.userId }, req.user.tenantId);
  }

  @Post('visits/:id/vitals')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Record vital signs' })
  recordVitals(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.emrService.recordVitals(id, body, req.user.tenantId);
  }

  @Post('visits/:id/diagnoses')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Add diagnosis to visit' })
  addDiagnosis(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.emrService.addDiagnosis(id, body, req.user.tenantId);
  }

  @Patch('visits/:id/status')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Update visit status' })
  updateStatus(@Request() req, @Param('id') id: string, @Body() body: { status: string }) {
    return this.emrService.updateVisitStatus(id, body.status, req.user.tenantId);
  }

  @Get('patients/:id/history')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Get patient visit history' })
  getHistory(@Request() req, @Param('id') id: string) {
    return this.emrService.getPatientHistory(id, req.user.tenantId);
  }
}
