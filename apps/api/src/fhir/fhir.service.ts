import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapPatientToFhir } from './mappers/patient.mapper';
import { mapEncounterToFhir } from './mappers/encounter.mapper';
import { mapVitalsToFhir } from './mappers/observation.mapper';

interface FhirCapabilityStatement {
  resourceType: 'CapabilityStatement';
  id: string;
  status: string;
  date: string;
  kind: string;
  fhirVersion: string;
  format: string[];
  rest: Array<{
    mode: string;
    resource: Array<{ type: string; interaction: Array<{ code: string }> }>;
  }>;
}

interface FhirBundle<T> {
  resourceType: 'Bundle';
  type: string;
  total: number;
  entry: Array<{ resource: T }>;
}

@Injectable()
export class FhirService {
  constructor(private prisma: PrismaService) {}

  getCapabilityStatement(): FhirCapabilityStatement {
    return {
      resourceType: 'CapabilityStatement',
      id: 'hms-emr-fhir-capability',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
            { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
            { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          ],
        },
      ],
    };
  }

  async getPatients(tenantId: string): Promise<FhirBundle<ReturnType<typeof mapPatientToFhir>>> {
    const patients = await this.prisma.patient.findMany({ where: { tenantId } });
    const resources = patients.map(mapPatientToFhir);
    return { resourceType: 'Bundle', type: 'searchset', total: resources.length, entry: resources.map((r) => ({ resource: r })) };
  }

  async getPatient(id: string): Promise<ReturnType<typeof mapPatientToFhir> | null> {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    return patient ? mapPatientToFhir(patient) : null;
  }

  async getEncounters(tenantId: string): Promise<FhirBundle<ReturnType<typeof mapEncounterToFhir>>> {
    const visits = await this.prisma.visit.findMany({
      where: { tenantId },
      select: { id: true, patientId: true, doctorId: true, type: true, status: true, chiefComplaint: true, createdAt: true },
    });
    const resources = (visits as Array<{ id: string; patientId: string; doctorId: string; type: string; status: string; chiefComplaint: string | null; createdAt: Date }>).map(mapEncounterToFhir);
    return { resourceType: 'Bundle', type: 'searchset', total: resources.length, entry: resources.map((r) => ({ resource: r })) };
  }

  async getObservations(tenantId: string): Promise<FhirBundle<ReturnType<typeof mapVitalsToFhir>[number]>> {
    const vitalsList = await this.prisma.vitalSigns.findMany({
      where: { visit: { tenantId } },
      select: {
        id: true, visitId: true, temperature: true, bloodPressureSystolic: true,
        bloodPressureDiastolic: true, heartRate: true, respiratoryRate: true,
        oxygenSaturation: true, weight: true, height: true, bmi: true, recordedAt: true,
      },
    });
    const allObs = vitalsList.flatMap(mapVitalsToFhir);
    return { resourceType: 'Bundle', type: 'searchset', total: allObs.length, entry: allObs.map((r) => ({ resource: r })) };
  }
}
