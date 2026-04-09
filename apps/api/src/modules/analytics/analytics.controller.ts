import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('revenue')
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.BILLING_OFFICER)
  @ApiOperation({ summary: 'Get revenue statistics' })
  getRevenueStats() {
    return this.analyticsService.getRevenueStats();
  }

  @Get('patient-trends')
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get patient trends' })
  getPatientTrends() {
    return this.analyticsService.getPatientTrends();
  }
}
