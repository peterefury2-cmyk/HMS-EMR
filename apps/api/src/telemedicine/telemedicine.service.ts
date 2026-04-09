import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface CreateSessionData {
  appointmentId: string;
}

interface SendMessageData {
  senderId: string;
  content: string;
  messageType?: string;
  fileUrl?: string;
}

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

  async create(data: CreateSessionData, tenantId: string) {
    return this.prisma.telemedicineSession.create({
      data: { ...data, tenantId, roomId: randomUUID() },
      include: { appointment: true },
    });
  }

  async startSession(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.telemedicineSession.update({
      where: { id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  async endSession(id: string, tenantId: string) {
    const session = await this.findOne(id, tenantId);
    void session; // duration tracking not in schema

    return this.prisma.telemedicineSession.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  async sendMessage(sessionId: string, tenantId: string, data: SendMessageData) {
    const session = await this.findOne(sessionId, tenantId);
    if (session.status !== 'ACTIVE') {
      throw new NotFoundException('Session is not active');
    }
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId: data.senderId,
        content: data.content,
        messageType: data.messageType ?? 'TEXT',
        fileUrl: data.fileUrl,
      },
    });
  }

  async getMessages(sessionId: string, tenantId: string) {
    await this.findOne(sessionId, tenantId);
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
