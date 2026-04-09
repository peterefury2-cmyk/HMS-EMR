import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LabOrder,
  LabTest,
  LabOrderItem,
  LabSample,
  LabOrderStatus,
  SampleType,
  QueuePriority,
  Prisma,
} from '@prisma/client';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { EnterResultDto } from './dto/enter-result.dto';

interface CollectSampleDto {
  sampleType: SampleType;
  barcode: string;
}

const VALID_ORDER_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  [LabOrderStatus.PENDING]: [LabOrderStatus.COLLECTED, LabOrderStatus.CANCELLED],
  [LabOrderStatus.COLLECTED]: [LabOrderStatus.IN_PROGRESS, LabOrderStatus.CANCELLED],
  [LabOrderStatus.IN_PROGRESS]: [LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED],
  [LabOrderStatus.COMPLETED]: [],
  [LabOrderStatus.CANCELLED]: [],
};

function parseReferenceRange(referenceRange: string): { min: number; max: number } | null {
  const match = referenceRange.match(/^([\d.]+)-([\d.]+)$/);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

@Injectable()
export class LaboratoryService {
  constructor(private prisma: PrismaService) {}

  async findAllTests(tenantId: string): Promise<LabTest[]> {
    return this.prisma.labTest.findMany({ where: { tenantId } });
  }

  async createTest(
    data: Omit<Prisma.LabTestCreateInput, 'tenant'>,
    tenantId: string,
  ): Promise<LabTest> {
    return this.prisma.labTest.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async findAllOrders(tenantId: string): Promise<LabOrder[]> {
    return this.prisma.labOrder.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        items: { include: { labTest: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOrder(id: string, tenantId: string): Promise<LabOrder> {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        items: { include: { labTest: true } },
        samples: true,
      },
    });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    return order;
  }

  async createOrder(dto: CreateLabOrderDto, tenantId: string): Promise<LabOrder> {
    return this.prisma.labOrder.create({
      data: {
        tenantId,
        visitId: dto.visitId,
        patientId: dto.patientId,
        priority: dto.priority ?? QueuePriority.NORMAL,
        items: {
          create: dto.items.map((item) => ({ labTestId: item.labTestId })),
        },
      },
      include: { items: { include: { labTest: true } } },
    });
  }

  async updateOrderStatus(
    id: string,
    status: LabOrderStatus,
    tenantId: string,
  ): Promise<LabOrder> {
    const order = await this.findOneOrder(id, tenantId);
    const allowed = VALID_ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from '${order.status}' to '${status}'`,
      );
    }
    return this.prisma.labOrder.update({ where: { id }, data: { status } });
  }

  async collectSample(
    orderId: string,
    dto: CollectSampleDto,
    tenantId: string,
  ): Promise<LabSample> {
    const order = await this.findOneOrder(orderId, tenantId);
    if (order.status === LabOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot collect sample for a cancelled order');
    }

    const sample = await this.prisma.labSample.create({
      data: {
        labOrderId: orderId,
        sampleType: dto.sampleType,
        barcode: dto.barcode,
      },
    });

    // Advance order to COLLECTED if still PENDING
    if (order.status === LabOrderStatus.PENDING) {
      await this.prisma.labOrder.update({
        where: { id: orderId },
        data: { status: LabOrderStatus.COLLECTED },
      });
    }

    return sample;
  }

  async enterResult(itemId: string, dto: EnterResultDto): Promise<LabOrderItem> {
    const item = await this.prisma.labOrderItem.findUnique({
      where: { id: itemId },
      include: { labTest: true },
    });
    if (!item) throw new NotFoundException(`Lab order item ${itemId} not found`);

    let isAbnormal = false;
    let isCritical = false;

    if (dto.numericResult != null && item.labTest.referenceRange) {
      const range = parseReferenceRange(item.labTest.referenceRange);
      if (range) {
        const { min, max } = range;
        isAbnormal = dto.numericResult < min || dto.numericResult > max;
        // Critical: > 2x upper limit or < 0.5x lower limit
        isCritical = dto.numericResult > max * 2 || dto.numericResult < min * 0.5;
      }
    }

    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data: {
        result: dto.result,
        numericResult: dto.numericResult,
        unit: dto.unit ?? item.labTest.unit,
        isAbnormal,
        isCritical,
        status: 'COMPLETED',
        reportedAt: new Date(),
      },
    });
  }

  async getCriticalAlerts(tenantId: string): Promise<LabOrderItem[]> {
    return this.prisma.labOrderItem.findMany({
      where: {
        isCritical: true,
        labOrder: { tenantId },
      },
      include: {
        labTest: true,
        labOrder: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
    });
  }
}
