import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Drug,
  Prescription,
  DrugInteraction,
  PrescriptionStatus,
  Prisma,
} from '@prisma/client';
import { CreateDrugDto } from './dto/create-drug.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async findAllDrugs(tenantId: string): Promise<Drug[]> {
    return this.prisma.drug.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOneDrug(id: string, tenantId: string): Promise<Drug> {
    const drug = await this.prisma.drug.findFirst({ where: { id, tenantId } });
    if (!drug) throw new NotFoundException(`Drug ${id} not found`);
    return drug;
  }

  async createDrug(dto: CreateDrugDto, tenantId: string): Promise<Drug> {
    return this.prisma.drug.create({
      data: {
        tenantId,
        name: dto.name,
        genericName: dto.genericName,
        category: dto.category,
        unit: dto.unit,
        stock: dto.stock ?? 0,
        reorderLevel: dto.reorderLevel ?? 10,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        batchNumber: dto.batchNumber,
        price: new Prisma.Decimal(dto.price.toFixed(2)),
        isControlled: dto.isControlled ?? false,
      },
    });
  }

  async updateDrug(
    id: string,
    tenantId: string,
    dto: Partial<CreateDrugDto>,
  ): Promise<Drug> {
    await this.findOneDrug(id, tenantId);
    return this.prisma.drug.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.genericName !== undefined && { genericName: dto.genericName }),
        ...(dto.category && { category: dto.category }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.reorderLevel !== undefined && { reorderLevel: dto.reorderLevel }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.batchNumber !== undefined && { batchNumber: dto.batchNumber }),
        ...(dto.price !== undefined && {
          price: new Prisma.Decimal(dto.price.toFixed(2)),
        }),
        ...(dto.isControlled !== undefined && { isControlled: dto.isControlled }),
      },
    });
  }

  async removeDrug(id: string, tenantId: string): Promise<Drug> {
    await this.findOneDrug(id, tenantId);
    return this.prisma.drug.delete({ where: { id } });
  }

  async updateStock(
    drugId: string,
    quantity: number,
    tenantId: string,
  ): Promise<Drug> {
    const drug = await this.findOneDrug(drugId, tenantId);
    const newStock = drug.stock + quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${drug.stock}, Requested deduction: ${Math.abs(quantity)}`,
      );
    }
    return this.prisma.drug.update({
      where: { id: drugId },
      data: { stock: newStock },
    });
  }

  async findAllPrescriptions(tenantId: string): Promise<Prescription[]> {
    return this.prisma.prescription.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { drug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrescription(
    dto: CreatePrescriptionDto,
    tenantId: string,
  ): Promise<Prescription> {
    return this.prisma.prescription.create({
      data: {
        tenantId,
        visitId: dto.visitId,
        patientId: dto.patientId,
        items: {
          create: dto.items.map((item) => ({
            drugId: item.drugId,
            quantity: item.quantity,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
          })),
        },
      },
      include: { items: { include: { drug: true } } },
    });
  }

  async dispensePrescription(
    id: string,
    tenantId: string,
    pharmacistId: string,
  ): Promise<Prescription> {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: { items: { include: { drug: true } } },
    });
    if (!prescription) throw new NotFoundException(`Prescription ${id} not found`);
    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestException(
        `Prescription is not in PENDING status (current: ${prescription.status})`,
      );
    }

    // Validate stock before any deductions
    for (const item of prescription.items) {
      if (item.drug.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.drug.name}. Available: ${item.drug.stock}, Required: ${item.quantity}`,
        );
      }
    }

    // Perform stock deductions in a transaction
    await this.prisma.$transaction(
      prescription.items.map((item) =>
        this.prisma.drug.update({
          where: { id: item.drugId },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    );

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.DISPENSED,
        pharmacistId,
        dispensedAt: new Date(),
      },
      include: { items: { include: { drug: true } } },
    });
  }

  async checkExpiryAlerts(tenantId: string): Promise<Drug[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.drug.findMany({
      where: {
        tenantId,
        expiryDate: { lte: thirtyDaysFromNow, gte: now },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async checkReorderAlerts(tenantId: string): Promise<Drug[]> {
    const drugs = await this.prisma.drug.findMany({ where: { tenantId } });
    return drugs.filter((d) => d.stock <= d.reorderLevel);
  }

  async checkDrugInteractions(
    drugIds: string[],
    tenantId: string,
  ): Promise<DrugInteraction[]> {
    if (drugIds.length < 2) return [];

    // Verify all drugs belong to this tenant
    await Promise.all(drugIds.map((id) => this.findOneDrug(id, tenantId)));

    return this.prisma.drugInteraction.findMany({
      where: {
        OR: drugIds.flatMap((idA, i) =>
          drugIds.slice(i + 1).map((idB) => ({
            OR: [
              { drugAId: idA, drugBId: idB },
              { drugAId: idB, drugBId: idA },
            ],
          })),
        ),
      },
      include: { drugA: true, drugB: true },
    });
  }
}
