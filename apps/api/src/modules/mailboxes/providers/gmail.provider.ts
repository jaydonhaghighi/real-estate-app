import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GmailTokenResponse {
  access_token?: string | undefined;
}

interface GmailUserInfoResponse {
  email?: string | undefined;
}

interface GmailOauthUrlOptions {
  loginHint?: string | undefined;
}

@Injectable()
export class GmailProviderClient {
  private readonly logger = new Logger(GmailProviderClient.name);

  constructor(private readonly configService: ConfigService) {}

  createOauthUrl(state: string, options?: GmailOauthUrlOptions): string {
    const clientId = this.getRequiredConfig('GOOGLE_CLIENT_ID');
    const redirectUri = this.getRequiredConfig('GOOGLE_REDIRECT_URI');
    const scope = [
      'openid',
      'email',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state
    });

    if (options?.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForEmail(code: string): Promise<string> {
    const clientId = this.getRequiredConfig('GOOGLE_CLIENT_ID');
    const clientSecret = this.getRequiredConfig('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.getRequiredConfig('GOOGLE_REDIRECT_URI');

    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    if (!tokenResponse.ok) {
      const details = await this.safeReadBody(tokenResponse);
      this.logger.error(`Google token exchange failed (${tokenResponse.status}): ${details}`);
      throw new BadGatewayException('Google OAuth token exchange failed');
    }

    const tokenData = (await tokenResponse.json()) as GmailTokenResponse;
    if (!tokenData.access_token) {
      throw new BadGatewayException('Google OAuth token response missing access token');
    }

    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      const details = await this.safeReadBody(userInfoResponse);
      this.logger.error(`Google user info request failed (${userInfoResponse.status}): ${details}`);
      throw new BadGatewayException('Google OAuth user profile lookup failed');
    }

    const userInfo = (await userInfoResponse.json()) as GmailUserInfoResponse;
    if (!userInfo.email) {
      throw new BadGatewayException('Google OAuth user profile missing email');
    }

    return userInfo.email.toLowerCase();
  }

  async syncIncremental(mailboxConnectionId: string): Promise<{ mailbox_connection_id: string; status: string }> {
    this.logger.log(`Sync incremental Gmail mailbox ${mailboxConnectionId}`);
    return { mailbox_connection_id: mailboxConnectionId, status: 'queued' };
  }

  async backfill(mailboxConnectionId: string): Promise<{ mailbox_connection_id: string; status: string }> {
    this.logger.log(`Backfill Gmail mailbox ${mailboxConnectionId}`);
    return { mailbox_connection_id: mailboxConnectionId, status: 'queued' };
  }

  private async safeReadBody(response: Response): Promise<string> {
    try {
      const body = await response.text();
      return body.slice(0, 500);
    } catch (_error) {
      return 'unreadable response body';
    }
  }

  private getRequiredConfig(key: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI'): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`${key} is not configured`);
    }
    return value;
  }
}
