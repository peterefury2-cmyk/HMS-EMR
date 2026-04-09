import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  invoice: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  insuranceClaim: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should calculate subtotal, tax, and total correctly', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );

      const result = await service.createInvoice(
        {
          patientId: 'patient-1',
          items: [
            { description: 'Consultation', quantity: 1, unitPrice: 100 },
            { description: 'Lab Test', quantity: 2, unitPrice: 50 },
          ],
          taxRate: 0.1,
          discount: 10,
        },
        'tenant-1',
      ) as unknown as { subtotal: number; taxAmount: number; amount: number };

      expect(result.subtotal).toBe(200);
      expect(result.taxAmount).toBe(20);
      expect(result.amount).toBe(210);
    });

    it('should generate sequential invoice numbers', async () => {
      mockPrisma.invoice.count.mockResolvedValue(4);
      mockPrisma.invoice.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );

      const result = await service.createInvoice(
        { patientId: 'p1', items: [{ description: 'Item', quantity: 1, unitPrice: 100 }] },
        'tenant-1',
      ) as unknown as { invoiceNo: string };

      expect(result.invoiceNo).toContain('INV-');
      expect(result.invoiceNo).toContain('00005');
    });
  });

  describe('findOneInvoice', () => {
    it('should throw NotFoundException if invoice not found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      await expect(service.findOneInvoice('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('processPayment', () => {
    it('should throw BadRequestException for already paid invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'PAID',
        amount: 100,
        payments: [],
      });

      await expect(
        service.processPayment({ invoiceId: 'inv-1', amount: 50, method: 'CASH' as Parameters<typeof service.processPayment>[0]['method'] }, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update invoice to PAID when fully paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        amount: 100,
        payments: [],
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 100 });
      mockPrisma.payment.findMany.mockResolvedValue([{ id: 'pay-1', amount: 100 }]);
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'PAID' });

      await service.processPayment(
        { invoiceId: 'inv-1', amount: 100, method: 'CASH' as Parameters<typeof service.processPayment>[0]['method'] },
        'tenant-1',
      );

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
      );
    });

    it('should set PARTIALLY_PAID status for partial payment', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        amount: 200,
        payments: [],
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 50 });
      mockPrisma.payment.findMany.mockResolvedValue([{ id: 'pay-1', amount: 50 }]);
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'PARTIALLY_PAID' });

      await service.processPayment(
        { invoiceId: 'inv-1', amount: 50, method: 'CARD' as Parameters<typeof service.processPayment>[0]['method'] },
        'tenant-1',
      );

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PARTIALLY_PAID' }) }),
      );
    });

    it('should throw for zero or negative payment amount', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        amount: 100,
        payments: [],
      });

      await expect(
        service.processPayment(
          { invoiceId: 'inv-1', amount: 0, method: 'CASH' as Parameters<typeof service.processPayment>[0]['method'] },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBillingSummary', () => {
    it('should return aggregate billing stats', async () => {
      mockPrisma.invoice.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(5);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 50000 } });

      const result = await service.getBillingSummary('tenant-1');
      expect(result.totalInvoices).toBe(100);
      expect(result.paidInvoices).toBe(60);
      expect(result.totalRevenue).toBe(50000);
    });
  });
});
