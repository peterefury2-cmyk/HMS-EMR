import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters?: { doctorId?: string; patientId?: string; date?: string }) {
    const where: any = { tenantId };
    if (filters?.doctorId) where.doctorId = filters.doctorId;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.scheduledAt = { gte: d, lt: next };
    }
    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        telemedicineSession: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return appointment;
  }

  async create(data: any, tenantId: string) {
    const scheduledAt = new Date(data.scheduledAt);
    const endAt = new Date(scheduledAt.getTime() + (data.duration || 30) * 60000);

    // Check for overlapping appointments using Prisma raw query for accurate overlap detection.
    // Two intervals [A_start, A_end) and [B_start, B_end) overlap iff A_start < B_end AND A_end > B_start.
    // We fetch candidates where scheduledAt < endAt, then filter in-process for the other direction.
    const candidates = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        doctorId: data.doctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        scheduledAt: { lt: endAt },
      },
      select: { id: true, scheduledAt: true, duration: true },
    });

    const conflict = candidates.find((appt) => {
      const apptEnd = new Date(new Date(appt.scheduledAt).getTime() + appt.duration * 60000);
      return apptEnd > scheduledAt;
    });

    if (conflict) {
      throw new BadRequestException('Doctor already has an appointment in this time slot');
    }

    return this.prisma.appointment.create({
      data: { ...data, tenantId, scheduledAt },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({ where: { id }, data });
  }

  async cancel(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
