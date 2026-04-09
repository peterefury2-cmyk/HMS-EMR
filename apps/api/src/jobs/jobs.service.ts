import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_QUEUE,
  INVOICE_OVERDUE_QUEUE,
  EXPIRY_ALERT_QUEUE,
  APPOINTMENT_REMINDER_QUEUE,
} from './queue.constants';

export interface NotificationJobPayload {
  to: string;
  subject?: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly prisma: PrismaService) {
    this.initQueues();
  }

  private initQueues(): void {
    const connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    };
    const queueNames = [
      NOTIFICATION_QUEUE,
      INVOICE_OVERDUE_QUEUE,
      EXPIRY_ALERT_QUEUE,
      APPOINTMENT_REMINDER_QUEUE,
    ];
    for (const name of queueNames) {
      try {
        this.queues.set(name, new Queue(name, { connection }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Queue ${name} unavailable: ${msg}`);
      }
    }
  }

  async addNotificationJob(payload: NotificationJobPayload): Promise<void> {
    const queue = this.queues.get(NOTIFICATION_QUEUE);
    if (queue) {
      await queue.add('send', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } else {
      this.logger.warn(`[FALLBACK] Notification to ${payload.to}: ${payload.message}`);
    }
  }

  async addInvoiceOverdueCheck(): Promise<void> {
    const queue = this.queues.get(INVOICE_OVERDUE_QUEUE);
    if (queue) {
      await queue.add('check', {}, { attempts: 2, backoff: { type: 'fixed', delay: 5000 } });
    }
    await this.processOverdueInvoices();
  }

  async addExpiryAlertCheck(): Promise<void> {
    const queue = this.queues.get(EXPIRY_ALERT_QUEUE);
    if (queue) {
      await queue.add('check', {}, { attempts: 2, backoff: { type: 'fixed', delay: 5000 } });
    }
    await this.processExpiryAlerts();
  }

  async addAppointmentReminder(appointmentId: string): Promise<void> {
    const queue = this.queues.get(APPOINTMENT_REMINDER_QUEUE);
    if (queue) {
      await queue.add('remind', { appointmentId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    }
  }

  async processOverdueInvoices(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoice(s) as OVERDUE`);
    }
  }

  async processExpiryAlerts(): Promise<void> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDrugs = await this.prisma.drug.findMany({
      where: {
        expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      select: { id: true, name: true, expiryDate: true, tenantId: true },
    });

    for (const drug of expiringDrugs) {
      this.logger.warn(
        `Drug "${drug.name}" (tenant: ${drug.tenantId}) expires on ${drug.expiryDate?.toISOString()}`,
      );
    }
  }
}
