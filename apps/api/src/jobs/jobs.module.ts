import { Module } from '@nestjs/common';
import { NotificationProcessor } from './processors/notification.processor';
import { CronService } from './schedulers/cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationProcessor, CronService],
  exports: [NotificationProcessor, CronService],
})
export class JobsModule {}
