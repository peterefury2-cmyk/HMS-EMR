import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { Queue } from 'bullmq';

interface CreateNotificationData {
  userId: string;
  tenantId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationPayload {
  to: string;
  subject?: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationQueue: Queue | null = null;

  constructor(private prisma: PrismaService) {
    try {
      this.notificationQueue = new Queue('notifications', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis not available: ${message}. Notifications will be logged only.`,
      );
    }
  }

  async createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { status: { not: NotificationStatus.READ } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, status: { not: NotificationStatus.READ } },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    this.logger.log(`Queuing ${payload.type} notification to ${payload.to}`);
    if (this.notificationQueue) {
      await this.notificationQueue.add('send-notification', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } else {
      this.logger.warn(`[FALLBACK] Would send ${payload.type} to ${payload.to}: ${payload.message}`);
    }
  }

  async sendEmail(to: string, subject: string, message: string, tenantId?: string): Promise<void> {
    await this.sendNotification({ to, subject, message, type: 'EMAIL', tenantId });
  }

  async sendSms(to: string, message: string, tenantId?: string): Promise<void> {
    await this.sendNotification({ to, message, type: 'SMS', tenantId });
  }

  async sendAppointmentReminder(
    patientEmail: string,
    appointmentDate: Date,
    doctorName: string,
  ): Promise<void> {
    await this.sendEmail(
      patientEmail,
      'Appointment Reminder',
      `You have an appointment on ${appointmentDate.toLocaleDateString()} with Dr. ${doctorName}. Please arrive 10 minutes early.`,
    );
  }
}
