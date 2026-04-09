import { LabOrder, LabOrderItem, LabTest } from '@prisma/client';
import { FhirDiagnosticReport, FhirReference } from '../interfaces/fhir.interfaces';

type LabOrderItemWithTest = LabOrderItem & { labTest: LabTest };

export class DiagnosticReportMapper {
  static toFhir(
    order: LabOrder & { items: LabOrderItemWithTest[] },
    patientId: string,
  ): FhirDiagnosticReport {
    const result: FhirReference[] = order.items.map((item) => ({
      reference: `Observation/${item.id}`,
      display: item.labTest.name,
    }));
    return {
      resourceType: 'DiagnosticReport',
      id: order.id,
      status: order.status === 'COMPLETED' ? 'final' : 'preliminary',
      code: { coding: [{ display: 'Laboratory panel' }], text: 'Laboratory Results' },
      subject: { reference: `Patient/${patientId}` },
      issued: order.updatedAt.toISOString(),
      result,
    };
  }
}
