import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Cron service stub - provides scheduled task methods.
 * In production, decorate methods with @Cron from @nestjs/schedule.
 */
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private prisma: PrismaService) {}

  /** Run daily at midnight: mark overdue invoices */
  async markOverdueInvoices(): Promise<void> {
    this.logger.log('[CRON] Running overdue invoice check...');
    try {
      const result = await this.prisma.invoice.updateMany({
        where: {
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
        data: { status: 'OVERDUE' },
      });
      this.logger.log(`[CRON] Marked ${result.count} invoices as overdue`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Overdue invoice check failed: ${message}`);
    }
  }

  /** Run daily: send appointment reminders for tomorrow */
  async sendAppointmentReminders(): Promise<void> {
    this.logger.log('[CRON] Sending appointment reminders...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: tomorrow, lt: dayAfter },
          status: 'SCHEDULED',
        },
        include: {
          patient: { select: { email: true, firstName: true } },
        },
      });

      this.logger.log(`[CRON] Found ${appointments.length} appointments to remind`);

      for (const appt of appointments) {
        if (appt.patient.email) {
          this.logger.log(
            `[CRON] Would send reminder to ${appt.patient.email} for appointment ${appt.id}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Appointment reminders failed: ${message}`);
    }
  }

  /** Run weekly: check for expiring drugs */
  async checkDrugExpiry(): Promise<void> {
    this.logger.log('[CRON] Checking drug expiry...');
    try {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const expiringDrugs = await this.prisma.drug.findMany({
        where: { expiryDate: { lte: in30Days, gte: new Date() } },
        select: { id: true, name: true, expiryDate: true, tenantId: true },
      });

      this.logger.log(`[CRON] Found ${expiringDrugs.length} drugs expiring within 30 days`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Drug expiry check failed: ${message}`);
    }
  }
}
