import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Send a notification' })
  send(@Body() payload: NotificationPayload) {
    return this.notificationsService.sendNotification(payload);
  }

  @Post('email')
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Send an email notification' })
  sendEmail(@Body() body: { to: string; subject: string; message: string; tenantId?: string }) {
    return this.notificationsService.sendEmail(body.to, body.subject, body.message, body.tenantId);
  }
}
