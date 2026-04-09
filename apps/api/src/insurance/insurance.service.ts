import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async findAllPolicies(tenantId: string) {
    return this.prisma.insurancePolicy.findMany({
      where: { tenantId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createPolicy(data: any, tenantId: string) {
    return this.prisma.insurancePolicy.create({ data: { ...data, tenantId } });
  }

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

  async submitClaim(data: any, tenantId: string) {
    const count = await this.prisma.insuranceClaim.count({ where: { tenantId } });
    const claimNo = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.insuranceClaim.create({
      data: { ...data, tenantId, claimNo },
      include: { policy: true, invoice: true },
    });
  }

  async updateClaim(id: string, tenantId: string, data: any) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);
    return this.prisma.insuranceClaim.update({ where: { id }, data });
  }
}
