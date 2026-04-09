import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus, SampleType } from '@prisma/client';
import { randomBytes } from 'crypto';

interface CreateLabTestData {
  name: string;
  code: string;
  category: string;
  price: number;
  loincCode?: string;
  referenceRange?: string;
  unit?: string;
}

interface CreateLabOrderData {
  patientId: string;
  visitId: string;
  requestedById: string;
  items: Array<{ labTestId: string }>;
  priority?: string;
  notes?: string;
}

interface CreateSampleData {
  sampleType: SampleType;
  collectedBy: string;
}

interface RecordResultData {
  result: string;
  unit?: string;
  isAbnormal?: boolean;
}

const VALID_ORDER_TRANSITIONS: Record<string, LabOrderStatus[]> = {
  PENDING: ['COLLECTED', 'CANCELLED'],
  COLLECTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class LaboratoryService {
  constructor(private prisma: PrismaService) {}

  async findAllTests(tenantId: string) {
    return this.prisma.labTest.findMany({ where: { tenantId } });
  }

  async createTest(data: CreateLabTestData, tenantId: string) {
    return this.prisma.labTest.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        category: data.category,
        price: data.price,
        loincCode: data.loincCode,
        referenceRange: data.referenceRange,
        unit: data.unit,
      },
    });
  }

  async findAllOrders(tenantId: string) {
    return this.prisma.labOrder.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        items: { include: { labTest: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOrder(id: string, tenantId: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        items: { include: { labTest: true } },
      },
    });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    return order;
  }

  async createOrder(data: CreateLabOrderData, tenantId: string) {
    const { items, ...orderData } = data;
    return this.prisma.labOrder.create({
      data: {
        tenantId,
        visitId: orderData.visitId,
        patientId: orderData.patientId,
        items: { create: items },
      },
      include: { items: { include: { labTest: true } } },
    });
  }

  async updateOrderStatus(id: string, tenantId: string, status: LabOrderStatus) {
    const order = await this.findOneOrder(id, tenantId);
    const allowed = VALID_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition lab order from ${order.status} to ${status}`,
      );
    }
    return this.prisma.labOrder.update({ where: { id }, data: { status } });
  }

  async collectSample(orderId: string, tenantId: string, data: CreateSampleData) {
    const order = await this.findOneOrder(orderId, tenantId);
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Samples can only be collected for PENDING orders');
    }

    const barcode = `LAB-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const [sample] = await this.prisma.$transaction([
      this.prisma.labSample.create({
        data: {
          labOrderId: orderId,
          sampleType: data.sampleType,
          barcode,
          collectedBy: data.collectedBy,
        },
      }),
      this.prisma.labOrder.update({
        where: { id: orderId },
        data: { status: 'COLLECTED' },
      }),
    ]);

    return sample;
  }

  async recordResult(
    itemId: string,
    data: RecordResultData,
  ) {
    const item = await this.prisma.labOrderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Lab order item ${itemId} not found`);

    const isAbnormal = data.isAbnormal ?? false;

    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data: {
        result: data.result,
        unit: data.unit,
        isAbnormal,
        status: 'COMPLETED',
        reportedAt: new Date(),
      },
    });
  }
}
