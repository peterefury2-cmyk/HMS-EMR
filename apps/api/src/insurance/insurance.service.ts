import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InsuranceProvider,
  InsurancePolicy,
  InsuranceClaim,
  PreAuthorization,
  PreAuthStatus,
  InsurancePolicyStatus,
  InsuranceClaimStatus,
  Prisma,
} from '@prisma/client';
import { CreateInsuranceProviderDto } from './dto/create-insurance-provider.dto';
import { CreatePreAuthorizationDto } from './dto/create-pre-authorization.dto';

interface SubmitClaimDto {
  invoiceId: string;
  policyId: string;
  amount: number;
}

interface UpdateClaimDto {
  status?: InsuranceClaimStatus;
  approvedAmount?: number;
  rejectionReason?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  reason: string;
  policy?: InsurancePolicy;
}

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async createProvider(
    dto: CreateInsuranceProviderDto,
    tenantId: string,
  ): Promise<InsuranceProvider> {
    return this.prisma.insuranceProvider.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
      },
    });
  }

  async findAllProviders(tenantId: string): Promise<InsuranceProvider[]> {
    return this.prisma.insuranceProvider.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async requestPreAuthorization(
    dto: CreatePreAuthorizationDto,
    tenantId: string,
  ): Promise<PreAuthorization> {
    return this.prisma.preAuthorization.create({
      data: {
        tenantId,
        policyId: dto.policyId,
        providerId: dto.providerId,
        procedure: dto.procedure,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        notes: dto.notes,
        status: PreAuthStatus.REQUESTED,
      },
      include: { policy: true, provider: true },
    });
  }

  async updatePreAuthStatus(
    id: string,
    status: PreAuthStatus,
    authCode?: string,
    tenantId?: string,
  ): Promise<PreAuthorization> {
    const preAuth = tenantId
      ? await this.prisma.preAuthorization.findFirst({ where: { id, tenantId } })
      : await this.prisma.preAuthorization.findUnique({ where: { id } });

    if (!preAuth) throw new NotFoundException(`Pre-authorization ${id} not found`);

    return this.prisma.preAuthorization.update({
      where: { id },
      data: {
        status,
        authCode: authCode ?? preAuth.authCode,
        respondedAt: new Date(),
        ...(status === PreAuthStatus.APPROVED && {
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      },
    });
  }

  async checkPolicyEligibility(
    policyId: string,
    tenantId: string,
  ): Promise<EligibilityResult> {
    const policy = await this.prisma.insurancePolicy.findFirst({
      where: { id: policyId, tenantId },
      include: { provider: true },
    });

    if (!policy) {
      return { isEligible: false, reason: 'Policy not found' };
    }

    if (policy.status !== InsurancePolicyStatus.ACTIVE) {
      return { isEligible: false, reason: `Policy status is ${policy.status}`, policy };
    }

    const now = new Date();
    if (policy.endDate < now) {
      return { isEligible: false, reason: 'Policy has expired', policy };
    }

    if (policy.startDate > now) {
      return { isEligible: false, reason: 'Policy has not yet started', policy };
    }

    return { isEligible: true, reason: 'Policy is active and valid', policy };
  }

  async findAllPolicies(tenantId: string): Promise<InsurancePolicy[]> {
    return this.prisma.insurancePolicy.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: true,
      },
    });
  }

  async createPolicy(
    data: Prisma.InsurancePolicyCreateInput,
    tenantId: string,
  ): Promise<InsurancePolicy> {
    return this.prisma.insurancePolicy.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async findAllClaims(tenantId: string): Promise<InsuranceClaim[]> {
    return this.prisma.insuranceClaim.findMany({
      where: { tenantId },
      include: {
        invoice: true,
        policy: {
          include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async submitClaim(dto: SubmitClaimDto, tenantId: string): Promise<InsuranceClaim> {
    const count = await this.prisma.insuranceClaim.count({ where: { tenantId } });
    const claimNo = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.insuranceClaim.create({
      data: {
        tenantId,
        invoiceId: dto.invoiceId,
        policyId: dto.policyId,
        claimNo,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
      },
      include: { policy: true, invoice: true },
    });
  }

  async updateClaim(
    id: string,
    tenantId: string,
    dto: UpdateClaimDto,
  ): Promise<InsuranceClaim> {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);

    if (dto.status && !Object.values(InsuranceClaimStatus).includes(dto.status)) {
      throw new BadRequestException(`Invalid claim status: ${dto.status}`);
    }

    return this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.approvedAmount !== undefined && {
          approvedAmount: new Prisma.Decimal(dto.approvedAmount.toFixed(2)),
          approvedAt: new Date(),
        }),
        ...(dto.rejectionReason !== undefined && { rejectionReason: dto.rejectionReason }),
      },
    });
  }
}
