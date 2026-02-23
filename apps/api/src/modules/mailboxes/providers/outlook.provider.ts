import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MicrosoftTokenResponse {
  access_token?: string | undefined;
}

interface MicrosoftUserResponse {
  mail?: string | undefined;
  userPrincipalName?: string | undefined;
}

interface OutlookOauthUrlOptions {
  loginHint?: string | undefined;
}

@Injectable()
export class OutlookProviderClient {
  private readonly logger = new Logger(OutlookProviderClient.name);

  constructor(private readonly configService: ConfigService) {}

  createOauthUrl(state: string, options?: OutlookOauthUrlOptions): string {
    const clientId = this.getRequiredConfig('MICROSOFT_CLIENT_ID');
    const redirectUri = this.getRequiredConfig('MICROSOFT_REDIRECT_URI');
    const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID') ?? 'common';
    const scope = [
      'openid',
      'profile',
      'offline_access',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope,
      state
    });

    if (options?.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForEmail(code: string): Promise<string> {
    const clientId = this.getRequiredConfig('MICROSOFT_CLIENT_ID');
    const clientSecret = this.getRequiredConfig('MICROSOFT_CLIENT_SECRET');
    const redirectUri = this.getRequiredConfig('MICROSOFT_REDIRECT_URI');
    const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID') ?? 'common';

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody.toString()
    });

    if (!tokenResponse.ok) {
      const details = await this.safeReadBody(tokenResponse);
      this.logger.error(`Microsoft token exchange failed (${tokenResponse.status}): ${details}`);
      throw new BadGatewayException('Microsoft OAuth token exchange failed');
    }

    const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;
    if (!tokenData.access_token) {
      throw new BadGatewayException('Microsoft OAuth token response missing access token');
    }

    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!profileResponse.ok) {
      const details = await this.safeReadBody(profileResponse);
      this.logger.error(`Microsoft profile request failed (${profileResponse.status}): ${details}`);
      throw new BadGatewayException('Microsoft OAuth user profile lookup failed');
    }

    const profile = (await profileResponse.json()) as MicrosoftUserResponse;
    const email = profile.mail ?? profile.userPrincipalName;
    if (!email) {
      throw new BadGatewayException('Microsoft OAuth profile missing mail/userPrincipalName');
    }

    return email.toLowerCase();
  }

  async syncIncremental(mailboxConnectionId: string): Promise<{ mailbox_connection_id: string; status: string }> {
    this.logger.log(`Sync incremental Outlook mailbox ${mailboxConnectionId}`);
    return { mailbox_connection_id: mailboxConnectionId, status: 'queued' };
  }

  async backfill(mailboxConnectionId: string): Promise<{ mailbox_connection_id: string; status: string }> {
    this.logger.log(`Backfill Outlook mailbox ${mailboxConnectionId}`);
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

  private getRequiredConfig(
    key: 'MICROSOFT_CLIENT_ID' | 'MICROSOFT_CLIENT_SECRET' | 'MICROSOFT_REDIRECT_URI'
  ): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`${key} is not configured`);
    }
    return value;
  }
}
