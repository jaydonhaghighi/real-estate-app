import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from 'jose';

import { IS_PUBLIC_KEY } from './public.decorator';
import { RequestWithUser } from './user-context';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {
    const jwksUri = this.configService.get<string>('JWT_JWKS_URI');
    if (jwksUri) {
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      RequestWithUser & { headers: Record<string, string | string[] | undefined> }
    >();

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      request.user = await this.validateJwt(authHeader.slice(7));
      return true;
    }

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      const userId = request.headers['x-user-id'];
      const teamId = request.headers['x-team-id'];
      const role = request.headers['x-role'];
      if (
        typeof userId === 'string'
        && typeof teamId === 'string'
        && (role === 'AGENT' || role === 'TEAM_LEAD')
      ) {
        request.user = { userId, teamId, role };
        return true;
      }
    }

    throw new UnauthorizedException('Authentication required');
  }

  private async validateJwt(token: string): Promise<{ userId: string; teamId: string; role: 'AGENT' | 'TEAM_LEAD' }> {
    if (!this.jwks) {
      throw new UnauthorizedException('JWKS not configured');
    }

    const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');
    const audience = this.configService.getOrThrow<string>('JWT_AUDIENCE');

    let verified: JWTVerifyResult;
    try {
      verified = await jwtVerify(token, this.jwks, { issuer, audience });
    } catch (error) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const teamId = verified.payload['team_id'];
    const roleClaim = verified.payload['role'];
    const subject = verified.payload.sub;

    let role: 'AGENT' | 'TEAM_LEAD';
    if (roleClaim === 'AGENT' || roleClaim === 'TEAM_LEAD') {
      role = roleClaim;
    } else {
      throw new UnauthorizedException('Token missing required claims');
    }

    if (!subject || typeof teamId !== 'string') {
      throw new UnauthorizedException('Token missing required claims');
    }

    return {
      userId: subject,
      teamId,
      role
    };
  }
}
