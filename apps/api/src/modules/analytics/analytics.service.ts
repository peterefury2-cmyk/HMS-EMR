import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalPatients, totalAppointments, totalInvoices] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.appointment.count(),
      this.prisma.invoice.count(),
    ]);
    return { totalPatients, totalAppointments, totalInvoices };
  }

  async getRevenueStats() {
    const invoices = await this.prisma.invoice.findMany({
      select: { amount: true, status: true, createdAt: true },
    });
    return invoices;
  }

  async getPatientTrends() {
    const patients = await this.prisma.patient.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return patients;
  }
}
