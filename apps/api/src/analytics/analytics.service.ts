import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, LabOrderStatus } from '@prisma/client';

export interface DashboardStats {
  totalPatients: number;
  visitsToday: number;
  pendingLabOrders: number;
  activePrescriptions: number;
  revenueThisMonth: string;
}

export interface RevenueAnalytics {
  totalRevenue: string;
  paidInvoices: number;
  pendingAmount: string;
  overdueAmount: string;
  currency: string;
  period: { startDate: Date; endDate: Date };
}

export interface PatientTrend {
  date: string;
  newPatients: number;
}

export interface OperationalMetrics {
  appointmentCompletionRate: number;
  averageLabTurnaroundDays: number;
  averageVisitDurationDays: number;
  totalAppointments: number;
  completedAppointments: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalPatients, visitsToday, pendingLabOrders, activePrescriptions, revenueResult] = await Promise.all([
      this.prisma.patient.count({ where: { tenantId } }),
      this.prisma.visit.count({ where: { tenantId, createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.labOrder.count({ where: { tenantId, status: LabOrderStatus.PENDING } }),
      this.prisma.prescription.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.payment.aggregate({ where: { invoice: { tenantId }, status: 'COMPLETED', createdAt: { gte: firstOfMonth } }, _sum: { amount: true } }),
    ]);

    return { totalPatients, visitsToday, pendingLabOrders, activePrescriptions, revenueThisMonth: revenueResult._sum.amount?.toString() ?? '0' };
  }

  async getRevenueAnalytics(tenantId: string, startDate: Date, endDate: Date): Promise<RevenueAnalytics> {
    const [paidResult, pendingResult, overdueResult, paidCount] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { tenantId, status: InvoiceStatus.PAID, paidAt: { gte: startDate, lte: endDate } }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { tenantId, status: InvoiceStatus.SENT }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { tenantId, status: InvoiceStatus.OVERDUE }, _sum: { amount: true } }),
      this.prisma.invoice.count({ where: { tenantId, status: InvoiceStatus.PAID, paidAt: { gte: startDate, lte: endDate } } }),
    ]);

    return {
      totalRevenue: paidResult._sum.amount?.toString() ?? '0',
      paidInvoices: paidCount,
      pendingAmount: pendingResult._sum.amount?.toString() ?? '0',
      overdueAmount: overdueResult._sum.amount?.toString() ?? '0',
      currency: 'USD',
      period: { startDate, endDate },
    };
  }

  async getPatientTrends(tenantId: string, days: number): Promise<PatientTrend[]> {
    const trends: PatientTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prisma.patient.count({ where: { tenantId, createdAt: { gte: date, lt: nextDate } } });
      trends.push({ date: date.toISOString().split('T')[0], newPatients: count });
    }

    return trends;
  }

  async getOperationalMetrics(tenantId: string): Promise<OperationalMetrics> {
    const [totalAppointments, completedAppointments, labOrders] = await Promise.all([
      this.prisma.appointment.count({ where: { tenantId } }),
      this.prisma.appointment.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.labOrder.findMany({ where: { tenantId, status: LabOrderStatus.COMPLETED }, select: { createdAt: true, updatedAt: true } }),
    ]);

    const appointmentCompletionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100 * 10) / 10 : 0;

    let averageLabTurnaroundDays = 0;
    if (labOrders.length > 0) {
      const totalMs = labOrders.reduce((sum, o) => sum + (o.updatedAt.getTime() - o.createdAt.getTime()), 0);
      averageLabTurnaroundDays = Math.round((totalMs / labOrders.length / (1000 * 60 * 60 * 24)) * 10) / 10;
    }

    return { appointmentCompletionRate, averageLabTurnaroundDays, averageVisitDurationDays: 0, totalAppointments, completedAppointments };
  }
}
