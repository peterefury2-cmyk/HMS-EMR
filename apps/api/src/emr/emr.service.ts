import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Visit,
  Patient,
  User,
  ClinicalNote,
  VitalSigns,
  Diagnosis,
  VisitStatus,
} from '@prisma/client';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { RecordVitalsDto } from './dto/record-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';

type DoctorPartial = Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>;

type VisitWithRelations = Visit & {
  patient: Patient;
  doctor: DoctorPartial;
};

const VALID_STATUS_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  [VisitStatus.SCHEDULED]: [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED],
  [VisitStatus.IN_PROGRESS]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
};

const ICD_REGEX = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

@Injectable()
export class EmrService {
  constructor(private prisma: PrismaService) {}

  async createVisit(dto: CreateVisitDto, tenantId: string): Promise<VisitWithRelations> {
    return this.prisma.visit.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        type: dto.type,
        chiefComplaint: dto.chiefComplaint,
      },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    }) as Promise<VisitWithRelations>;
  }

  async getVisit(id: string, tenantId: string): Promise<Visit & Record<string, unknown>> {
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
    if (!visit) {
      throw new NotFoundException(`Visit ${id} not found`);
    }
    return visit;
  }

  async addClinicalNote(
    visitId: string,
    dto: CreateClinicalNoteDto,
    tenantId: string,
  ): Promise<ClinicalNote> {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }
    return this.prisma.clinicalNote.create({
      data: {
        visitId,
        type: dto.type,
        authorId: dto.authorId,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
      },
    });
  }

  async recordVitals(
    visitId: string,
    dto: RecordVitalsDto,
    tenantId: string,
  ): Promise<VitalSigns> {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }

    let bmi: number | undefined;
    if (dto.weight != null && dto.height != null && dto.height > 0) {
      const heightM = dto.height / 100;
      bmi = parseFloat((dto.weight / (heightM * heightM)).toFixed(2));
    }

    return this.prisma.vitalSigns.create({
      data: {
        visitId,
        temperature: dto.temperature,
        bloodPressureSystolic: dto.bloodPressureSystolic,
        bloodPressureDiastolic: dto.bloodPressureDiastolic,
        heartRate: dto.heartRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSaturation: dto.oxygenSaturation,
        weight: dto.weight,
        height: dto.height,
        bmi,
      },
    });
  }

  async addDiagnosis(
    visitId: string,
    dto: CreateDiagnosisDto,
    tenantId: string,
  ): Promise<Diagnosis> {
    if (!ICD_REGEX.test(dto.icdCode)) {
      throw new BadRequestException(
        `Invalid ICD code format: '${dto.icdCode}'. Expected format: Letter + 2 digits (e.g. J18 or J18.9)`,
      );
    }

    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }

    return this.prisma.diagnosis.create({
      data: {
        visitId,
        icdCode: dto.icdCode,
        description: dto.description,
        type: dto.type,
        icdVersion: dto.icdVersion,
      },
    });
  }

  async updateVisitStatus(
    id: string,
    status: VisitStatus,
    tenantId: string,
  ): Promise<Visit> {
    const visit = await this.prisma.visit.findFirst({ where: { id, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${id} not found`);
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[visit.status];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from '${visit.status}' to '${status}'. ` +
          `Allowed: ${allowedTransitions.length ? allowedTransitions.join(', ') : 'none'}`,
      );
    }

    return this.prisma.visit.update({ where: { id }, data: { status } });
  }

  async getPatientHistory(patientId: string, tenantId: string): Promise<Visit[]> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

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
}
