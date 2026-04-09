import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmrService } from './emr.service';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStatus, VisitType } from '@prisma/client';

const mockPrismaService = {
  visit: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  clinicalNote: { create: jest.fn() },
  vitalSigns: { create: jest.fn() },
  diagnosis: { create: jest.fn() },
  patient: { findFirst: jest.fn() },
};

describe('EmrService', () => {
  let service: EmrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmrService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<EmrService>(EmrService);
    jest.clearAllMocks();
  });

  describe('createVisit', () => {
    it('should create a visit successfully', async () => {
      const visit = { id: 'v1', patientId: 'p1', tenantId: 't1', status: VisitStatus.SCHEDULED };
      mockPrismaService.visit.create.mockResolvedValue(visit);
      const result = await service.createVisit(
        { patientId: 'p1', doctorId: 'd1', type: VisitType.OUTPATIENT, chiefComplaint: 'Headache' },
        't1',
      );
      expect(result.id).toBe('v1');
    });
  });

  describe('getVisit', () => {
    it('should throw NotFoundException when visit not found', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue(null);
      await expect(service.getVisit('bad-id', 't1')).rejects.toThrow(NotFoundException);
    });

    it('should return visit when found', async () => {
      const visit = { id: 'v1', patient: {}, doctor: {} };
      mockPrismaService.visit.findFirst.mockResolvedValue(visit);
      const result = await service.getVisit('v1', 't1');
      expect(result.id).toBe('v1');
    });
  });

  describe('recordVitals', () => {
    it('should auto-calculate BMI when weight and height provided', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.vitalSigns.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );
      const result = await service.recordVitals(
        'v1',
        { weight: 70, height: 175 },
        't1',
      );
      expect((result as Record<string, unknown>).bmi).toBeCloseTo(22.86, 1);
    });
  });

  describe('addDiagnosis', () => {
    it('should accept valid ICD-10 code', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.diagnosis.create.mockResolvedValue({ id: 'd1', icdCode: 'J00' });
      const result = await service.addDiagnosis(
        'v1',
        { icdCode: 'J00', description: 'Common Cold', type: 'PRIMARY', icdVersion: 'ICD_10' } as Parameters<typeof service.addDiagnosis>[1],
        't1',
      );
      expect(result.icdCode).toBe('J00');
    });

    it('should throw BadRequestException for invalid ICD-10 code', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue({ id: 'v1' });
      await expect(
        service.addDiagnosis('v1', { icdCode: 'INVALID', description: 'X', type: 'PRIMARY', icdVersion: 'ICD_10' } as Parameters<typeof service.addDiagnosis>[1], 't1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateVisitStatus', () => {
    it('should allow valid transition SCHEDULED -> IN_PROGRESS', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue({ id: 'v1', status: VisitStatus.SCHEDULED });
      mockPrismaService.visit.update.mockResolvedValue({ id: 'v1', status: VisitStatus.IN_PROGRESS });
      const result = await service.updateVisitStatus('v1', VisitStatus.IN_PROGRESS, 't1');
      expect(result.status).toBe(VisitStatus.IN_PROGRESS);
    });

    it('should throw BadRequestException for invalid backward transition', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue({ id: 'v1', status: VisitStatus.COMPLETED });
      await expect(
        service.updateVisitStatus('v1', VisitStatus.SCHEDULED, 't1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
