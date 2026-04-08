import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async findAllInvoices(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInvoice(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { patient: true, payments: true, insuranceClaims: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async createInvoice(data: any, tenantId: string) {
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.invoice.create({
      data: { ...data, tenantId, invoiceNo },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateInvoice(id: string, tenantId: string, data: any) {
    await this.findOneInvoice(id, tenantId);
    return this.prisma.invoice.update({ where: { id }, data });
  }

  async processPayment(data: any, tenantId: string) {
    const invoice = await this.findOneInvoice(data.invoiceId, tenantId);
    const payment = await this.prisma.payment.create({
      data: { ...data, status: 'COMPLETED' },
    });
    const totalPaid = (invoice.payments || []).reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    ) + Number(data.amount);
    if (totalPaid >= Number(invoice.amount)) {
      await this.prisma.invoice.update({
        where: { id: data.invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
    return payment;
  }

  async getBillingSummary(tenantId: string) {
    const [totalInvoices, paidInvoices, overdueInvoices, payments] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId, status: 'PAID' } }),
      this.prisma.invoice.count({ where: { tenantId, status: 'OVERDUE' } }),
      this.prisma.payment.aggregate({
        where: { invoice: { tenantId } },
        _sum: { amount: true },
      }),
    ]);
    return { totalInvoices, paidInvoices, overdueInvoices, totalRevenue: payments._sum.amount || 0 };
  }
}
