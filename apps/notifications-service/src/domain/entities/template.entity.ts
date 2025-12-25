import { NotificationChannel } from '../value-objects';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface TemplateContent {
  subject?: string;
  body: string;
  htmlBody?: string;
}

export class Template {
  private _id: string;
  private _name: string;
  private _channel: NotificationChannel;
  private _content: TemplateContent;
  private _variables: TemplateVariable[];
  private _active: boolean;
  private _version: number;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: {
    id: string;
    name: string;
    channel: NotificationChannel;
    content: TemplateContent;
    variables?: TemplateVariable[];
    active?: boolean;
    version?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this._id = props.id;
    this._name = props.name;
    this._channel = props.channel;
    this._content = props.content;
    this._variables = props.variables || [];
    this._active = props.active ?? true;
    this._version = props.version || 1;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get channel(): NotificationChannel {
    return this._channel;
  }

  get content(): TemplateContent {
    return this._content;
  }

  get variables(): TemplateVariable[] {
    return this._variables;
  }

  get active(): boolean {
    return this._active;
  }

  get version(): number {
    return this._version;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  render(variables: Record<string, unknown>): TemplateContent {
    this.validateVariables(variables);

    return {
      subject: this._content.subject
        ? this.interpolate(this._content.subject, variables)
        : undefined,
      body: this.interpolate(this._content.body, variables),
      htmlBody: this._content.htmlBody
        ? this.interpolate(this._content.htmlBody, variables)
        : undefined,
    };
  }

  private validateVariables(variables: Record<string, unknown>): void {
    for (const templateVar of this._variables) {
      if (templateVar.required && !(templateVar.name in variables)) {
        throw new Error(`Required variable '${templateVar.name}' is missing`);
      }
    }
  }

  private interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      if (value === undefined || value === null) {
        const templateVar = this._variables.find((v) => v.name === varName);
        if (templateVar?.defaultValue !== undefined) {
          return String(templateVar.defaultValue);
        }
        return match;
      }
      return String(value);
    });
  }

  activate(): void {
    this._active = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._active = false;
    this._updatedAt = new Date();
  }

  createNewVersion(content: TemplateContent): Template {
    return new Template({
      id: this._id,
      name: this._name,
      channel: this._channel,
      content,
      variables: this._variables,
      active: this._active,
      version: this._version + 1,
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }
}
