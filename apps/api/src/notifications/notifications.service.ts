import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from '@prisma/client';
import { SendNotificationDto } from './dto/send-notification.dto';

export interface NotificationPayload {
  to: string;
  subject?: string;
  message: string;
  type: NotificationType;
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
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis not available: ${message}. Notifications will be logged only.`,
      );
    }
  }

  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    this.logger.log(`Queuing ${dto.type} notification to ${dto.recipient}`);

    const notification = await this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId ?? 'system',
        userId: dto.userId,
        type: dto.type,
        recipient: dto.recipient,
        subject: dto.subject,
        message: dto.message,
        status: NotificationStatus.PENDING,
      },
    });

    const payload: NotificationPayload & { notificationId: string } = {
      to: dto.recipient,
      subject: dto.subject,
      message: dto.message,
      type: dto.type,
      tenantId: dto.tenantId,
      userId: dto.userId,
      notificationId: notification.id,
    };

    if (this.notificationQueue) {
      try {
        await this.notificationQueue.add('send-notification', payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to queue notification: ${message}`);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED },
        });
      }
    } else {
      this.logger.warn(
        `[FALLBACK] Would send ${dto.type} to ${dto.recipient}: ${dto.message}`,
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    }

    return this.prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
  }

  async sendEmail(
    to: string,
    subject: string,
    message: string,
    tenantId?: string,
    userId?: string,
  ): Promise<Notification> {
    return this.sendNotification({
      recipient: to,
      subject,
      message,
      type: NotificationType.EMAIL,
      tenantId,
      userId,
    });
  }

  async sendSms(
    to: string,
    message: string,
    tenantId?: string,
    userId?: string,
  ): Promise<Notification> {
    return this.sendNotification({
      recipient: to,
      message,
      type: NotificationType.SMS,
      tenantId,
      userId,
    });
  }

  async sendAppointmentReminder(
    patientEmail: string,
    appointmentDate: Date,
    doctorName: string,
    tenantId?: string,
  ): Promise<Notification> {
    return this.sendEmail(
      patientEmail,
      'Appointment Reminder',
      `You have an appointment on ${appointmentDate.toLocaleDateString()} with Dr. ${doctorName}. Please arrive 10 minutes early.`,
      tenantId,
    );
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async findAll(tenantId: string, userId?: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { tenantId, ...(userId && { userId }) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
