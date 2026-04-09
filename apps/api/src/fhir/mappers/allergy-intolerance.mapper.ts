import { Allergy, Severity } from '@prisma/client';
import { FhirAllergyIntolerance } from '../interfaces/fhir.interfaces';

const SEVERITY_MAP: Record<Severity, string> = {
  [Severity.MILD]: 'mild',
  [Severity.MODERATE]: 'moderate',
  [Severity.SEVERE]: 'severe',
  [Severity.CRITICAL]: 'severe',
};

export class AllergyIntoleranceMapper {
  static toFhir(allergy: Allergy, patientId: string): FhirAllergyIntolerance {
    return {
      resourceType: 'AllergyIntolerance',
      id: allergy.id,
      meta: { lastUpdated: allergy.updatedAt.toISOString() },
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: allergy.isActive ? 'active' : 'inactive' }],
      },
      patient: { reference: `Patient/${patientId}` },
      code: { coding: [{ display: allergy.allergen }], text: allergy.allergen },
      reaction: allergy.reaction ? [{ description: allergy.reaction, severity: SEVERITY_MAP[allergy.severity] }] : [],
    };
  }
}
