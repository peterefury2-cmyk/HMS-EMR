import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface NotificationJob {
  userId: string;
  title: string;
  body: string;
  type: string;
  tenantId?: string;
}

/**
 * Notification processor stub.
 * In production, wire this up with @nestjs/bull or a similar queue processor.
 * Methods here are called directly for testing/fallback.
 */
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {}

  async process(job: NotificationJob): Promise<void> {
    this.logger.log(`Processing notification job for user ${job.userId}: ${job.title}`);

    try {
      await this.prisma.notification.create({
        data: {
          userId: job.userId,
          tenantId: job.tenantId,
          type: job.type as Parameters<typeof this.prisma.notification.create>[0]['data']['type'],
          title: job.title,
          body: job.body,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      this.logger.log(`Notification stored for user ${job.userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process notification: ${message}`);
      throw error;
    }
  }
}
