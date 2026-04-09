import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, QueuePriority, QueueStatus } from '@prisma/client';

interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  date?: string;
}

interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  scheduledAt: string | Date;
  duration?: number;
  type?: string;
  notes?: string;
  tenantId?: string;
}

interface CreateScheduleData {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  isAvailable?: boolean;
}

interface CheckInData {
  patientId: string;
  departmentId: string;
  priority?: QueuePriority;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters?: AppointmentFilters) {
    const where: {
      tenantId: string;
      doctorId?: string;
      patientId?: string;
      scheduledAt?: { gte: Date; lt: Date };
    } = { tenantId };

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
      include: { patient: true, telemedicineSession: true },
    });
    if (!appointment) throw new NotFoundException(`Appointment ${id} not found`);
    return appointment;
  }

  async create(data: CreateAppointmentData, tenantId: string) {
    const scheduledAt = new Date(data.scheduledAt);
    const duration = data.duration ?? 30;
    const endAt = new Date(scheduledAt.getTime() + duration * 60000);

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
      data: {
        tenantId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledAt,
        duration,
        type: (data.type ?? 'IN_PERSON') as Parameters<typeof this.prisma.appointment.create>[0]['data']['type'],
        notes: data.notes,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } } },
    });
  }

  async update(id: string, tenantId: string, data: Partial<CreateAppointmentData>) {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.appointment.update>[0]['data'],
    });
  }

  async cancel(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
  }

  // Doctor schedule management
  async getDoctorSchedule(doctorId: string) {
    return this.prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertSchedule(data: CreateScheduleData) {
    return this.prisma.doctorSchedule.upsert({
      where: { doctorId_dayOfWeek: { doctorId: data.doctorId, dayOfWeek: data.dayOfWeek } },
      create: data,
      update: { startTime: data.startTime, endTime: data.endTime, slotDuration: data.slotDuration, isAvailable: data.isAvailable },
    });
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });
    if (!schedule || !schedule.isAvailable) return [];

    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slotDuration = schedule.slotDuration;

    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);

    const booked = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        scheduledAt: { gte: d, lt: nextDay },
      },
      select: { scheduledAt: true, duration: true },
    });

    const slots: string[] = [];
    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const slotDate = new Date(d);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const slotEnd = new Date(slotDate.getTime() + slotDuration * 60000);

      const isBooked = booked.some((appt) => {
        const apptEnd = new Date(new Date(appt.scheduledAt).getTime() + appt.duration * 60000);
        return new Date(appt.scheduledAt) < slotEnd && apptEnd > slotDate;
      });

      if (!isBooked) slots.push(slotDate.toISOString());
    }
    return slots;
  }

  // Queue management
  async checkIn(tenantId: string, data: CheckInData) {
    const last = await this.prisma.queueEntry.findFirst({
      where: { tenantId, departmentId: data.departmentId, status: { in: ['WAITING', 'CALLED'] } },
      orderBy: { queueNumber: 'desc' },
    });
    const queueNumber = (last?.queueNumber ?? 0) + 1;

    return this.prisma.queueEntry.create({
      data: { ...data, tenantId, queueNumber, priority: data.priority ?? 'NORMAL' },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getQueue(tenantId: string, departmentId?: string) {
    return this.prisma.queueEntry.findMany({
      where: { tenantId, ...(departmentId ? { departmentId } : {}), status: { in: ['WAITING', 'CALLED'] } },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
    });
  }

  async callNext(tenantId: string, departmentId: string) {
    const next = await this.prisma.queueEntry.findFirst({
      where: { tenantId, departmentId, status: QueueStatus.WAITING },
      orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
    });
    if (!next) throw new NotFoundException('No patients waiting in queue');

    return this.prisma.queueEntry.update({
      where: { id: next.id },
      data: { status: QueueStatus.CALLED, calledAt: new Date() },
    });
  }

  async skipQueueEntry(entryId: string, tenantId: string) {
    const entry = await this.prisma.queueEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException(`Queue entry ${entryId} not found`);
    return this.prisma.queueEntry.update({ where: { id: entryId }, data: { status: QueueStatus.SKIPPED } });
  }

  async completeQueueEntry(entryId: string, tenantId: string) {
    const entry = await this.prisma.queueEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException(`Queue entry ${entryId} not found`);
    return this.prisma.queueEntry.update({
      where: { id: entryId },
      data: { status: QueueStatus.COMPLETED, completedAt: new Date() },
    });
  }
}
