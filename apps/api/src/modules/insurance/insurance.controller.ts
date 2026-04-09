import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('policies')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'List insurance policies' })
  findAllPolicies(@Request() req: any) {
    return this.insuranceService.findAllPolicies(req.user.tenantId);
  }

  @Post('policies')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Create insurance policy' })
  createPolicy(@Request() req: any, @Body() body: any) {
    return this.insuranceService.createPolicy(body, req.user.tenantId);
  }

  @Get('claims')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'List insurance claims' })
  findAllClaims(@Request() req: any) {
    return this.insuranceService.findAllClaims(req.user.tenantId);
  }

  @Post('claims')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Submit insurance claim' })
  submitClaim(@Request() req: any, @Body() body: any) {
    return this.insuranceService.submitClaim(body, req.user.tenantId);
  }

  @Patch('claims/:id')
  @Roles(Role.BILLING_OFFICER, Role.HOSPITAL_ADMIN, Role.INSURANCE_PROVIDER)
  @ApiOperation({ summary: 'Update claim status' })
  updateClaim(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.insuranceService.updateClaim(id, req.user.tenantId, body);
  }
}
