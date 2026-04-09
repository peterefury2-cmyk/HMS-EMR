import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LaboratoryService {
  constructor(private prisma: PrismaService) {}

  async findAllTests(tenantId: string) {
    return this.prisma.labTest.findMany({ where: { tenantId } });
  }

  async createTest(data: any, tenantId: string) {
    return this.prisma.labTest.create({ data: { ...data, tenantId } });
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

  async createOrder(data: any, tenantId: string) {
    const { items, ...orderData } = data;
    return this.prisma.labOrder.create({
      data: {
        ...orderData,
        tenantId,
        items: { create: items },
      },
      include: { items: { include: { labTest: true } } },
    });
  }

  async updateOrder(id: string, tenantId: string, data: any) {
    await this.findOneOrder(id, tenantId);
    return this.prisma.labOrder.update({ where: { id }, data });
  }

  async updateOrderItemResult(itemId: string, result: string, unit?: string) {
    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data: { result, unit, status: 'COMPLETED', reportedAt: new Date() },
    });
  }
}
