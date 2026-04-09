import { Test, TestingModule } from '@nestjs/testing';
import { EmrService } from '../emr.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NoteType } from '@prisma/client';

const mockPrisma = {
  visit: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  clinicalNote: {
    create: jest.fn(),
  },
  vitalSigns: {
    create: jest.fn(),
  },
  diagnosis: {
    create: jest.fn(),
  },
  patient: {
    findFirst: jest.fn(),
  },
  drugInteraction: {
    findMany: jest.fn(),
  },
  prescription: {
    create: jest.fn(),
  },
};

describe('EmrService', () => {
  let service: EmrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmrService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmrService>(EmrService);
    jest.clearAllMocks();
  });

  describe('getVisit', () => {
    it('should throw NotFoundException if visit not found', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue(null);
      await expect(service.getVisit('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('should return visit when found', async () => {
      const mockVisit = { id: 'visit-1', tenantId: 'tenant-1', status: 'SCHEDULED' };
      mockPrisma.visit.findFirst.mockResolvedValue(mockVisit);
      const result = await service.getVisit('visit-1', 'tenant-1');
      expect(result).toEqual(mockVisit);
    });
  });

  describe('addClinicalNote', () => {
    it('should throw BadRequestException for SOAP note missing fields', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      await expect(
        service.addClinicalNote(
          'visit-1',
          { authorId: 'doc-1', noteType: NoteType.SOAP, subjective: 'Headache' },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create SOAP note when all fields are present', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      mockPrisma.clinicalNote.create.mockResolvedValue({ id: 'note-1' });

      await service.addClinicalNote(
        'visit-1',
        {
          authorId: 'doc-1',
          noteType: NoteType.SOAP,
          subjective: 'Headache',
          objective: 'BP 120/80',
          assessment: 'Tension headache',
          plan: 'Analgesics',
        },
        'tenant-1',
      );

      expect(mockPrisma.clinicalNote.create).toHaveBeenCalled();
    });
  });

  describe('addDiagnosis', () => {
    it('should throw BadRequestException for invalid ICD code', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      await expect(
        service.addDiagnosis(
          'visit-1',
          { icdCode: 'INVALID', description: 'Test', doctorId: 'doc-1' },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid ICD code format A00', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      mockPrisma.diagnosis.create.mockResolvedValue({ id: 'diag-1' });

      await service.addDiagnosis(
        'visit-1',
        { icdCode: 'J00', description: 'Common cold', doctorId: 'doc-1' },
        'tenant-1',
      );

      expect(mockPrisma.diagnosis.create).toHaveBeenCalled();
    });

    it('should accept valid ICD code with decimal J11.1', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      mockPrisma.diagnosis.create.mockResolvedValue({ id: 'diag-1' });

      await service.addDiagnosis(
        'visit-1',
        { icdCode: 'J11.1', description: 'Flu', doctorId: 'doc-1' },
        'tenant-1',
      );
      expect(mockPrisma.diagnosis.create).toHaveBeenCalled();
    });
  });

  describe('updateVisitStatus', () => {
    it('should throw BadRequestException for invalid transition', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1', status: 'COMPLETED' });
      await expect(
        service.updateVisitStatus('visit-1', 'IN_PROGRESS' as Parameters<typeof service.updateVisitStatus>[1], 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid transition SCHEDULED -> IN_PROGRESS', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1', status: 'SCHEDULED' });
      mockPrisma.visit.update.mockResolvedValue({ id: 'visit-1', status: 'IN_PROGRESS' });

      const result = await service.updateVisitStatus('visit-1', 'IN_PROGRESS' as Parameters<typeof service.updateVisitStatus>[1], 'tenant-1');
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('recordVitals', () => {
    it('should auto-calculate BMI when weight and height provided', async () => {
      mockPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
      mockPrisma.vitalSigns.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );

      const result = await service.recordVitals(
        'visit-1',
        { weight: 70, height: 175, recordedById: 'nurse-1' },
        'tenant-1',
      ) as { bmi: number };

      expect(result.bmi).toBeCloseTo(22.86, 1);
    });
  });
});
