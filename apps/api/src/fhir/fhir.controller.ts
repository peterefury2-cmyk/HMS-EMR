import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FhirService } from './fhir.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { FhirCapabilityStatement, FhirPatient, FhirEncounter, FhirBundle } from './interfaces/fhir.interfaces';

@ApiTags('FHIR R4')
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'FHIR Capability Statement (no auth required)' })
  getMetadata(): FhirCapabilityStatement { return this.fhirService.getCapabilityStatement(); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Patient/:id') @ApiOperation({ summary: 'Get patient by ID in FHIR format' }) @ApiParam({ name: 'id', description: 'Patient ID' })
  async getPatient(@Param('id') id: string, @TenantId() tenantId: string): Promise<FhirPatient> { return this.fhirService.getPatient(id, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Patient') @ApiOperation({ summary: 'Search patients in FHIR format' }) @ApiQuery({ name: 'name', required: false })
  async searchPatients(@TenantId() tenantId: string, @Query('name') name?: string): Promise<FhirBundle> { return this.fhirService.searchPatients(tenantId, name); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Encounter/:id') @ApiOperation({ summary: 'Get encounter by ID in FHIR format' })
  async getEncounter(@Param('id') id: string, @TenantId() tenantId: string): Promise<FhirEncounter> { return this.fhirService.getEncounter(id, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Encounter') @ApiOperation({ summary: 'Search encounters in FHIR format' }) @ApiQuery({ name: 'patient', required: false })
  async searchEncounters(@TenantId() tenantId: string, @Query('patient') patientId?: string): Promise<FhirBundle> { return this.fhirService.searchEncounters(tenantId, patientId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Observation') @ApiOperation({ summary: 'Get observations for a visit' }) @ApiQuery({ name: 'visit', required: true })
  async getObservations(@TenantId() tenantId: string, @Query('visit') visitId: string): Promise<FhirBundle> { return this.fhirService.getObservations(visitId, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('Condition') @ApiOperation({ summary: 'Get conditions for a visit' }) @ApiQuery({ name: 'visit', required: true })
  async getConditions(@TenantId() tenantId: string, @Query('visit') visitId: string): Promise<FhirBundle> { return this.fhirService.getConditions(visitId, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('MedicationRequest') @ApiOperation({ summary: 'Get medication requests for a patient' }) @ApiQuery({ name: 'patient', required: true })
  async getMedicationRequests(@TenantId() tenantId: string, @Query('patient') patientId: string): Promise<FhirBundle> { return this.fhirService.getMedicationRequests(patientId, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('DiagnosticReport') @ApiOperation({ summary: 'Get diagnostic reports for a patient' }) @ApiQuery({ name: 'patient', required: true })
  async getDiagnosticReports(@TenantId() tenantId: string, @Query('patient') patientId: string): Promise<FhirBundle> { return this.fhirService.getDiagnosticReports(patientId, tenantId); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('AllergyIntolerance') @ApiOperation({ summary: 'Get allergy intolerances for a patient' }) @ApiQuery({ name: 'patient', required: true })
  async getAllergyIntolerances(@TenantId() tenantId: string, @Query('patient') patientId: string): Promise<FhirBundle> { return this.fhirService.getAllergyIntolerances(patientId, tenantId); }
}
