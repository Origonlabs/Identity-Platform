import { NotificationStatus } from '../../domain/value-objects';

export class ListNotificationsQuery {
  constructor(
    public readonly projectId?: string,
    public readonly tenantId?: string,
    public readonly userId?: string,
    public readonly status?: NotificationStatus[],
    public readonly channel?: string[],
    public readonly createdAfter?: Date,
    public readonly createdBefore?: Date,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
