import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface CreateInvoiceData {
  patientId: string;
  visitId?: string;
  items: InvoiceLineItem[];
  taxRate?: number;
  discount?: number;
  currency?: string;
  dueDate?: Date;
  notes?: string;
}

interface ProcessPaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: Date;
}

interface SubmitClaimData {
  invoiceId: string;
  policyId: string;
  amount: number;
  notes?: string;
}

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
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async createInvoice(data: CreateInvoiceData, tenantId: string) {
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - (item.discount ?? 0),
      0,
    );
    const taxAmount = parseFloat(((data.taxRate ?? 0) * subtotal).toFixed(2));
    const discount = data.discount ?? 0;
    const total = parseFloat((subtotal + taxAmount - discount).toFixed(2));

    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNo,
        patientId: data.patientId,
        items: data.items as unknown as Parameters<typeof this.prisma.invoice.create>[0]['data']['items'],
        subtotal,
        taxAmount,
        discount,
        amount: total,
        currency: data.currency ?? 'USD',
        dueDate: data.dueDate,
        notes: data.notes,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateInvoice(id: string, tenantId: string, data: Partial<CreateInvoiceData>) {
    await this.findOneInvoice(id, tenantId);
    return this.prisma.invoice.update({ where: { id }, data: data as unknown as Parameters<typeof this.prisma.invoice.update>[0]['data'] });
  }

  async processPayment(data: ProcessPaymentData, tenantId: string) {
    const invoice = await this.findOneInvoice(data.invoiceId, tenantId);

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(`Invoice is already ${invoice.status}`);
    }

    if (data.amount <= 0) throw new BadRequestException('Payment amount must be positive');

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        status: 'COMPLETED',
      },
    });

    const allPayments = await this.prisma.payment.findMany({
      where: { invoiceId: data.invoiceId, status: 'COMPLETED' },
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceAmount = Number(invoice.amount);

    let newStatus: InvoiceStatus;
    if (totalPaid >= invoiceAmount) {
      newStatus = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      newStatus = invoice.status;
    }

    await this.prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        status: newStatus,
        paidAt: newStatus === InvoiceStatus.PAID ? new Date() : undefined,
      },
    });

    return payment;
  }

  async submitInsuranceClaim(data: SubmitClaimData, tenantId: string) {
    await this.findOneInvoice(data.invoiceId, tenantId);
    const count = await this.prisma.insuranceClaim.count({ where: { tenantId } });
    const claimNo = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.insuranceClaim.create({
      data: {
        invoiceId: data.invoiceId,
        policyId: data.policyId,
        tenantId,
        claimNo,
        amount: data.amount,
      },
      include: { policy: true, invoice: true },
    });
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
    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue: payments._sum.amount ?? 0,
    };
  }
}
