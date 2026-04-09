import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async findAllDrugs(tenantId: string) {
    return this.prisma.drug.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOneDrug(id: string, tenantId: string) {
    const drug = await this.prisma.drug.findFirst({ where: { id, tenantId } });
    if (!drug) throw new NotFoundException(`Drug ${id} not found`);
    return drug;
  }

  async createDrug(data: any, tenantId: string) {
    return this.prisma.drug.create({ data: { ...data, tenantId } });
  }

  async updateDrug(id: string, tenantId: string, data: any) {
    await this.findOneDrug(id, tenantId);
    return this.prisma.drug.update({ where: { id }, data });
  }

  async removeDrug(id: string, tenantId: string) {
    await this.findOneDrug(id, tenantId);
    return this.prisma.drug.delete({ where: { id } });
  }

  async findAllPrescriptions(tenantId: string) {
    return this.prisma.prescription.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { drug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrescription(data: any, tenantId: string) {
    const { items, ...prescriptionData } = data;
    return this.prisma.prescription.create({
      data: {
        ...prescriptionData,
        tenantId,
        items: { create: items },
      },
      include: { items: { include: { drug: true } } },
    });
  }

  async dispensePrescription(id: string, tenantId: string, pharmacistId: string) {
    const prescription = await this.prisma.prescription.findFirst({ where: { id, tenantId } });
    if (!prescription) throw new NotFoundException(`Prescription ${id} not found`);
    if (prescription.status !== 'PENDING') {
      throw new BadRequestException('Prescription is not in PENDING status');
    }
    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'DISPENSED', pharmacistId },
    });
  }
}
