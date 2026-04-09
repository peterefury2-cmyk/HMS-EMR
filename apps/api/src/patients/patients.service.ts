import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Patient,
  PatientNextOfKin,
  Allergy,
  ConsentRecord,
  Prisma,
} from '@prisma/client';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateNextOfKinDto } from './dto/create-next-of-kin.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';

export interface ConsentRecordDto {
  type: string;
  isConsented: boolean;
  notes?: string;
}

export interface PatientTimeline {
  visits: Record<string, unknown>[];
  labOrders: Record<string, unknown>[];
  prescriptions: Record<string, unknown>[];
}

function generatePatientNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `PT-${dateStr}-${randomPart}`;
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto, tenantId: string): Promise<Patient> {
    const patientNo = generatePatientNo();
    return this.prisma.patient.create({
      data: {
        tenantId,
        patientNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        bloodGroup: dto.bloodGroup,
        genotype: dto.genotype,
      },
    });
  }

  async findAll(tenantId: string, search?: string): Promise<Patient[]> {
    const where: Prisma.PatientWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { patientNo: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Patient & Record<string, unknown>> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        allergies: true,
        medications: true,
        nextOfKin: true,
        visits: { take: 10, orderBy: { createdAt: 'desc' } },
        consentRecords: { orderBy: { signedAt: 'desc' } },
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
    return patient;
  }

  async update(id: string, tenantId: string, dto: UpdatePatientDto): Promise<Patient> {
    await this.findOne(id, tenantId);
    const data: Prisma.PatientUpdateInput = {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.phone && { phone: dto.phone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
      ...(dto.genotype !== undefined && { genotype: dto.genotype }),
    };
    return this.prisma.patient.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string): Promise<Patient> {
    await this.findOne(id, tenantId);
    return this.prisma.patient.delete({ where: { id } });
  }

  async addNextOfKin(
    patientId: string,
    dto: CreateNextOfKinDto,
    tenantId: string,
  ): Promise<PatientNextOfKin> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    return this.prisma.patientNextOfKin.create({
      data: {
        patientId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        relationship: dto.relationship,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async addAllergy(
    patientId: string,
    dto: CreateAllergyDto,
    tenantId: string,
  ): Promise<Allergy> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    return this.prisma.allergy.create({
      data: {
        patientId,
        allergen: dto.allergen,
        reaction: dto.reaction,
        severity: dto.severity,
      },
    });
  }

  async addConsentRecord(
    patientId: string,
    dto: ConsentRecordDto,
    tenantId: string,
  ): Promise<ConsentRecord> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    return this.prisma.consentRecord.create({
      data: {
        patientId,
        type: dto.type,
        isConsented: dto.isConsented,
        notes: dto.notes,
      },
    });
  }

  async getTimeline(patientId: string, tenantId: string): Promise<PatientTimeline> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    const [visits, labOrders, prescriptions] = await Promise.all([
      this.prisma.visit.findMany({
        where: { patientId, tenantId },
        include: { diagnoses: true, vitalSigns: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.labOrder.findMany({
        where: { patientId, tenantId },
        include: { items: { include: { labTest: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescription.findMany({
        where: { patientId, tenantId },
        include: { items: { include: { drug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      visits: visits as unknown as Record<string, unknown>[],
      labOrders: labOrders as unknown as Record<string, unknown>[],
      prescriptions: prescriptions as unknown as Record<string, unknown>[],
    };
  }
}
