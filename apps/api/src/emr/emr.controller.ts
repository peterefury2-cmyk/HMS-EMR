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
import { VisitStatus } from '@prisma/client';
import { EmrService } from './emr.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { RecordVitalsDto } from './dto/record-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { RequestWithUser } from '../common/types/request-with-user.type';

@ApiTags('EMR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emr')
export class EmrController {
  constructor(private readonly emrService: EmrService) {}

  @Post('visits')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Create a new visit' })
  createVisit(@Request() req: RequestWithUser, @Body() body: CreateVisitDto) {
    return this.emrService.createVisit(body, req.user.tenantId as string);
  }

  @Get('visits/:id')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Get visit details' })
  getVisit(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.emrService.getVisit(id, req.user.tenantId as string);
  }

  @Post('visits/:id/notes')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Add clinical note to visit' })
  addNote(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: CreateClinicalNoteDto,
  ) {
    const dto: CreateClinicalNoteDto = { ...body, authorId: req.user.userId };
    return this.emrService.addClinicalNote(id, dto, req.user.tenantId as string);
  }

  @Post('visits/:id/vitals')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Record vital signs' })
  recordVitals(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: RecordVitalsDto,
  ) {
    return this.emrService.recordVitals(id, body, req.user.tenantId as string);
  }

  @Post('visits/:id/diagnoses')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Add diagnosis to visit' })
  addDiagnosis(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: CreateDiagnosisDto,
  ) {
    return this.emrService.addDiagnosis(id, body, req.user.tenantId as string);
  }

  @Patch('visits/:id/status')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Update visit status' })
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { status: VisitStatus },
  ) {
    return this.emrService.updateVisitStatus(id, body.status, req.user.tenantId as string);
  }

  @Get('patients/:id/history')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Get patient visit history' })
  getHistory(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.emrService.getPatientHistory(id, req.user.tenantId as string);
  }
}
