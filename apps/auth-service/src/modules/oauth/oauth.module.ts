import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { AuthorizeController } from './controllers/authorize.controller';
import { TokenController } from './controllers/token.controller';
import { UserInfoController } from './controllers/userinfo.controller';

// Services
import { OAuth2Service } from './services/oauth2.service';
import { TokenService } from './services/token.service';
import { PKCEService } from './services/pkce.service';

// Guards
import { OAuth2Guard } from './guards/oauth2.guard';
import { ScopeGuard } from './guards/scope.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwt.accessTokenExpiration'),
          algorithm: configService.get<string>('app.jwt.algorithm') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthorizeController,
    TokenController,
    UserInfoController,
  ],
  providers: [
    OAuth2Service,
    TokenService,
    PKCEService,
    OAuth2Guard,
    ScopeGuard,
  ],
  exports: [
    OAuth2Service,
    TokenService,
    PKCEService,
  ],
})
export class OAuthModule {}
