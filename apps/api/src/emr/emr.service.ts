import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmrService {
  constructor(private prisma: PrismaService) {}

  async createVisit(data: any, tenantId: string) {
    return this.prisma.visit.create({
      data: { ...data, tenantId },
      include: { patient: true, doctor: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getVisit(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true, role: true } },
        clinicalNotes: { include: { author: { select: { id: true, firstName: true, lastName: true } } } },
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

  async addClinicalNote(visitId: string, data: any, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }
    return this.prisma.clinicalNote.create({
      data: { visitId, ...data },
    });
  }

  async recordVitals(visitId: string, data: any, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }

    if (data.weight && data.height) {
      const heightM = data.height / 100;
      data.bmi = parseFloat((data.weight / (heightM * heightM)).toFixed(2));
    }

    return this.prisma.vitalSigns.create({
      data: { visitId, ...data },
    });
  }

  async getPatientHistory(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
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

  async addDiagnosis(visitId: string, data: any, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }
    return this.prisma.diagnosis.create({ data: { visitId, ...data } });
  }

  async updateVisitStatus(id: string, status: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { id, tenantId } });
    if (!visit) {
      throw new NotFoundException(`Visit ${id} not found`);
    }
    return this.prisma.visit.update({ where: { id }, data: { status: status as any } });
  }
}
