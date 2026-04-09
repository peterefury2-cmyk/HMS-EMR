import { VitalSigns } from '@prisma/client';
import { FhirObservation } from '../interfaces/fhir.interfaces';

interface LoincVital {
  code: string;
  display: string;
  unit: string;
  unitCode: string;
}

const LOINC_MAP: Record<keyof Omit<VitalSigns, 'id' | 'visitId' | 'recordedAt' | 'bmi'>, LoincVital> = {
  temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel', unitCode: 'Cel' },
  heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min', unitCode: '/min' },
  oxygenSaturation: { code: '2708-6', display: 'Oxygen saturation', unit: '%', unitCode: '%' },
  weight: { code: '29463-7', display: 'Body weight', unit: 'kg', unitCode: 'kg' },
  height: { code: '8302-2', display: 'Body height', unit: 'cm', unitCode: 'cm' },
  bloodPressureSystolic: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', unitCode: 'mm[Hg]' },
  bloodPressureDiastolic: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', unitCode: 'mm[Hg]' },
  respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min', unitCode: '/min' },
};

export class ObservationMapper {
  static toFhirList(vitals: VitalSigns, patientId: string): FhirObservation[] {
    const observations: FhirObservation[] = [];
    const fields = Object.keys(LOINC_MAP) as Array<keyof typeof LOINC_MAP>;

    for (const field of fields) {
      const value = vitals[field];
      if (value == null) continue;
      const loinc = LOINC_MAP[field];
      observations.push({
        resourceType: 'Observation',
        id: `${vitals.id}-${field}`,
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: loinc.code,
              display: loinc.display,
            },
          ],
          text: loinc.display,
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: vitals.recordedAt.toISOString(),
        valueQuantity: {
          value: Number(value),
          unit: loinc.unit,
          system: 'http://unitsofmeasure.org',
          code: loinc.unitCode,
        },
      });
    }

    // BMI
    if (vitals.bmi != null) {
      observations.push({
        resourceType: 'Observation',
        id: `${vitals.id}-bmi`,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI)' }],
          text: 'Body mass index (BMI)',
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: vitals.recordedAt.toISOString(),
        valueQuantity: {
          value: Number(vitals.bmi),
          unit: 'kg/m2',
          system: 'http://unitsofmeasure.org',
          code: 'kg/m2',
        },
      });
    }

    return observations;
  }
}
