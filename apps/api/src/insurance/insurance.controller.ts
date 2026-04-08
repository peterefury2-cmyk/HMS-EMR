import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('policies')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'List insurance policies' })
  findAllPolicies(@Request() req) {
    return this.insuranceService.findAllPolicies(req.user.tenantId);
  }

  @Post('policies')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create insurance policy' })
  createPolicy(@Request() req, @Body() body: any) {
    return this.insuranceService.createPolicy(body, req.user.tenantId);
  }

  @Get('claims')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'List insurance claims' })
  findAllClaims(@Request() req) {
    return this.insuranceService.findAllClaims(req.user.tenantId);
  }

  @Post('claims')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Submit insurance claim' })
  submitClaim(@Request() req, @Body() body: any) {
    return this.insuranceService.submitClaim(body, req.user.tenantId);
  }

  @Patch('claims/:id')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'Update claim status' })
  updateClaim(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.insuranceService.updateClaim(id, req.user.tenantId, body);
  }
}
