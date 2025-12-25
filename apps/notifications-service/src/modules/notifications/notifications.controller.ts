import { Controller, Post, Get, Param, Body, Query, Delete, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SendNotificationCommand } from '../../application/commands/send-notification.command';
import { CancelNotificationCommand } from '../../application/commands/cancel-notification.command';
import { GetNotificationQuery } from '../../application/queries/get-notification.query';
import { ListNotificationsQuery } from '../../application/queries/list-notifications.query';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { InternalServiceGuard } from '../auth/internal-service.guard';

@Controller('notifications')
@UseGuards(InternalServiceGuard)
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async send(@Body() dto: SendNotificationDto): Promise<NotificationResponseDto> {
    const command = new SendNotificationCommand(
      dto.projectId,
      dto.channel,
      dto.payload,
      dto.tenantId,
      dto.userId,
      dto.templateName,
      dto.templateVariables,
      dto.priority,
      dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      dto.tags,
    );

    const notification = await this.commandBus.execute(command);
    return NotificationResponseDto.fromDomain(notification);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<NotificationResponseDto> {
    const query = new GetNotificationQuery(id);
    const notification = await this.queryBus.execute(query);
    return NotificationResponseDto.fromDomain(notification);
  }

  @Get()
  async list(@Query() dto: ListNotificationsDto): Promise<NotificationResponseDto[]> {
    const query = new ListNotificationsQuery(
      dto.projectId,
      dto.tenantId,
      dto.userId,
      dto.status,
      dto.channel,
      dto.createdAfter ? new Date(dto.createdAfter) : undefined,
      dto.createdBefore ? new Date(dto.createdBefore) : undefined,
      dto.limit,
      dto.offset,
    );

    const notifications = await this.queryBus.execute(query);
    return notifications.map((n) => NotificationResponseDto.fromDomain(n));
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Body('reason') reason?: string): Promise<void> {
    const command = new CancelNotificationCommand(id, reason);
    await this.commandBus.execute(command);
  }
}
