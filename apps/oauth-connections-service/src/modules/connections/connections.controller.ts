import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OAuthConnection, TokenSet } from '@opendex/contracts';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { ConnectionsService } from './connections.service';

@ApiTags('oauth-connections')
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post()
  async link(@Body() dto: CreateConnectionDto): Promise<OAuthConnection & { tokenSet: TokenSet }> {
    return this.connections.link(dto);
  }

  @Get()
  async list(): Promise<Array<OAuthConnection & { tokenSet?: TokenSet }>> {
    return this.connections.list();
  }
}
