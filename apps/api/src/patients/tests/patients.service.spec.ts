import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from '../patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  patient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  patientNextOfKin: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  medicalHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  consentRecord: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  visit: {
    findMany: jest.fn(),
  },
  labOrder: {
    findMany: jest.fn(),
  },
  prescription: {
    findMany: jest.fn(),
  },
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should generate patient number in PT-YYYYMMDD-XXXXX format', async () => {
      mockPrisma.patient.count.mockResolvedValue(0);
      mockPrisma.patient.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );

      const result = await service.create(
        {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'MALE',
          phone: '+1234567890',
        },
        'tenant-1',
      ) as { patientNo: string };

      expect(result.patientNo).toMatch(/^PT-\d{8}-\d{5}$/);
    });

    it('should include tenant ID in created patient', async () => {
      mockPrisma.patient.count.mockResolvedValue(5);
      mockPrisma.patient.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      );

      const result = await service.create(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'FEMALE',
          phone: '+0987654321',
        },
        'tenant-123',
      ) as { tenantId: string; patientNo: string };

      expect(result.tenantId).toBe('tenant-123');
      expect(result.patientNo).toContain('00006');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('should return patient when found', async () => {
      const mockPatient = {
        id: 'patient-1',
        tenantId: 'tenant-1',
        firstName: 'John',
        lastName: 'Doe',
        allergies: [],
        medications: [],
        visits: [],
        nextOfKin: [],
        medicalHistories: [],
      };
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const result = await service.findOne('patient-1', 'tenant-1');
      expect(result).toEqual(mockPatient);
    });
  });

  describe('addNextOfKin', () => {
    it('should create next of kin record', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.patientNextOfKin.create.mockResolvedValue({ id: 'kin-1' });

      await service.addNextOfKin(
        'patient-1',
        'tenant-1',
        { firstName: 'Jane', lastName: 'Doe', relationship: 'SPOUSE', phone: '+1234567890' },
      );

      expect(mockPrisma.patientNextOfKin.create).toHaveBeenCalled();
    });
  });

  describe('addMedicalHistory', () => {
    it('should create medical history record', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.medicalHistory.create.mockResolvedValue({ id: 'history-1' });

      await service.addMedicalHistory(
        'patient-1',
        'tenant-1',
        { condition: 'Hypertension', isChronic: true },
      );

      expect(mockPrisma.medicalHistory.create).toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    it('should return combined and sorted timeline', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      const date1 = new Date('2024-01-10');
      const date2 = new Date('2024-01-08');
      const date3 = new Date('2024-01-06');

      mockPrisma.visit.findMany.mockResolvedValue([
        { id: 'v1', createdAt: date1, visitType: 'OUTPATIENT', status: 'COMPLETED', chiefComplaint: 'Headache' },
      ]);
      mockPrisma.labOrder.findMany.mockResolvedValue([
        { id: 'l1', createdAt: date2, status: 'COMPLETED' },
      ]);
      mockPrisma.prescription.findMany.mockResolvedValue([
        { id: 'p1', createdAt: date3, status: 'DISPENSED' },
      ]);

      const timeline = await service.getTimeline('patient-1', 'tenant-1');
      expect(timeline).toHaveLength(3);
      expect(timeline[0].id).toBe('v1'); // most recent first
      expect(timeline[0]).toHaveProperty('type', 'VISIT');
    });
  });
});
