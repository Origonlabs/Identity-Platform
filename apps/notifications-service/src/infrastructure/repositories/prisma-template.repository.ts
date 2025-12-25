import { Injectable } from '@nestjs/common';
import { TemplateRepository, TemplateFilters } from '../../domain/ports/template.repository';
import { Template } from '../../domain/entities/template.entity';
import { NotificationChannel } from '../../domain/value-objects';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaTemplateRepository extends TemplateRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(template: Template): Promise<Template> {
    const created = await this.prisma.template.create({
      data: {
        id: template.id,
        name: template.name,
        channel: template.channel,
        content: template.content as any,
        variables: template.variables as any,
        active: template.active,
        version: template.version,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Template | null> {
    const record = await this.prisma.template.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByName(name: string): Promise<Template | null> {
    const record = await this.prisma.template.findFirst({
      where: { name },
      orderBy: { version: 'desc' },
    });

    return record ? this.toDomain(record) : null;
  }

  async findMany(filters: TemplateFilters): Promise<Template[]> {
    const records = await this.prisma.template.findMany({
      where: {
        ...(filters.name && { name: filters.name }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.active !== undefined && { active: filters.active }),
      },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });

    return records.map((record) => this.toDomain(record));
  }

  async update(template: Template): Promise<Template> {
    const updated = await this.prisma.template.update({
      where: { id: template.id },
      data: {
        content: template.content as any,
        variables: template.variables as any,
        active: template.active,
        version: template.version,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.template.delete({
      where: { id },
    });
  }

  private toDomain(record: any): Template {
    return new Template({
      id: record.id,
      name: record.name,
      channel: record.channel as NotificationChannel,
      content: record.content,
      variables: record.variables || [],
      active: record.active,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
