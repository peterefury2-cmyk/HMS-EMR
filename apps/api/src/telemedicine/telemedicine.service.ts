import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TelemedicineService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.telemedicineSession.findMany({
      where: { tenantId },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { appointment: { scheduledAt: 'desc' } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const session = await this.prisma.telemedicineSession.findFirst({
      where: { id, tenantId },
      include: { appointment: { include: { patient: true } } },
    });
    if (!session) throw new NotFoundException(`Telemedicine session ${id} not found`);
    return session;
  }

  async create(data: any, tenantId: string) {
    return this.prisma.telemedicineSession.create({
      data: { ...data, tenantId, roomId: randomUUID() },
      include: { appointment: true },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({ where: { id }, data });
  }

  async startSession(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({
      where: { id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  async endSession(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }
}
