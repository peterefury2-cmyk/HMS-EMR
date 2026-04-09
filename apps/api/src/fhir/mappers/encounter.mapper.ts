// FHIR R4 Encounter mapper

interface VisitModel {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  status: string;
  chiefComplaint?: string | null;
  createdAt: Date;
}

interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

interface FhirReference {
  reference: string;
}

interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject: FhirReference;
  participant?: Array<{ individual: FhirReference }>;
  period: { start: string };
  reasonCode?: FhirCodeableConcept[];
}

const statusMap: Record<string, string> = {
  SCHEDULED: 'planned',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'finished',
  CANCELLED: 'cancelled',
};

const classMap: Record<string, FhirCoding> = {
  OUTPATIENT: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
  INPATIENT: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
  EMERGENCY: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'EMER', display: 'emergency' },
  TELEMEDICINE: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'VR', display: 'virtual' },
};

export function mapEncounterToFhir(visit: VisitModel): FhirEncounter {
  const fhir: FhirEncounter = {
    resourceType: 'Encounter',
    id: visit.id,
    status: statusMap[visit.status] ?? 'unknown',
    class: classMap[visit.type] ?? classMap['OUTPATIENT'],
    subject: { reference: `Patient/${visit.patientId}` },
    participant: [{ individual: { reference: `Practitioner/${visit.doctorId}` } }],
    period: { start: visit.createdAt.toISOString() },
  };

  if (visit.chiefComplaint) {
    fhir.reasonCode = [{ coding: [], text: visit.chiefComplaint }];
  }

  return fhir;
}
