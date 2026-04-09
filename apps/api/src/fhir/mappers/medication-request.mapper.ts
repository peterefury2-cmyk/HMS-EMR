import { Prescription, PrescriptionItem, Drug } from '@prisma/client';
import { FhirMedicationRequest } from '../interfaces/fhir.interfaces';

type PrescriptionItemWithDrug = PrescriptionItem & { drug: Drug };

export class MedicationRequestMapper {
  static toFhir(
    prescription: Prescription,
    item: PrescriptionItemWithDrug,
    patientId: string,
  ): FhirMedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      id: item.id,
      status: prescription.status === 'DISPENSED' ? 'completed' : 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{ display: item.drug.name }],
        text: item.drug.genericName ?? item.drug.name,
      },
      subject: { reference: `Patient/${patientId}` },
      dosageInstruction: [
        {
          text: `${item.dosage} ${item.frequency} for ${item.duration}`,
          timing: { repeat: { period: 1, periodUnit: 'd' } },
        },
      ],
    };
  }
}
