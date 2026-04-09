import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsuranceClaimStatus, PreAuthStatus } from '@prisma/client';

interface CreateProviderData {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface CreatePolicyData {
  patientId: string;
  providerId: string;
  policyNo: string;
  coverageType: string;
  startDate: Date;
  endDate: Date;
}

interface SubmitClaimData {
  invoiceId: string;
  policyId: string;
  amount: number;
  notes?: string;
}

interface CreatePreAuthData {
  policyId: string;
  visitId?: string;
  requestedAmount: number;
  reason?: string;
}

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  // Providers
  async findAllProviders(tenantId: string) {
    return this.prisma.insuranceProvider.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createProvider(data: CreateProviderData, tenantId: string) {
    return this.prisma.insuranceProvider.create({ data: { ...data, tenantId } });
  }

  async updateProvider(id: string, tenantId: string, data: Partial<CreateProviderData>) {
    const provider = await this.prisma.insuranceProvider.findFirst({ where: { id, tenantId } });
    if (!provider) throw new NotFoundException(`Insurance provider ${id} not found`);
    return this.prisma.insuranceProvider.update({ where: { id }, data });
  }

  // Policies
  async findAllPolicies(tenantId: string) {
    return this.prisma.insurancePolicy.findMany({
      where: { tenantId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createPolicy(data: CreatePolicyData, tenantId: string) {
    return this.prisma.insurancePolicy.create({
      data: {
        tenantId,
        patientId: data.patientId,
        providerId: data.providerId,
        policyNo: data.policyNo,
        coverageType: data.coverageType,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  async checkEligibility(policyId: string, tenantId: string) {
    const policy = await this.prisma.insurancePolicy.findFirst({ where: { id: policyId, tenantId } });
    if (!policy) throw new NotFoundException(`Policy ${policyId} not found`);
    const now = new Date();
    const isEligible =
      policy.status === 'ACTIVE' &&
      (!policy.endDate || policy.endDate > now) &&
      (!policy.startDate || policy.startDate <= now);
    return { eligible: isEligible, policy };
  }

  // Claims
  async findAllClaims(tenantId: string) {
    return this.prisma.insuranceClaim.findMany({
      where: { tenantId },
      include: {
        invoice: true,
        policy: { include: { patient: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async submitClaim(data: SubmitClaimData, tenantId: string) {
    const count = await this.prisma.insuranceClaim.count({ where: { tenantId } });
    const claimNo = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.insuranceClaim.create({
      data: { ...data, tenantId, claimNo },
      include: { policy: true, invoice: true },
    });
  }

  async updateClaim(id: string, tenantId: string, status: InsuranceClaimStatus) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);
    return this.prisma.insuranceClaim.update({ where: { id }, data: { status } });
  }

  // Pre-authorizations
  async requestPreAuthorization(data: CreatePreAuthData, tenantId: string) {
    return this.prisma.preAuthorization.create({
      data: { ...data, tenantId },
    });
  }

  async updatePreAuth(id: string, tenantId: string, status: PreAuthStatus, approvedAmount?: number) {
    const preAuth = await this.prisma.preAuthorization.findFirst({ where: { id, tenantId } });
    if (!preAuth) throw new NotFoundException(`Pre-authorization ${id} not found`);
    if (preAuth.status !== 'REQUESTED') {
      throw new BadRequestException('Pre-authorization has already been decided');
    }
    return this.prisma.preAuthorization.update({
      where: { id },
      data: { status, approvedAmount, decidedAt: new Date() },
    });
  }
}
