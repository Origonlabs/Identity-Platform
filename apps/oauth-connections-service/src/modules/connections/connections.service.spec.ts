import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsService } from './connections.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { ConnectionStatus } from '../../../node_modules/.prisma/oauth-connections-client';

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let prisma: PrismaService;
  let metrics: MetricsService;

  const mockPrismaService = {
    oAuthConnection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  const mockMetricsService = {
    recordConnectionLinked: jest.fn(),
    recordConnectionRefreshed: jest.fn(),
    recordConnectionRevoked: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
    prisma = module.get<PrismaService>(PrismaService);
    metrics = module.get<MetricsService>(MetricsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('link', () => {
    it('should create a new OAuth connection', async () => {
      const dto = {
        providerId: 'google',
        projectId: 'proj_123',
        userId: 'user_123',
        scope: ['openid', 'profile', 'email'],
        tokenSet: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer',
          issuedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2024-01-15T11:30:00Z',
        },
      };

      const mockCreated = {
        id: 'conn_123',
        providerId: dto.providerId,
        projectId: dto.projectId,
        tenantId: null,
        userId: dto.userId,
        scope: dto.scope,
        status: ConnectionStatus.active,
        expiresAt: null,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        tokenSet: {
          id: 'token_123',
          accessToken: dto.tokenSet.accessToken,
          refreshToken: dto.tokenSet.refreshToken,
          expiresIn: dto.tokenSet.expiresIn,
          tokenType: dto.tokenSet.tokenType,
          issuedAt: new Date(dto.tokenSet.issuedAt),
          expiresAt: new Date(dto.tokenSet.expiresAt!),
          idToken: null,
          connectionId: 'conn_123',
        },
      };

      mockPrismaService.oAuthConnection.create.mockResolvedValue(mockCreated);
      mockPrismaService.outboxEvent.create.mockResolvedValue({});

      const result = await service.link(dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('conn_123');
      expect(result.providerId).toBe(dto.providerId);
      expect(result.status).toBe('active');
      expect(result.tokenSet).toBeDefined();
      expect(result.tokenSet?.accessToken).toBe(dto.tokenSet.accessToken);

      expect(mockPrismaService.oAuthConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerId: dto.providerId,
            projectId: dto.projectId,
            userId: dto.userId,
            scope: dto.scope,
          }),
        })
      );

      expect(mockPrismaService.outboxEvent.create).toHaveBeenCalled();
      expect(mockMetricsService.recordConnectionLinked).toHaveBeenCalledWith(
        dto.providerId
      );
    });
  });

  describe('list', () => {
    it('should return all connections', async () => {
      const mockConnections = [
        {
          id: 'conn_1',
          providerId: 'google',
          projectId: 'proj_123',
          tenantId: null,
          userId: 'user_123',
          scope: ['openid'],
          status: ConnectionStatus.active,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          tokenSet: {
            id: 'token_1',
            accessToken: 'access_1',
            refreshToken: 'refresh_1',
            expiresIn: 3600,
            tokenType: 'Bearer',
            issuedAt: new Date(),
            expiresAt: new Date(),
            idToken: null,
            connectionId: 'conn_1',
          },
        },
      ];

      mockPrismaService.oAuthConnection.findMany.mockResolvedValue(
        mockConnections
      );

      const result = await service.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conn_1');
      expect(result[0].providerId).toBe('google');
      expect(mockPrismaService.oAuthConnection.findMany).toHaveBeenCalledWith({
        include: { tokenSet: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getById', () => {
    it('should return a connection by ID', async () => {
      const mockConnection = {
        id: 'conn_123',
        providerId: 'google',
        projectId: 'proj_123',
        tenantId: null,
        userId: 'user_123',
        scope: ['openid'],
        status: ConnectionStatus.active,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenSet: {
          id: 'token_123',
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer',
          issuedAt: new Date(),
          expiresAt: new Date(),
          idToken: null,
          connectionId: 'conn_123',
        },
      };

      mockPrismaService.oAuthConnection.findUnique.mockResolvedValue(
        mockConnection
      );

      const result = await service.getById('conn_123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('conn_123');
      expect(mockPrismaService.oAuthConnection.findUnique).toHaveBeenCalledWith(
        {
          where: { id: 'conn_123' },
          include: { tokenSet: true },
        }
      );
    });

    it('should return null if connection not found', async () => {
      mockPrismaService.oAuthConnection.findUnique.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateTokens', () => {
    it('should update connection tokens', async () => {
      const newTokens = {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
        issuedAt: '2024-01-15T11:30:00Z',
        expiresAt: '2024-01-15T12:30:00Z',
      };

      const mockUpdated = {
        id: 'conn_123',
        providerId: 'google',
        projectId: 'proj_123',
        tenantId: null,
        userId: 'user_123',
        scope: ['openid'],
        status: ConnectionStatus.active,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenSet: {
          id: 'token_123',
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
          tokenType: newTokens.tokenType,
          issuedAt: new Date(newTokens.issuedAt),
          expiresAt: new Date(newTokens.expiresAt!),
          idToken: null,
          connectionId: 'conn_123',
        },
      };

      mockPrismaService.oAuthConnection.update.mockResolvedValue(mockUpdated);
      mockPrismaService.outboxEvent.create.mockResolvedValue({});

      const result = await service.updateTokens('conn_123', newTokens);

      expect(result).toBeDefined();
      expect(result.tokenSet?.accessToken).toBe(newTokens.accessToken);
      expect(mockPrismaService.oAuthConnection.update).toHaveBeenCalled();
      expect(mockPrismaService.outboxEvent.create).toHaveBeenCalled();
      expect(mockMetricsService.recordConnectionRefreshed).toHaveBeenCalledWith(
        'google'
      );
    });
  });

  describe('revoke', () => {
    it('should revoke a connection', async () => {
      const mockRevoked = {
        id: 'conn_123',
        providerId: 'google',
        projectId: 'proj_123',
        tenantId: null,
        userId: 'user_123',
        scope: ['openid'],
        status: ConnectionStatus.revoked,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenSet: {
          id: 'token_123',
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer',
          issuedAt: new Date(),
          expiresAt: new Date(),
          idToken: null,
          connectionId: 'conn_123',
        },
      };

      mockPrismaService.oAuthConnection.update.mockResolvedValue(mockRevoked);
      mockPrismaService.outboxEvent.create.mockResolvedValue({});

      const result = await service.revoke('conn_123');

      expect(result).toBeDefined();
      expect(result.status).toBe('revoked');
      expect(mockPrismaService.oAuthConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn_123' },
        data: {
          status: ConnectionStatus.revoked,
          updatedAt: expect.any(Date),
        },
        include: { tokenSet: true },
      });
      expect(mockMetricsService.recordConnectionRevoked).toHaveBeenCalledWith(
        'google',
        'user_request'
      );
    });
  });

  describe('delete', () => {
    it('should delete a connection', async () => {
      mockPrismaService.oAuthConnection.delete.mockResolvedValue({});

      await service.delete('conn_123');

      expect(mockPrismaService.oAuthConnection.delete).toHaveBeenCalledWith({
        where: { id: 'conn_123' },
      });
    });
  });
});
