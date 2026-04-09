import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Appointment,
  QueueEntry,
  DoctorSchedule,
  AppointmentStatus,
  QueuePriority,
  QueueStatus,
  Prisma,
} from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    filters?: { doctorId?: string; patientId?: string; date?: string },
  ): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = { tenantId };
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

  async findOne(id: string, tenantId: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        telemedicineSession: true,
        queueEntry: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return appointment;
  }

  async create(dto: CreateAppointmentDto, tenantId: string): Promise<Appointment> {
    const scheduledAt = new Date(dto.scheduledAt);
    const duration = dto.duration ?? 30;
    const endAt = new Date(scheduledAt.getTime() + duration * 60000);

    // Check for overlapping appointments
    const candidates = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        doctorId: dto.doctorId,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
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
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        scheduledAt,
        duration,
        type: dto.type,
        notes: dto.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<CreateAppointmentDto>,
  ): Promise<Appointment> {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.type && { type: data.type }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async cancel(id: string, tenantId: string): Promise<Appointment> {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
  }

  async checkIn(appointmentId: string, tenantId: string): Promise<QueueEntry> {
    const appointment = await this.findOne(appointmentId, tenantId);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in for a cancelled appointment');
    }

    // Check if already checked in
    const existing = await this.prisma.queueEntry.findUnique({
      where: { appointmentId },
    });
    if (existing) {
      throw new BadRequestException('Patient is already in the queue');
    }

    // Auto-increment queue number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.queueEntry.count({
      where: {
        tenantId,
        createdAt: { gte: today },
      },
    });

    return this.prisma.queueEntry.create({
      data: {
        tenantId,
        patientId: appointment.patientId,
        appointmentId,
        queueNumber: todayCount + 1,
        priority: QueuePriority.NORMAL,
        status: QueueStatus.WAITING,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async callNext(tenantId: string): Promise<QueueEntry | null> {
    // Find next WAITING entry: highest priority first, then oldest first
    const next = await this.prisma.queueEntry.findFirst({
      where: { tenantId, status: QueueStatus.WAITING },
      orderBy: [
        { priority: 'desc' }, // EMERGENCY > URGENT > NORMAL
        { createdAt: 'asc' },
      ],
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!next) return null;

    return this.prisma.queueEntry.update({
      where: { id: next.id },
      data: { status: QueueStatus.CALLED, calledAt: new Date() },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getDoctorSchedule(doctorId: string, tenantId: string): Promise<DoctorSchedule[]> {
    return this.prisma.doctorSchedule.findMany({
      where: { doctorId, tenantId, isAvailable: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
