import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all subscriptions' })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create subscription' })
  create(@Body() body: any) {
    return this.subscriptionsService.create(body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my tenant subscription' })
  findMine(@Request() req) {
    return this.subscriptionsService.findByTenant(req.user.tenantId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get subscription by ID' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update subscription' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.subscriptionsService.update(id, body);
  }

  @Post('upgrade')
  @Roles(Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Upgrade tenant plan' })
  upgrade(@Request() req, @Body() body: { plan: string }) {
    return this.subscriptionsService.upgradePlan(req.user.tenantId, body.plan);
  }
}
