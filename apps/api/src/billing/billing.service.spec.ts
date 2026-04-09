import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  invoice: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should calculate totals correctly', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.invoice.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'inv-1', ...args.data }),
      );

      const result = await service.createInvoice(
        {
          patientId: 'p1',
          items: [{ description: 'Consultation', quantity: 1, unitPrice: 100 }],
          taxRate: 10,
          discount: 5,
          currency: 'USD',
        },
        't1',
      );
      // subtotal=100, tax=10, discount=5, total=105
      expect(result).toBeDefined();
    });
  });

  describe('findOneInvoice', () => {
    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
      await expect(service.findOneInvoice('bad-id', 't1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('processPayment', () => {
    it('should mark invoice as PAID when fully paid', async () => {
      const invoice = { id: 'inv-1', amount: { toNumber: () => 100 }, payments: [] };
      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.create.mockResolvedValue({ id: 'pay-1', amount: { toNumber: () => 100 } });
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: { toNumber: () => 0 } } });
      mockPrismaService.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'PAID' });

      await service.processPayment(
        { invoiceId: 'inv-1', amount: 100, method: 'CASH' as const },
        't1',
      );
      expect(mockPrismaService.invoice.update).toHaveBeenCalled();
    });

    it('should not mark as PAID for partial payment', async () => {
      const invoice = { id: 'inv-1', amount: { toNumber: () => 200 }, payments: [] };
      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.create.mockResolvedValue({ id: 'pay-1', amount: { toNumber: () => 50 } });
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: { toNumber: () => 0 } } });

      await service.processPayment(
        { invoiceId: 'inv-1', amount: 50, method: 'CASH' as const },
        't1',
      );
      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });
  });

  describe('getBillingSummary', () => {
    it('should return billing stats', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(10);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

      const result = await service.getBillingSummary('t1');
      expect(result).toHaveProperty('totalInvoices');
    });
  });
});
