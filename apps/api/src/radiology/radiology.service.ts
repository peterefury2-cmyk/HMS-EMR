import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RadiologyOrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

interface CreateRadiologyOrderData {
  patientId: string;
  visitId: string;
  requestedById?: string;
  modality: string;
  bodyPart: string;
  indication?: string;
  urgency?: string;
}

interface CreateDicomStudyData {
  seriesCount?: number;
  imageCount?: number;
  storageUrl?: string;
}

const VALID_ORDER_TRANSITIONS: Record<string, RadiologyOrderStatus[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class RadiologyService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.radiologyOrder.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        radiologist: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const order = await this.prisma.radiologyOrder.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        radiologist: { select: { id: true, firstName: true, lastName: true } },
        dicomStudies: true,
      },
    });
    if (!order) throw new NotFoundException(`Radiology order ${id} not found`);
    return order;
  }

  async create(data: CreateRadiologyOrderData, tenantId: string) {
    return this.prisma.radiologyOrder.create({
      data: {
        tenantId,
        patientId: data.patientId,
        visitId: data.visitId,
        modality: data.modality,
        bodyPart: data.bodyPart,
        indication: data.indication,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateStatus(id: string, tenantId: string, status: RadiologyOrderStatus) {
    const order = await this.findOne(id, tenantId);
    const allowed = VALID_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition radiology order from ${order.status} to ${status}`,
      );
    }
    return this.prisma.radiologyOrder.update({ where: { id }, data: { status } });
  }

  async addDicomStudy(orderId: string, tenantId: string, data: CreateDicomStudyData) {
    await this.findOne(orderId, tenantId);
    const studyInstanceUid = randomUUID();
    return this.prisma.dicomStudy.create({
      data: {
        radiologyOrderId: orderId,
        studyInstanceUid,
        seriesCount: data.seriesCount ?? 0,
        imageCount: data.imageCount ?? 0,
        storageUrl: data.storageUrl,
      },
    });
  }

  async addReport(id: string, tenantId: string, report: string, radiologistId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.radiologyOrder.update({
      where: { id },
      data: { report, radiologistId, status: 'COMPLETED' },
    });
  }
}
