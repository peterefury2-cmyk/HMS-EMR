import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FhirService } from './fhir.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('FHIR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'FHIR R4 Capability Statement' })
  getMetadata(): unknown {
    return this.fhirService.getCapabilityStatement();
  }

  @Get('Patient')
  @ApiOperation({ summary: 'Search FHIR Patient resources' })
  getPatients(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.fhirService.getPatients(tenantId);
  }

  @Get('Patient/:id')
  @ApiOperation({ summary: 'Get FHIR Patient resource by ID' })
  getPatient(@Param('id') id: string): Promise<unknown> {
    return this.fhirService.getPatient(id);
  }

  @Get('Encounter')
  @ApiOperation({ summary: 'Search FHIR Encounter resources' })
  getEncounters(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.fhirService.getEncounters(tenantId);
  }

  @Get('Observation')
  @ApiOperation({ summary: 'Search FHIR Observation resources' })
  getObservations(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.fhirService.getObservations(tenantId);
  }
}
