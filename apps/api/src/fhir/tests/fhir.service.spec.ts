import { Test, TestingModule } from '@nestjs/testing';
import { FhirService } from '../fhir.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  patient: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  visit: {
    findMany: jest.fn(),
  },
  vitalSigns: {
    findMany: jest.fn(),
  },
};

const samplePatient = {
  id: 'patient-1',
  patientNo: 'PT-20240101-00001',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'MALE',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St',
};

describe('FhirService', () => {
  let service: FhirService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FhirService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FhirService>(FhirService);
    jest.clearAllMocks();
  });

  describe('getCapabilityStatement', () => {
    it('should return a valid FHIR R4 capability statement', () => {
      const result = service.getCapabilityStatement();
      expect(result.resourceType).toBe('CapabilityStatement');
      expect(result.fhirVersion).toBe('4.0.1');
      expect(result.format).toContain('json');
    });

    it('should include Patient, Encounter, and Observation resources', () => {
      const result = service.getCapabilityStatement();
      const resourceTypes = result.rest[0].resource.map((r) => r.type);
      expect(resourceTypes).toContain('Patient');
      expect(resourceTypes).toContain('Encounter');
      expect(resourceTypes).toContain('Observation');
    });
  });

  describe('getPatients', () => {
    it('should return a FHIR Bundle with Patient resources', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([samplePatient]);

      const bundle = await service.getPatients('tenant-1');

      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('searchset');
      expect(bundle.total).toBe(1);
      expect(bundle.entry[0].resource.resourceType).toBe('Patient');
    });

    it('should map patient gender to FHIR format', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([samplePatient]);

      const bundle = await service.getPatients('tenant-1');
      expect(bundle.entry[0].resource.gender).toBe('male');
    });

    it('should map birthDate to ISO date string', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([samplePatient]);

      const bundle = await service.getPatients('tenant-1');
      expect(bundle.entry[0].resource.birthDate).toBe('1990-01-15');
    });
  });

  describe('getPatient', () => {
    it('should return null if patient not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);
      const result = await service.getPatient('nonexistent');
      expect(result).toBeNull();
    });

    it('should return a FHIR Patient resource with correct ID', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(samplePatient);
      const result = await service.getPatient('patient-1');
      expect(result).not.toBeNull();
      expect(result?.resourceType).toBe('Patient');
      expect(result?.id).toBe('patient-1');
    });
  });

  describe('getEncounters', () => {
    it('should return a FHIR Bundle of Encounter resources', async () => {
      mockPrisma.visit.findMany.mockResolvedValue([
        {
          id: 'visit-1',
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          visitType: 'OUTPATIENT',
          status: 'COMPLETED',
          chiefComplaint: 'Headache',
          createdAt: new Date('2024-01-10'),
        },
      ]);

      const bundle = await service.getEncounters('tenant-1');
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.entry[0].resource.resourceType).toBe('Encounter');
      expect(bundle.entry[0].resource.status).toBe('finished');
    });
  });

  describe('getObservations', () => {
    it('should expand vitals into multiple FHIR Observation resources', async () => {
      mockPrisma.vitalSigns.findMany.mockResolvedValue([
        {
          id: 'vitals-1',
          visitId: 'visit-1',
          temperature: 37.0,
          heartRate: 72,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          oxygenSaturation: 98,
          weight: 70,
          height: 175,
          bmi: 22.86,
          recordedAt: new Date(),
        },
      ]);

      const bundle = await service.getObservations('tenant-1');
      expect(bundle.resourceType).toBe('Bundle');
      // Temperature + heart rate + BP + SpO2 + weight + BMI = 6 observations
      expect(bundle.total).toBeGreaterThanOrEqual(6);
    });
  });
});
