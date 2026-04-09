import { Diagnosis } from '@prisma/client';
import { FhirCondition } from '../interfaces/fhir.interfaces';

export class ConditionMapper {
  static toFhir(diagnosis: Diagnosis, patientId: string): FhirCondition {
    return {
      resourceType: 'Condition',
      id: diagnosis.id,
      meta: { lastUpdated: diagnosis.createdAt.toISOString() },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: diagnosis.status === 'RESOLVED' ? 'resolved' : 'active',
          },
        ],
      },
      code: {
        coding: [
          {
            system:
              diagnosis.icdVersion === 'ICD_11'
                ? 'http://id.who.int/icd/release/11/mms'
                : 'http://hl7.org/fhir/sid/icd-10',
            code: diagnosis.icdCode,
            display: diagnosis.description,
          },
        ],
        text: diagnosis.description,
      },
      subject: { reference: `Patient/${patientId}` },
      onsetDateTime: diagnosis.createdAt.toISOString(),
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'encounter-diagnosis',
              display: 'Encounter Diagnosis',
            },
          ],
        },
      ],
    };
  }
}
