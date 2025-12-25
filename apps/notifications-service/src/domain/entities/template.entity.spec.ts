import { Template } from './template.entity';
import { NotificationChannel } from '../value-objects';

describe('Template Entity', () => {
  describe('render', () => {
    it('should interpolate variables in template', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'welcome-email',
        channel: NotificationChannel.Email,
        content: {
          subject: 'Welcome {{name}}!',
          body: 'Hello {{name}}, welcome to {{companyName}}!',
        },
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'companyName', type: 'string', required: true },
        ],
      });

      const result = template.render({
        name: 'John',
        companyName: 'Acme Inc',
      });

      expect(result.subject).toBe('Welcome John!');
      expect(result.body).toBe('Hello John, welcome to Acme Inc!');
    });

    it('should use default values for missing variables', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'test-template',
        channel: NotificationChannel.Email,
        content: {
          body: 'Hello {{name}}, your status is {{status}}',
        },
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'status', type: 'string', required: false, defaultValue: 'active' },
        ],
      });

      const result = template.render({ name: 'John' });

      expect(result.body).toBe('Hello John, your status is active');
    });

    it('should throw error for missing required variables', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'test-template',
        channel: NotificationChannel.Email,
        content: {
          body: 'Hello {{name}}',
        },
        variables: [
          { name: 'name', type: 'string', required: true },
        ],
      });

      expect(() => template.render({})).toThrow("Required variable 'name' is missing");
    });

    it('should handle HTML body templates', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'html-email',
        channel: NotificationChannel.Email,
        content: {
          subject: 'Test',
          body: 'Plain text',
          htmlBody: '<p>Hello <strong>{{name}}</strong></p>',
        },
        variables: [
          { name: 'name', type: 'string', required: true },
        ],
      });

      const result = template.render({ name: 'John' });

      expect(result.htmlBody).toBe('<p>Hello <strong>John</strong></p>');
    });
  });

  describe('activate/deactivate', () => {
    it('should activate template', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'test',
        channel: NotificationChannel.Email,
        content: { body: 'test' },
        active: false,
      });

      template.activate();

      expect(template.active).toBe(true);
    });

    it('should deactivate template', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'test',
        channel: NotificationChannel.Email,
        content: { body: 'test' },
        active: true,
      });

      template.deactivate();

      expect(template.active).toBe(false);
    });
  });

  describe('createNewVersion', () => {
    it('should create a new version with incremented version number', () => {
      const template = new Template({
        id: 'tmpl_123',
        name: 'test',
        channel: NotificationChannel.Email,
        content: { body: 'version 1' },
        version: 1,
      });

      const newVersion = template.createNewVersion({ body: 'version 2' });

      expect(newVersion.version).toBe(2);
      expect(newVersion.content.body).toBe('version 2');
      expect(newVersion.id).toBe(template.id);
      expect(newVersion.name).toBe(template.name);
    });
  });
});
