import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FhirResourceType } from '@prisma/client';
import { FhirPatient, FhirEncounter, FhirBundle, FhirCapabilityStatement, FhirObservation, FhirCondition, FhirMedicationRequest, FhirDiagnosticReport, FhirAllergyIntolerance, FhirResource } from './interfaces/fhir.interfaces';
import { PatientMapper } from './mappers/patient.mapper';
import { EncounterMapper } from './mappers/encounter.mapper';
import { ObservationMapper } from './mappers/observation.mapper';
import { ConditionMapper } from './mappers/condition.mapper';
import { MedicationRequestMapper } from './mappers/medication-request.mapper';
import { DiagnosticReportMapper } from './mappers/diagnostic-report.mapper';
import { AllergyIntoleranceMapper } from './mappers/allergy-intolerance.mapper';

@Injectable()
export class FhirService {
  constructor(private prisma: PrismaService) {}

  getCapabilityStatement(): FhirCapabilityStatement {
    return {
      resourceType: 'CapabilityStatement',
      id: 'hms-emr-capability',
      status: 'active',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['application/fhir+json'],
      date: new Date().toISOString(),
      software: { name: 'HMS-EMR', version: '2.0.0' },
      rest: [{ mode: 'server', resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'search-type' }] },
        { type: 'Condition', interaction: [{ code: 'search-type' }] },
        { type: 'MedicationRequest', interaction: [{ code: 'search-type' }] },
        { type: 'DiagnosticReport', interaction: [{ code: 'search-type' }] },
        { type: 'AllergyIntolerance', interaction: [{ code: 'search-type' }] },
      ]}],
    };
  }

  async getPatient(id: string, tenantId: string): Promise<FhirPatient> {
    const patient = await this.prisma.patient.findFirst({ where: { id, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    const fhir = PatientMapper.toFhir(patient);
    await this.logFhirAccess(tenantId, FhirResourceType.PATIENT, id, fhir);
    return fhir;
  }

  async searchPatients(tenantId: string, name?: string): Promise<FhirBundle> {
    const patients = await this.prisma.patient.findMany({
      where: { tenantId, ...(name && { OR: [{ firstName: { contains: name, mode: 'insensitive' } }, { lastName: { contains: name, mode: 'insensitive' } }] }) },
    });
    return { resourceType: 'Bundle', type: 'searchset', total: patients.length, entry: patients.map((p) => ({ resource: PatientMapper.toFhir(p) as FhirResource })) };
  }

  async getEncounter(id: string, tenantId: string): Promise<FhirEncounter> {
    const visit = await this.prisma.visit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException(`Encounter ${id} not found`);
    const fhir = EncounterMapper.toFhir(visit);
    await this.logFhirAccess(tenantId, FhirResourceType.ENCOUNTER, id, fhir);
    return fhir;
  }

  async searchEncounters(tenantId: string, patientId?: string): Promise<FhirBundle> {
    const visits = await this.prisma.visit.findMany({ where: { tenantId, ...(patientId && { patientId }) }, orderBy: { createdAt: 'desc' } });
    return { resourceType: 'Bundle', type: 'searchset', total: visits.length, entry: visits.map((v) => ({ resource: EncounterMapper.toFhir(v) as FhirResource })) };
  }

  async getObservations(visitId: string, tenantId: string): Promise<FhirBundle> {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId }, include: { vitalSigns: true } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);
    const observations: FhirObservation[] = visit.vitalSigns.flatMap((vs) => ObservationMapper.toFhirList(vs, visit.patientId));
    return { resourceType: 'Bundle', type: 'searchset', total: observations.length, entry: observations.map((o) => ({ resource: o as FhirResource })) };
  }

  async getConditions(visitId: string, tenantId: string): Promise<FhirBundle> {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId }, include: { diagnoses: true } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);
    const conditions: FhirCondition[] = visit.diagnoses.map((d) => ConditionMapper.toFhir(d, visit.patientId));
    return { resourceType: 'Bundle', type: 'searchset', total: conditions.length, entry: conditions.map((c) => ({ resource: c as FhirResource })) };
  }

  async getMedicationRequests(patientId: string, tenantId: string): Promise<FhirBundle> {
    const prescriptions = await this.prisma.prescription.findMany({ where: { patientId, tenantId }, include: { items: { include: { drug: true } } } });
    const resources: FhirMedicationRequest[] = prescriptions.flatMap((p) => p.items.map((item) => MedicationRequestMapper.toFhir(p, item, patientId)));
    return { resourceType: 'Bundle', type: 'searchset', total: resources.length, entry: resources.map((r) => ({ resource: r as FhirResource })) };
  }

  async getDiagnosticReports(patientId: string, tenantId: string): Promise<FhirBundle> {
    const orders = await this.prisma.labOrder.findMany({ where: { patientId, tenantId }, include: { items: { include: { labTest: true } } } });
    const reports: FhirDiagnosticReport[] = orders.map((o) => DiagnosticReportMapper.toFhir(o, patientId));
    return { resourceType: 'Bundle', type: 'searchset', total: reports.length, entry: reports.map((r) => ({ resource: r as FhirResource })) };
  }

  async getAllergyIntolerances(patientId: string, tenantId: string): Promise<FhirBundle> {
    const allergies = await this.prisma.allergy.findMany({ where: { patientId, patient: { tenantId } } });
    const resources: FhirAllergyIntolerance[] = allergies.map((a) => AllergyIntoleranceMapper.toFhir(a, patientId));
    return { resourceType: 'Bundle', type: 'searchset', total: resources.length, entry: resources.map((r) => ({ resource: r as FhirResource })) };
  }

  private async logFhirAccess(tenantId: string, resourceType: FhirResourceType, resourceId: string, fhirJson: object): Promise<void> {
    await this.prisma.fhirResourceLog.create({
      data: { tenantId, resourceType, resourceId, fhirJson: fhirJson as unknown as import('@prisma/client').Prisma.InputJsonValue },
    });
  }
}
