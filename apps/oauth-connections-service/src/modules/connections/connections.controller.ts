import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OAuthConnection, TokenSet } from '@opendex/contracts';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateTokensDto } from './dto/update-tokens.dto';
import { ConnectionsService } from './connections.service';
import { InternalServiceGuard } from '../auth/internal-service.guard';

@ApiTags('oauth-connections')
@Controller('connections')
@UseGuards(InternalServiceGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Link a new OAuth connection' })
  @ApiResponse({ status: 201, description: 'Connection created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async link(@Body() dto: CreateConnectionDto): Promise<OAuthConnection & { tokenSet?: TokenSet }> {
    return this.connections.link(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all OAuth connections' })
  @ApiResponse({ status: 200, description: 'List of connections' })
  async list(): Promise<Array<OAuthConnection & { tokenSet?: TokenSet }>> {
    return this.connections.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get OAuth connection by ID' })
  @ApiResponse({ status: 200, description: 'Connection found' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async getById(@Param('id') id: string): Promise<OAuthConnection & { tokenSet?: TokenSet }> {
    const connection = await this.connections.getById(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
    return connection;
  }

  @Put(':id/tokens')
  @ApiOperation({ summary: 'Update OAuth connection tokens' })
  @ApiResponse({ status: 200, description: 'Tokens updated successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async updateTokens(
    @Param('id') id: string,
    @Body() dto: UpdateTokensDto
  ): Promise<OAuthConnection & { tokenSet?: TokenSet }> {
    return this.connections.updateTokens(id, dto);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke OAuth connection' })
  @ApiResponse({ status: 200, description: 'Connection revoked successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async revoke(@Param('id') id: string): Promise<OAuthConnection & { tokenSet?: TokenSet }> {
    return this.connections.revoke(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete OAuth connection' })
  @ApiResponse({ status: 204, description: 'Connection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.connections.delete(id);
  }
}
