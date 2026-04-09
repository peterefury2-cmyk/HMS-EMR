import { Visit, VisitType, VisitStatus } from '@prisma/client';
import { FhirEncounter } from '../interfaces/fhir.interfaces';

const STATUS_MAP: Record<VisitStatus, string> = {
  [VisitStatus.SCHEDULED]: 'planned',
  [VisitStatus.IN_PROGRESS]: 'in-progress',
  [VisitStatus.COMPLETED]: 'finished',
  [VisitStatus.CANCELLED]: 'cancelled',
};

const CLASS_MAP: Record<VisitType, { code: string; display: string }> = {
  [VisitType.OUTPATIENT]: { code: 'AMB', display: 'ambulatory' },
  [VisitType.INPATIENT]: { code: 'IMP', display: 'inpatient encounter' },
  [VisitType.EMERGENCY]: { code: 'EMER', display: 'emergency' },
  [VisitType.TELEMEDICINE]: { code: 'VR', display: 'virtual' },
};

export class EncounterMapper {
  static toFhir(visit: Visit): FhirEncounter {
    const cls = CLASS_MAP[visit.type];
    return {
      resourceType: 'Encounter',
      id: visit.id,
      meta: { lastUpdated: visit.updatedAt.toISOString() },
      status: STATUS_MAP[visit.status],
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: cls.code,
        display: cls.display,
      },
      subject: { reference: `Patient/${visit.patientId}` },
      period: { start: visit.createdAt.toISOString() },
      type: [{ coding: [{ display: visit.chiefComplaint }] }],
    };
  }
}
