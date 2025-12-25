import { Template } from '../entities/template.entity';
import { NotificationChannel } from '../value-objects';

export interface TemplateFilters {
  name?: string;
  channel?: NotificationChannel;
  active?: boolean;
}

export abstract class TemplateRepository {
  abstract create(template: Template): Promise<Template>;
  abstract findById(id: string): Promise<Template | null>;
  abstract findByName(name: string): Promise<Template | null>;
  abstract findMany(filters: TemplateFilters): Promise<Template[]>;
  abstract update(template: Template): Promise<Template>;
  abstract delete(id: string): Promise<void>;
}
