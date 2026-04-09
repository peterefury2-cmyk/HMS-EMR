import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Invoice,
  Payment,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { CreateInvoiceDto, InvoiceItemDto } from './dto/create-invoice.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

export interface BillingSummary {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  pendingInvoices: number;
  totalRevenue: Prisma.Decimal | null;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async findAllInvoices(tenantId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInvoice(id: string, tenantId: string): Promise<Invoice & { payments: Payment[] }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { patient: true, payments: true, insuranceClaims: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async createInvoice(dto: CreateInvoiceDto, tenantId: string): Promise<Invoice> {
    const subtotal = dto.items.reduce(
      (sum, item: InvoiceItemDto) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxRate = dto.taxRate ?? 0;
    const discount = dto.discount ?? 0;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const total = parseFloat((subtotal + taxAmount - discount).toFixed(2));

    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        invoiceNo,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
        discount: new Prisma.Decimal(discount.toFixed(2)),
        amount: new Prisma.Decimal(total.toFixed(2)),
        currency: dto.currency ?? 'USD',
        items: dto.items as unknown as Prisma.InputJsonValue,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        status: InvoiceStatus.DRAFT,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async processPayment(dto: ProcessPaymentDto, tenantId: string): Promise<Payment> {
    const invoice = await this.findOneInvoice(dto.invoiceId, tenantId);

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        method: dto.method,
        reference: dto.reference,
        gateway: dto.gateway,
        status: PaymentStatus.COMPLETED,
      },
    });

    const totalPaid =
      invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;

    if (totalPaid >= Number(invoice.amount)) {
      await this.prisma.invoice.update({
        where: { id: dto.invoiceId },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
    }

    return payment;
  }

  async refundPayment(paymentId: string, tenantId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { tenantId } },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  async getBillingSummary(tenantId: string): Promise<BillingSummary> {
    const [totalInvoices, paidInvoices, overdueInvoices, pendingInvoices, payments] =
      await Promise.all([
        this.prisma.invoice.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: InvoiceStatus.PAID } }),
        this.prisma.invoice.count({ where: { tenantId, status: InvoiceStatus.OVERDUE } }),
        this.prisma.invoice.count({ where: { tenantId, status: InvoiceStatus.SENT } }),
        this.prisma.payment.aggregate({
          where: { invoice: { tenantId }, status: PaymentStatus.COMPLETED },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      pendingInvoices,
      totalRevenue: payments._sum.amount,
    };
  }
}
