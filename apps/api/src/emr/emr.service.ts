import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStatus, NoteType, DiagnosisType } from '@prisma/client';

interface CreateVisitData {
  patientId: string;
  doctorId: string;
  type?: string;
  chiefComplaint?: string;
  status?: VisitStatus;
  scheduledAt?: Date;
}

interface CreateClinicalNoteData {
  authorId: string;
  noteType: NoteType;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
}

interface CreateVitalsData {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedById: string;
}

interface CreateDiagnosisData {
  icdCode: string;
  description?: string;
  type?: DiagnosisType;
  notes?: string;
  doctorId: string;
}

interface CreatePrescriptionData {
  patientId: string;
  doctorId: string;
  notes?: string;
  items: Array<{
    drugId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
  }>;
}

const ICD_CODE_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/;

const VALID_VISIT_TRANSITIONS: Record<string, VisitStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class EmrService {
  constructor(private prisma: PrismaService) {}

  async createVisit(data: CreateVisitData, tenantId: string) {
    return this.prisma.visit.create({
      data: {
        tenantId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        type: (data.type ?? 'OUTPATIENT') as Parameters<typeof this.prisma.visit.create>[0]['data']['type'],
        chiefComplaint: data.chiefComplaint ?? '',
        status: data.status,
      },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getVisit(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true, role: true } },
        clinicalNotes: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
        diagnoses: true,
        vitalSigns: true,
        prescriptions: { include: { items: { include: { drug: true } } } },
        labOrders: { include: { items: { include: { labTest: true } } } },
        radiologyOrders: true,
      },
    });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    return visit;
  }

  async addClinicalNote(visitId: string, data: CreateClinicalNoteData, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);

    if (data.noteType === NoteType.SOAP) {
      if (!data.subjective || !data.objective || !data.assessment || !data.plan) {
        throw new BadRequestException(
          'SOAP notes require all four fields: subjective, objective, assessment, and plan',
        );
      }
    } else if (!data.content) {
      throw new BadRequestException('Narrative notes require the content field');
    }

    return this.prisma.clinicalNote.create({ data: { visitId, ...data } });
  }

  async recordVitals(visitId: string, data: CreateVitalsData, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);

    const vitalsData = { ...data };
    if (vitalsData.weight && vitalsData.height) {
      const heightM = vitalsData.height / 100;
      vitalsData.bmi = parseFloat((vitalsData.weight / (heightM * heightM)).toFixed(2));
    }

    return this.prisma.vitalSigns.create({ data: { visitId, ...vitalsData } });
  }

  async getPatientHistory(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    return this.prisma.visit.findMany({
      where: { patientId, tenantId },
      include: {
        clinicalNotes: true,
        diagnoses: true,
        vitalSigns: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDiagnosis(visitId: string, data: CreateDiagnosisData, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);

    if (!ICD_CODE_REGEX.test(data.icdCode)) {
      throw new BadRequestException(
        `Invalid ICD code format: ${data.icdCode}. Expected format: A00 or A00.0`,
      );
    }

    return this.prisma.diagnosis.create({
      data: {
        visitId,
        icdCode: data.icdCode,
        description: data.description ?? '',
        doctorId: data.doctorId,
        type: data.type,
        notes: data.notes,
      } as Parameters<typeof this.prisma.diagnosis.create>[0]['data'],
    });
  }

  async updateVisitStatus(id: string, status: VisitStatus, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);

    const allowedTransitions = VALID_VISIT_TRANSITIONS[visit.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition visit from ${visit.status} to ${status}`,
      );
    }

    return this.prisma.visit.update({ where: { id }, data: { status } });
  }

  async createPrescription(visitId: string, data: CreatePrescriptionData, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);

    const drugIds = data.items.map((i) => i.drugId);

    // Check for drug interactions
    if (drugIds.length >= 2) {
      const interactions = await this.prisma.drugInteraction.findMany({
        where: {
          OR: [
            { drugAId: { in: drugIds }, drugBId: { in: drugIds } },
          ],
        },
        include: { drugA: true, drugB: true },
      });

      const severe = interactions.filter((i) =>
        i.severity === 'SEVERE' || i.severity === 'CRITICAL',
      );
      if (severe.length > 0) {
        const desc = severe
          .map((i) => `${i.drugA.name} + ${i.drugB.name}: ${i.description}`)
          .join('; ');
        throw new BadRequestException(`Severe drug interactions detected: ${desc}`);
      }
    }

    return this.prisma.prescription.create({
      data: {
        ...data,
        visitId,
        tenantId,
        items: { create: data.items },
      },
      include: { items: { include: { drug: true } } },
    });
  }
}
