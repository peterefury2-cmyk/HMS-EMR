import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

interface RequestUser {
  tenantId: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE, Role.BILLING_OFFICER)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.analyticsService.getDashboardStats(tenantId);
  }

  @Get('revenue')
  @Roles(Role.HOSPITAL_ADMIN, Role.BILLING_OFFICER)
  @ApiOperation({ summary: 'Get revenue analytics' })
  getRevenueAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<unknown> {
    return this.analyticsService.getRevenueAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('patients')
  @Roles(Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get patient analytics' })
  getPatientAnalytics(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.analyticsService.getPatientAnalytics(tenantId);
  }

  @Get('diseases')
  @Roles(Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get disease analytics by ICD code' })
  getDiseaseAnalytics(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.analyticsService.getDiseaseAnalytics(tenantId);
  }
}
