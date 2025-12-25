import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { OAuthModule } from '../oauth/oauth.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [OAuthModule, ProvidersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
