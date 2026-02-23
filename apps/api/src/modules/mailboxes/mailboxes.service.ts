import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../common/db/database.service';
import { UserContext } from '../../common/auth/user-context';
import { GmailProviderClient } from './providers/gmail.provider';
import { OutlookProviderClient } from './providers/outlook.provider';

interface OauthStatePayload {
  nonce: string;
  teamId: string;
  userId: string;
  provider: 'gmail' | 'outlook';
  issued_at: number;
  app_redirect_uri?: string | undefined;
}

interface OauthStartOptions {
  app_redirect_uri?: string | undefined;
  login_hint?: string | undefined;
}

interface OauthCallbackParams {
  code?: string | undefined;
  state?: string | undefined;
  email_address?: string | undefined;
  mailbox_type?: string | undefined;
  delegated_from?: string | undefined;
}

@Injectable()
export class MailboxesService {
  private readonly queue: Queue;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly gmailProviderClient: GmailProviderClient,
    private readonly outlookProviderClient: OutlookProviderClient
  ) {
    this.queue = new Queue('mail-sync', {
      connection: {
        url: this.configService.getOrThrow<string>('REDIS_URL')
      }
    });
  }

  async list(user: UserContext): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query(
        `SELECT id, user_id, provider, email_address, mailbox_type, delegated_from, status, created_at, updated_at
         FROM "MailboxConnection"
         ORDER BY created_at DESC`
      );
      return result.rows;
    });
  }

  createOauthStartUrl(
    provider: 'gmail' | 'outlook',
    user: UserContext,
    options?: OauthStartOptions
  ): { url: string; state: string } {
    const state = this.encodeOauthState({
      nonce: uuidv4(),
      teamId: user.teamId,
      userId: user.userId,
      provider,
      issued_at: Date.now(),
      app_redirect_uri: options?.app_redirect_uri
    });

    const url =
      provider === 'gmail'
        ? this.gmailProviderClient.createOauthUrl(state, { loginHint: options?.login_hint })
        : this.outlookProviderClient.createOauthUrl(state, { loginHint: options?.login_hint });

    return { url, state };
  }

  async oauthCallback(
    provider: 'gmail' | 'outlook',
    query: OauthCallbackParams
  ): Promise<{ connected: true; mailbox_connection_id: string; redirect_url?: string | undefined }> {
    if (!query.state || !query.code) {
      throw new NotFoundException('OAuth callback missing state/code');
    }

    const decoded = this.decodeOauthState(query.state, provider);
    const providerEmail =
      provider === 'gmail'
        ? await this.gmailProviderClient.exchangeCodeForEmail(query.code)
        : await this.outlookProviderClient.exchangeCodeForEmail(query.code);

    const emailAddress = (query.email_address ?? providerEmail).toLowerCase();
    const mailboxType = this.validateMailboxType(query.mailbox_type);
    const delegatedFrom = query.delegated_from ?? null;

    let mailboxConnectionId = uuidv4();
    await this.databaseService.withSystemTransaction(async (client) => {
      const userResult = await client.query(
        `SELECT id
         FROM "User"
         WHERE id = $1
           AND team_id = $2
         LIMIT 1`,
        [decoded.userId, decoded.teamId]
      );

      if (!userResult.rowCount || !userResult.rows[0]) {
        throw new NotFoundException('User for OAuth state no longer exists');
      }

      const connectionResult = await client.query(
        `INSERT INTO "MailboxConnection" (
          id,
          user_id,
          provider,
          email_address,
          mailbox_type,
          delegated_from,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', now(), now())
        ON CONFLICT (user_id, provider, email_address, mailbox_type, delegated_from)
        DO UPDATE SET status = 'active', updated_at = now()
        RETURNING id`,
        [mailboxConnectionId, decoded.userId, provider, emailAddress, mailboxType, delegatedFrom]
      );

      mailboxConnectionId = connectionResult.rows[0].id as string;
    });

    const result: { connected: true; mailbox_connection_id: string; redirect_url?: string | undefined } = {
      connected: true,
      mailbox_connection_id: mailboxConnectionId
    };

    if (decoded.app_redirect_uri) {
      result.redirect_url = this.buildAppRedirect(decoded.app_redirect_uri, provider, mailboxConnectionId);
    }

    return result;
  }

  async enqueueBackfill(user: UserContext, mailboxId: string): Promise<{ queued: true; mailbox_id: string }> {
    let provider: 'gmail' | 'outlook' = 'gmail';

    await this.databaseService.withUserTransaction(user, async (client) => {
      const check = await client.query(
        'SELECT id, provider FROM "MailboxConnection" WHERE id = $1 LIMIT 1',
        [mailboxId]
      );
      if (!check.rowCount || !check.rows[0]) {
        throw new NotFoundException('Mailbox not found');
      }
      provider = check.rows[0].provider;
    });

    if (provider === 'gmail') {
      await this.gmailProviderClient.backfill(mailboxId);
    } else {
      await this.outlookProviderClient.backfill(mailboxId);
    }

    await this.queue.add(
      'mailbox-backfill',
      {
        mailboxId,
        initiatedBy: user.userId,
        teamId: user.teamId
      },
      {
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );

    return { queued: true, mailbox_id: mailboxId };
  }

  private encodeOauthState(payload: OauthStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getStateSecret()).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private decodeOauthState(state: string, provider: 'gmail' | 'outlook'): OauthStatePayload {
    const [payloadPart, signaturePart] = state.split('.', 2);
    if (!payloadPart || !signaturePart) {
      throw new NotFoundException('Invalid OAuth state');
    }

    const expectedSignature = createHmac('sha256', this.getStateSecret()).update(payloadPart).digest();
    let providedSignature: Buffer;
    try {
      providedSignature = Buffer.from(signaturePart, 'base64url');
    } catch (_error) {
      throw new NotFoundException('Invalid OAuth state');
    }

    if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
      throw new NotFoundException('Invalid OAuth state signature');
    }

    let decoded: OauthStatePayload;
    try {
      decoded = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as OauthStatePayload;
    } catch (_error) {
      throw new NotFoundException('Invalid OAuth state payload');
    }

    if (decoded.provider !== provider) {
      throw new NotFoundException('OAuth provider mismatch');
    }

    const ageMs = Date.now() - decoded.issued_at;
    if (ageMs < 0 || ageMs > 1000 * 60 * 15) {
      throw new NotFoundException('OAuth state expired');
    }

    return decoded;
  }

  private getStateSecret(): string {
    const explicitSecret = this.configService.get<string>('OAUTH_STATE_SECRET');
    if (explicitSecret) {
      return explicitSecret;
    }

    const fallbackSecret = this.configService.get<string>('WEBHOOK_SHARED_SECRET');
    if (fallbackSecret) {
      return fallbackSecret;
    }

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('OAUTH_STATE_SECRET (or WEBHOOK_SHARED_SECRET) is required in production');
    }

    return 'dev-insecure-oauth-state-secret';
  }

  private validateMailboxType(mailboxType: string | undefined): 'primary' | 'shared' | 'delegated' {
    if (!mailboxType || mailboxType === 'primary') {
      return 'primary';
    }
    if (mailboxType === 'shared') {
      return 'shared';
    }
    if (mailboxType === 'delegated') {
      return 'delegated';
    }
    throw new NotFoundException('Invalid mailbox_type');
  }

  private buildAppRedirect(baseUri: string, provider: 'gmail' | 'outlook', mailboxConnectionId: string): string {
    const url = new URL(baseUri);
    url.searchParams.set('connected', 'true');
    url.searchParams.set('provider', provider);
    url.searchParams.set('mailbox_connection_id', mailboxConnectionId);
    return url.toString();
  }
}
