export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
}

export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
}

export interface FhirContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export interface FhirAddress {
  use?: string;
  line?: string[];
  city?: string;
  country?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirDosage {
  text?: string;
  timing?: {
    repeat?: {
      frequency?: number;
      period?: number;
      periodUnit?: string;
    };
  };
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  extension?: Array<{ url: string; valueString?: string }>;
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  status: string;
  class?: { system: string; code: string; display: string };
  subject?: FhirReference;
  period?: { start?: string; end?: string };
  type?: FhirCodeableConcept[];
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status: string;
  code: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system?: string; code?: string };
  valueString?: string;
}

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  onsetDateTime?: string;
  category?: FhirCodeableConcept[];
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status: string;
  intent: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  dosageInstruction?: FhirDosage[];
}

export interface FhirDiagnosticReport extends FhirResource {
  resourceType: 'DiagnosticReport';
  status: string;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  issued?: string;
  result?: FhirReference[];
}

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: FhirCodeableConcept;
  patient?: FhirReference;
  code?: FhirCodeableConcept;
  reaction?: Array<{ description?: string; severity?: string }>;
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{ resource?: FhirResource }>;
}

export interface FhirCapabilityStatement extends FhirResource {
  resourceType: 'CapabilityStatement';
  status: string;
  kind: string;
  fhirVersion: string;
  format: string[];
  rest?: FhirRestComponent[];
  date?: string;
  software?: { name: string; version: string };
}

export interface FhirRestComponent {
  mode: string;
  resource?: FhirResourceComponent[];
}

export interface FhirResourceComponent {
  type: string;
  interaction?: Array<{ code: string }>;
}
