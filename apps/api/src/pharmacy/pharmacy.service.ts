import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateDrugData {
  name: string;
  genericName?: string;
  category: string;
  unit: string;
  price: number;
  stock?: number;
  reorderLevel?: number;
  expiryDate?: Date;
}

interface CreatePrescriptionData {
  visitId?: string;
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

interface ExpiryAlertResult {
  drug: { id: string; name: string; stock: number; expiryDate: Date | null };
  daysUntilExpiry: number;
}

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async findAllDrugs(tenantId: string) {
    return this.prisma.drug.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async findOneDrug(id: string, tenantId: string) {
    const drug = await this.prisma.drug.findFirst({ where: { id, tenantId } });
    if (!drug) throw new NotFoundException(`Drug ${id} not found`);
    return drug;
  }

  async createDrug(data: CreateDrugData, tenantId: string) {
    return this.prisma.drug.create({
      data: {
        tenantId,
        name: data.name,
        genericName: data.genericName,
        category: data.category,
        unit: data.unit,
        price: data.price,
        stock: data.stock ?? 0,
        reorderLevel: data.reorderLevel ?? 10,
        expiryDate: data.expiryDate,
      },
    });
  }

  async updateDrug(id: string, tenantId: string, data: Partial<CreateDrugData>) {
    await this.findOneDrug(id, tenantId);
    return this.prisma.drug.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.drug.update>[0]['data'],
    });
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

  async createPrescription(data: CreatePrescriptionData, tenantId: string) {
    const { items, ...prescriptionData } = data;

    // Check drug interactions before creating
    const drugIds = items.map((i) => i.drugId);
    if (drugIds.length >= 2) {
      const interactions = await this.prisma.drugInteraction.findMany({
        where: {
          OR: [
            { drugAId: { in: drugIds }, drugBId: { in: drugIds } },
          ],
        },
        include: { drugA: true, drugB: true },
      });
      const severe = interactions.filter((i) => i.severity === 'SEVERE' || i.severity === 'CRITICAL');
      if (severe.length > 0) {
        const desc = severe.map((i) => `${i.drugA.name} + ${i.drugB.name}`).join(', ');
        throw new BadRequestException(`Severe drug interactions detected: ${desc}`);
      }
    }

    return this.prisma.prescription.create({
      data: {
        tenantId,
        visitId: prescriptionData.visitId ?? '',
        patientId: prescriptionData.patientId,
        notes: prescriptionData.notes,
        items: { create: items as Parameters<typeof this.prisma.prescription.create>[0]['data']['items'] },
      } as Parameters<typeof this.prisma.prescription.create>[0]['data'],
      include: { items: { include: { drug: true } } },
    });
  }

  async dispensePrescription(id: string, tenantId: string, pharmacistId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: { items: { include: { drug: true } } },
    });
    if (!prescription) throw new NotFoundException(`Prescription ${id} not found`);
    if (prescription.status !== 'PENDING') {
      throw new BadRequestException('Prescription is not in PENDING status');
    }

    // Check drug interactions again at dispense time
    const drugIds = prescription.items.map((i) => i.drugId);
    if (drugIds.length >= 2) {
      const interactions = await this.prisma.drugInteraction.findMany({
        where: {
          OR: [{ drugAId: { in: drugIds }, drugBId: { in: drugIds } }],
        },
        include: { drugA: true, drugB: true },
      });
      const severe = interactions.filter((i) => i.severity === 'SEVERE' || i.severity === 'CRITICAL');
      if (severe.length > 0) {
        const desc = severe.map((i) => `${i.drugA.name} + ${i.drugB.name}`).join(', ');
        throw new BadRequestException(`Cannot dispense - severe drug interactions: ${desc}`);
      }
    }

    // Deduct stock for each item
    for (const item of prescription.items) {
      const drug = item.drug;
      if (drug.stock !== null && drug.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${drug.name}. Available: ${drug.stock}, Required: ${item.quantity}`,
        );
      }
      await this.prisma.drug.update({
        where: { id: item.drugId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'DISPENSED', pharmacistId },
    });
  }

  async getExpiryAlerts(tenantId: string, daysAhead = 30): Promise<ExpiryAlertResult[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    const drugs = await this.prisma.drug.findMany({
      where: {
        tenantId,
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      select: { id: true, name: true, stock: true, expiryDate: true },
      orderBy: { expiryDate: 'asc' },
    });

    const now = new Date();
    return drugs.map((drug) => ({
      drug,
      daysUntilExpiry: drug.expiryDate
        ? Math.ceil((drug.expiryDate.getTime() - now.getTime()) / 86400000)
        : 0,
    }));
  }

  async getReorderAlerts(tenantId: string) {
    const drugs = await this.prisma.drug.findMany({ where: { tenantId } });
    return drugs.filter(
      (d) => d.stock <= d.reorderLevel,
    );
  }
}
