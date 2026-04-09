import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DashboardStats {
  totalPatients: number;
  visitsToday: number;
  revenueThisMonth: number;
  pendingLabOrders: number;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoiceCount: number;
}

interface RevenueAnalytics {
  total: number;
  data: RevenueDataPoint[];
}

interface PatientAnalytics {
  totalPatients: number;
  newThisMonth: number;
  newThisWeek: number;
  byGender: Record<string, number>;
}

interface DiagnosisCount {
  icdCode: string;
  description: string | null;
  count: number;
}

interface DiseaseAnalytics {
  topDiagnoses: DiagnosisCount[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPatients, visitsToday, revenueAgg, pendingLabOrders] = await Promise.all([
      this.prisma.patient.count({ where: { tenantId } }),
      this.prisma.visit.count({
        where: { tenantId, createdAt: { gte: startOfToday, lt: endOfToday } },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { tenantId },
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.labOrder.count({ where: { tenantId, status: 'PENDING' } }),
    ]);

    return {
      totalPatients,
      visitsToday,
      revenueThisMonth: Number(revenueAgg._sum.amount ?? 0),
      pendingLabOrders,
    };
  }

  async getRevenueAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueAnalytics> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
        updatedAt: { gte: startDate, lte: endDate },
      },
      select: { updatedAt: true, amount: true },
    });

    const grouped: Record<string, { revenue: number; count: number }> = {};
    for (const inv of invoices) {
      const dateKey = inv.updatedAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = { revenue: 0, count: 0 };
      grouped[dateKey].revenue += Number(inv.amount);
      grouped[dateKey].count += 1;
    }

    const data: RevenueDataPoint[] = Object.entries(grouped)
      .map(([date, v]) => ({ date, revenue: v.revenue, invoiceCount: v.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = data.reduce((sum, d) => sum + d.revenue, 0);

    return { total, data };
  }

  async getPatientAnalytics(tenantId: string): Promise<PatientAnalytics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [totalPatients, newThisMonth, newThisWeek, patients] = await Promise.all([
      this.prisma.patient.count({ where: { tenantId } }),
      this.prisma.patient.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.patient.count({ where: { tenantId, createdAt: { gte: startOfWeek } } }),
      this.prisma.patient.findMany({ where: { tenantId }, select: { gender: true } }),
    ]);

    const byGender: Record<string, number> = {};
    for (const p of patients) {
      byGender[p.gender] = (byGender[p.gender] ?? 0) + 1;
    }

    return { totalPatients, newThisMonth, newThisWeek, byGender };
  }

  async getDiseaseAnalytics(tenantId: string): Promise<DiseaseAnalytics> {
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: { visit: { tenantId } },
      select: { icdCode: true, description: true },
    });

    const counts: Record<string, { description: string | null; count: number }> = {};
    for (const d of diagnoses) {
      if (!counts[d.icdCode]) counts[d.icdCode] = { description: d.description, count: 0 };
      counts[d.icdCode].count += 1;
    }

    const topDiagnoses: DiagnosisCount[] = Object.entries(counts)
      .map(([icdCode, v]) => ({ icdCode, description: v.description, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topDiagnoses };
  }
}
