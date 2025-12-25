import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationEnvelope } from '@opendex/contracts';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  async create(@Body() dto: CreateNotificationDto): Promise<NotificationEnvelope> {
    return this.notifications.enqueue(dto.request, dto.dryRun ?? false);
  }

  @Get()
  async list(): Promise<NotificationEnvelope[]> {
    return this.notifications.list();
  }
}
