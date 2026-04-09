// FHIR R4 Observation mapper (for vital signs)

interface VitalsModel {
  id: string;
  visitId: string;
  temperature?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  recordedAt: Date;
}

interface FhirQuantity {
  value: number;
  unit: string;
  system: string;
  code: string;
}

interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: string;
  code: { coding: FhirCoding[]; text: string };
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: FhirQuantity;
  component?: Array<{
    code: { coding: FhirCoding[] };
    valueQuantity: FhirQuantity;
  }>;
}

function makeObs(id: string, visit: string, effectiveDateTime: string, code: FhirCoding, value: FhirQuantity, text: string): FhirObservation {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [code], text },
    subject: { reference: `Encounter/${visit}` },
    effectiveDateTime,
    valueQuantity: value,
  };
}

export function mapVitalsToFhir(vitals: VitalsModel): FhirObservation[] {
  const observations: FhirObservation[] = [];
  const dt = vitals.recordedAt.toISOString();
  const loinc = 'http://loinc.org';
  const ucum = 'http://unitsofmeasure.org';

  if (vitals.temperature !== null && vitals.temperature !== undefined) {
    observations.push(makeObs(
      `${vitals.id}-temp`, vitals.visitId, dt,
      { system: loinc, code: '8310-5', display: 'Body temperature' },
      { value: vitals.temperature, unit: '°C', system: ucum, code: 'Cel' },
      'Body temperature',
    ));
  }

  if (vitals.heartRate !== null && vitals.heartRate !== undefined) {
    observations.push(makeObs(
      `${vitals.id}-hr`, vitals.visitId, dt,
      { system: loinc, code: '8867-4', display: 'Heart rate' },
      { value: vitals.heartRate, unit: 'bpm', system: ucum, code: '/min' },
      'Heart rate',
    ));
  }

  if (vitals.bloodPressureSystolic !== null && vitals.bloodPressureSystolic !== undefined &&
      vitals.bloodPressureDiastolic !== null && vitals.bloodPressureDiastolic !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-bp`,
      status: 'final',
      code: { coding: [{ system: loinc, code: '85354-9', display: 'Blood pressure panel' }], text: 'Blood pressure' },
      subject: { reference: `Encounter/${vitals.visitId}` },
      effectiveDateTime: dt,
      component: [
        {
          code: { coding: [{ system: loinc, code: '8480-6', display: 'Systolic blood pressure' }] },
          valueQuantity: { value: vitals.bloodPressureSystolic, unit: 'mmHg', system: ucum, code: 'mm[Hg]' },
        },
        {
          code: { coding: [{ system: loinc, code: '8462-4', display: 'Diastolic blood pressure' }] },
          valueQuantity: { value: vitals.bloodPressureDiastolic, unit: 'mmHg', system: ucum, code: 'mm[Hg]' },
        },
      ],
    });
  }

  if (vitals.oxygenSaturation !== null && vitals.oxygenSaturation !== undefined) {
    observations.push(makeObs(
      `${vitals.id}-spo2`, vitals.visitId, dt,
      { system: loinc, code: '59408-5', display: 'Oxygen saturation' },
      { value: vitals.oxygenSaturation, unit: '%', system: ucum, code: '%' },
      'Oxygen saturation',
    ));
  }

  if (vitals.weight !== null && vitals.weight !== undefined) {
    observations.push(makeObs(
      `${vitals.id}-wt`, vitals.visitId, dt,
      { system: loinc, code: '29463-7', display: 'Body weight' },
      { value: vitals.weight, unit: 'kg', system: ucum, code: 'kg' },
      'Body weight',
    ));
  }

  if (vitals.bmi !== null && vitals.bmi !== undefined) {
    observations.push(makeObs(
      `${vitals.id}-bmi`, vitals.visitId, dt,
      { system: loinc, code: '39156-5', display: 'Body mass index' },
      { value: vitals.bmi, unit: 'kg/m2', system: ucum, code: 'kg/m2' },
      'Body mass index',
    ));
  }

  return observations;
}
