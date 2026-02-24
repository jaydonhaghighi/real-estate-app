import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from 'jose';

import { DatabaseService } from '../db/database.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { RequestWithUser, UserContext } from './user-context';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
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

  private async validateJwt(token: string): Promise<UserContext> {
    if (!this.jwks) {
      throw new UnauthorizedException('JWKS not configured');
    }

    const issuer = this.configService.get<string>('JWT_ISSUER');
    const audience = this.configService.get<string>('JWT_AUDIENCE');

    const verifyOptions: { issuer?: string; audience?: string } = {};
    if (issuer) verifyOptions.issuer = issuer;
    if (audience) verifyOptions.audience = audience;

    let verified: JWTVerifyResult;
    try {
      verified = await jwtVerify(token, this.jwks, verifyOptions);
    } catch (error) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const subject = verified.payload.sub;
    if (!subject) {
      throw new UnauthorizedException('Token missing subject claim');
    }

    return this.resolveUser(subject);
  }

  private async resolveUser(clerkId: string): Promise<UserContext> {
    const existing = await this.databaseService.query<{
      id: string;
      team_id: string;
      role: 'AGENT' | 'TEAM_LEAD';
    }>(
      `SELECT id, team_id, role FROM "User" WHERE clerk_id = $1`,
      [clerkId]
    );

    if (existing.rows[0]) {
      return {
        userId: existing.rows[0].id,
        teamId: existing.rows[0].team_id,
        role: existing.rows[0].role
      };
    }

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      const linked = await this.databaseService.query<{
        id: string;
        team_id: string;
        role: 'AGENT' | 'TEAM_LEAD';
      }>(
        `UPDATE "User"
         SET clerk_id = $1
         WHERE clerk_id IS NULL AND role = 'AGENT'
         RETURNING id, team_id, role`,
        [clerkId]
      );

      if (linked.rows[0]) {
        return {
          userId: linked.rows[0].id,
          teamId: linked.rows[0].team_id,
          role: linked.rows[0].role
        };
      }
    }

    throw new UnauthorizedException(
      'No linked user account found. Ask a team admin to provision your account.'
    );
  }
}
