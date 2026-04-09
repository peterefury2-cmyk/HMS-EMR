import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  genotype?: string;
  emergencyContact?: Record<string, unknown>;
}

interface CreateNextOfKinData {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

interface CreateMedicalHistoryData {
  condition: string;
  diagnosedDate?: Date;
  status?: string;
  notes?: string;
  isChronic?: boolean;
  familyHistory?: boolean;
}

interface CreateConsentData {
  consentType: string;
  granted: boolean;
  document?: string;
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    return this.prisma.patient.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { patientNo: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        allergies: true,
        medications: true,
        visits: { take: 5, orderBy: { createdAt: 'desc' } },
        nextOfKin: true,
        medicalHistories: true,
      },
    });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async create(data: CreatePatientData, tenantId: string) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.patient.count({ where: { tenantId } });
    const patientNo = `PT-${dateStr}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.patient.create({
      data: {
        tenantId,
        patientNo,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        bloodGroup: data.bloodGroup,
        genotype: data.genotype,
        emergencyContact: data.emergencyContact as Parameters<typeof this.prisma.patient.create>[0]['data']['emergencyContact'],
      },
    });
  }

  async update(id: string, tenantId: string, data: Partial<CreatePatientData>) {
    await this.findOne(id, tenantId);
    return this.prisma.patient.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.patient.update>[0]['data'],
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.patient.delete({ where: { id } });
  }

  // Next of kin
  async getNextOfKin(patientId: string, tenantId: string) {
    await this.findOne(patientId, tenantId);
    return this.prisma.patientNextOfKin.findMany({ where: { patientId } });
  }

  async addNextOfKin(patientId: string, tenantId: string, data: CreateNextOfKinData) {
    await this.findOne(patientId, tenantId);
    return this.prisma.patientNextOfKin.create({ data: { ...data, patientId } });
  }

  async updateNextOfKin(kinId: string, data: Partial<CreateNextOfKinData>) {
    const kin = await this.prisma.patientNextOfKin.findUnique({ where: { id: kinId } });
    if (!kin) throw new NotFoundException(`Next of kin ${kinId} not found`);
    return this.prisma.patientNextOfKin.update({ where: { id: kinId }, data });
  }

  async removeNextOfKin(kinId: string) {
    return this.prisma.patientNextOfKin.delete({ where: { id: kinId } });
  }

  // Medical history
  async getMedicalHistory(patientId: string, tenantId: string) {
    await this.findOne(patientId, tenantId);
    return this.prisma.medicalHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMedicalHistory(patientId: string, tenantId: string, data: CreateMedicalHistoryData) {
    await this.findOne(patientId, tenantId);
    return this.prisma.medicalHistory.create({ data: { ...data, patientId } });
  }

  async updateMedicalHistory(historyId: string, data: Partial<CreateMedicalHistoryData>) {
    return this.prisma.medicalHistory.update({ where: { id: historyId }, data });
  }

  // Consent records
  async getConsents(patientId: string, tenantId: string) {
    await this.findOne(patientId, tenantId);
    return this.prisma.consentRecord.findMany({
      where: { patientId },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async addConsent(patientId: string, tenantId: string, data: CreateConsentData) {
    await this.findOne(patientId, tenantId);
    return this.prisma.consentRecord.create({ data: { ...data, patientId } });
  }

  async revokeConsent(consentId: string) {
    return this.prisma.consentRecord.update({
      where: { id: consentId },
      data: { revokedAt: new Date(), granted: false },
    });
  }

  // Patient timeline
  async getTimeline(patientId: string, tenantId: string) {
    await this.findOne(patientId, tenantId);

    const [visits, labOrders, prescriptions] = await Promise.all([
      this.prisma.visit.findMany({
        where: { patientId, tenantId },
        select: { id: true, createdAt: true, type: true, status: true, chiefComplaint: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.labOrder.findMany({
        where: { patientId, tenantId },
        select: { id: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.prescription.findMany({
        where: { patientId, tenantId },
        select: { id: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const timeline = [
      ...visits.map((v) => ({ ...v, type: 'VISIT' })),
      ...labOrders.map((l) => ({ ...l, type: 'LAB_ORDER' })),
      ...prescriptions.map((p) => ({ ...p, type: 'PRESCRIPTION' })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return timeline;
  }
}
