import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  patient: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  visit: {
    count: jest.fn(),
  },
  payment: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  labOrder: {
    count: jest.fn(),
  },
  invoice: {
    findMany: jest.fn(),
  },
  diagnosis: {
    findMany: jest.fn(),
  },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return correct dashboard stats', async () => {
      mockPrisma.patient.count.mockResolvedValue(500);
      mockPrisma.visit.count.mockResolvedValue(25);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 150000 } });
      mockPrisma.labOrder.count.mockResolvedValue(12);

      const result = await service.getDashboardStats('tenant-1');

      expect(result.totalPatients).toBe(500);
      expect(result.visitsToday).toBe(25);
      expect(result.revenueThisMonth).toBe(150000);
      expect(result.pendingLabOrders).toBe(12);
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrisma.patient.count.mockResolvedValue(0);
      mockPrisma.visit.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.labOrder.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('tenant-1');
      expect(result.revenueThisMonth).toBe(0);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should group revenue by date', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.invoice.findMany.mockResolvedValue([
        { updatedAt: new Date('2024-01-05'), amount: 100 },
        { updatedAt: new Date('2024-01-05'), amount: 150 },
        { updatedAt: new Date('2024-01-10'), amount: 200 },
      ]);

      const result = await service.getRevenueAnalytics('tenant-1', startDate, endDate);

      expect(result.total).toBe(450);
      expect(result.data).toHaveLength(2);
      const jan5 = result.data.find((d) => d.date === '2024-01-05');
      expect(jan5?.revenue).toBe(250);
      expect(jan5?.invoiceCount).toBe(2);
    });

    it('should return empty data for no invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      const result = await service.getRevenueAnalytics('tenant-1', new Date(), new Date());
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getPatientAnalytics', () => {
    it('should return patient breakdown by gender', async () => {
      mockPrisma.patient.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrisma.patient.findMany.mockResolvedValue([
        { gender: 'MALE' },
        { gender: 'MALE' },
        { gender: 'FEMALE' },
        { gender: 'FEMALE' },
        { gender: 'FEMALE' },
      ]);

      const result = await service.getPatientAnalytics('tenant-1');

      expect(result.totalPatients).toBe(100);
      expect(result.byGender['MALE']).toBe(2);
      expect(result.byGender['FEMALE']).toBe(3);
    });
  });

  describe('getDiseaseAnalytics', () => {
    it('should return top diagnoses sorted by count', async () => {
      mockPrisma.diagnosis.findMany.mockResolvedValue([
        { icdCode: 'J00', description: 'Common cold' },
        { icdCode: 'J00', description: 'Common cold' },
        { icdCode: 'J00', description: 'Common cold' },
        { icdCode: 'I10', description: 'Hypertension' },
        { icdCode: 'I10', description: 'Hypertension' },
        { icdCode: 'E11.9', description: 'Type 2 diabetes' },
      ]);

      const result = await service.getDiseaseAnalytics('tenant-1');

      expect(result.topDiagnoses).toHaveLength(3);
      expect(result.topDiagnoses[0].icdCode).toBe('J00');
      expect(result.topDiagnoses[0].count).toBe(3);
      expect(result.topDiagnoses[1].icdCode).toBe('I10');
    });

    it('should return at most 10 diagnoses', async () => {
      const diagnoses = Array.from({ length: 20 }, (_, i) => ({
        icdCode: `A${String(i).padStart(2, '0')}`,
        description: `Condition ${i}`,
      }));
      mockPrisma.diagnosis.findMany.mockResolvedValue(diagnoses);

      const result = await service.getDiseaseAnalytics('tenant-1');
      expect(result.topDiagnoses.length).toBeLessThanOrEqual(10);
    });
  });
});
