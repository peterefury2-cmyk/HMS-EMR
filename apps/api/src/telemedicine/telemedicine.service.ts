import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TelemedicineSession,
  ChatMessage,
  TelemedicineSessionStatus,
} from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TelemedicineService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<TelemedicineSession[]> {
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

  async findOne(id: string, tenantId: string): Promise<TelemedicineSession> {
    const session = await this.prisma.telemedicineSession.findFirst({
      where: { id, tenantId },
      include: {
        appointment: { include: { patient: true } },
        chatMessages: { orderBy: { sentAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException(`Telemedicine session ${id} not found`);
    return session;
  }

  async create(
    data: { appointmentId: string },
    tenantId: string,
  ): Promise<TelemedicineSession> {
    return this.prisma.telemedicineSession.create({
      data: {
        tenantId,
        appointmentId: data.appointmentId,
        roomId: randomUUID(),
        status: TelemedicineSessionStatus.WAITING,
      },
      include: { appointment: true },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<{ status: TelemedicineSessionStatus }>,
  ): Promise<TelemedicineSession> {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({ where: { id }, data });
  }

  async startSession(id: string, tenantId: string): Promise<TelemedicineSession> {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({
      where: { id },
      data: {
        status: TelemedicineSessionStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
  }

  async endSession(id: string, tenantId: string): Promise<TelemedicineSession> {
    const session = await this.findOne(id, tenantId);
    const endedAt = new Date();
    let durationMin: number | undefined;

    if (session.startedAt) {
      durationMin = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000);
    }

    return this.prisma.telemedicineSession.update({
      where: { id },
      data: {
        status: TelemedicineSessionStatus.ENDED,
        endedAt,
        ...(durationMin !== undefined && { durationMin }),
      },
    });
  }

  async sendMessage(dto: SendMessageDto, tenantId: string): Promise<ChatMessage> {
    const session = await this.prisma.telemedicineSession.findFirst({
      where: { id: dto.sessionId, tenantId },
    });
    if (!session) throw new NotFoundException(`Session ${dto.sessionId} not found`);

    return this.prisma.chatMessage.create({
      data: {
        sessionId: dto.sessionId,
        senderId: dto.senderId,
        message: dto.message,
        type: dto.type ?? 'TEXT',
      },
    });
  }

  async getMessages(sessionId: string, tenantId: string): Promise<ChatMessage[]> {
    const session = await this.prisma.telemedicineSession.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { sentAt: 'asc' },
    });
  }
}
