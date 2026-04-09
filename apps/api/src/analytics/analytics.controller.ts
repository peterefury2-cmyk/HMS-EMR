import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService, DashboardStats, RevenueAnalytics, PatientTrend, OperationalMetrics } from './analytics.service';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard') @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboard(@TenantId() tenantId: string): Promise<DashboardStats> { return this.analyticsService.getDashboardStats(tenantId); }

  @Get('revenue') @ApiOperation({ summary: 'Get revenue analytics for a date range' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' }) @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31' })
  async getRevenue(@TenantId() tenantId: string, @Query('startDate') startDateStr?: string, @Query('endDate') endDateStr?: string): Promise<RevenueAnalytics> {
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    return this.analyticsService.getRevenueAnalytics(tenantId, startDate, endDate);
  }

  @Get('patients') @ApiOperation({ summary: 'Get patient trends for last N days' }) @ApiQuery({ name: 'days', required: false, example: 30 })
  async getPatientTrends(@TenantId() tenantId: string, @Query('days') daysStr?: string): Promise<PatientTrend[]> {
    return this.analyticsService.getPatientTrends(tenantId, daysStr ? parseInt(daysStr, 10) : 30);
  }

  @Get('operational') @ApiOperation({ summary: 'Get operational metrics' })
  async getOperationalMetrics(@TenantId() tenantId: string): Promise<OperationalMetrics> { return this.analyticsService.getOperationalMetrics(tenantId); }
}
