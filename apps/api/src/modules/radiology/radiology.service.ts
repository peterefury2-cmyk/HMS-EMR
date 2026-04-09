import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      include: { patient: true, radiologist: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!order) throw new NotFoundException(`Radiology order ${id} not found`);
    return order;
  }

  async create(data: any, tenantId: string) {
    return this.prisma.radiologyOrder.create({
      data: { ...data, tenantId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    await this.findOne(id, tenantId);
    return this.prisma.radiologyOrder.update({ where: { id }, data });
  }

  async addReport(id: string, tenantId: string, report: string, radiologistId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.radiologyOrder.update({
      where: { id },
      data: { report, radiologistId, status: 'COMPLETED' },
    });
  }
}
