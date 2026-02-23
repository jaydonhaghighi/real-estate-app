import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PoolClient } from 'pg';
import { createHmac, timingSafeEqual } from 'crypto';

import { RawContentCryptoService } from '../../common/crypto/raw-content-crypto.service';
import { DatabaseService } from '../../common/db/database.service';
import { LeadsService } from '../leads/leads.service';

interface EmailWebhookPayload {
  provider_event_id: string;
  mailbox_connection_id?: string | undefined;
  mailbox_email?: string | undefined;
  from_email: string;
  direction: 'inbound' | 'outbound';
  subject?: string | undefined;
  body?: string | undefined;
  thread_id?: string | undefined;
  timestamp?: string | undefined;
}

interface SmsWebhookPayload {
  provider_event_id: string;
  phone_number_id?: string | undefined;
  to_number?: string | undefined;
  from_number: string;
  direction: 'inbound' | 'outbound';
  body?: string | undefined;
  timestamp?: string | undefined;
}

interface CallWebhookPayload {
  provider_event_id: string;
  phone_number_id?: string | undefined;
  to_number?: string | undefined;
  from_number: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration_seconds?: number | undefined;
  timestamp?: string | undefined;
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly leadsService: LeadsService,
    private readonly rawContentCryptoService: RawContentCryptoService
  ) {}

  async ingestEmail(payload: EmailWebhookPayload): Promise<{ accepted: boolean; deduped: boolean; lead_id?: string }> {
    return this.databaseService.withSystemTransaction(async (client) => {
      const mailbox = await this.resolveMailbox(client, payload.mailbox_connection_id, payload.mailbox_email);
      if (!mailbox) {
        return { accepted: false, deduped: false };
      }

      const lead = await this.leadsService.findOrCreateLeadByEmail(client, {
        teamId: mailbox.team_id,
        ownerAgentId: mailbox.user_id,
        email: payload.from_email.toLowerCase(),
        source: 'email'
      });

      const insertResult = await client.query(
        `INSERT INTO "ConversationEvent" (
          lead_id,
          channel,
          type,
          direction,
          mailbox_connection_id,
          provider_event_id,
          raw_body,
          meta,
          created_at
        ) VALUES (
          $1,
          'email',
          CASE WHEN $3 = 'inbound' THEN 'email_received' ELSE 'email_sent' END,
          $3,
          $2,
          $4,
          $5,
          $6::jsonb,
          COALESCE($7::timestamptz, now())
        )
        ON CONFLICT (mailbox_connection_id, provider_event_id)
        WHERE channel = 'email' AND provider_event_id IS NOT NULL
        DO NOTHING
        RETURNING id`,
        [
          lead.id,
          mailbox.id,
          payload.direction,
          payload.provider_event_id,
          this.rawContentCryptoService.encrypt(payload.body ?? ''),
          JSON.stringify({
            subject: payload.subject ?? '',
            thread_id: payload.thread_id ?? null,
            provider: mailbox.provider
          }),
          payload.timestamp ?? null
        ]
      );

      if (!insertResult.rowCount) {
        return { accepted: true, deduped: true, lead_id: lead.id };
      }

      if (payload.direction === 'outbound') {
        await this.leadsService.applyTouch(client, lead.id, lead.owner_agent_id);
      } else {
        await this.ensureInboundTask(client, lead.id, lead.owner_agent_id);
      }

      return { accepted: true, deduped: false, lead_id: lead.id };
    });
  }

  async ingestSms(payload: SmsWebhookPayload): Promise<{ accepted: boolean; deduped: boolean; lead_id?: string }> {
    return this.databaseService.withSystemTransaction(async (client) => {
      const phone = await this.resolvePhone(client, payload.phone_number_id, payload.to_number);
      if (!phone) {
        return { accepted: false, deduped: false };
      }

      const ownerAgentId = await this.resolveDefaultAgent(client, phone.team_id);

      const lead = await this.leadsService.findOrCreateLeadByPhone(client, {
        teamId: phone.team_id,
        ownerAgentId,
        phone: payload.from_number,
        source: 'sms'
      });

      const insertResult = await client.query(
        `INSERT INTO "ConversationEvent" (
          lead_id,
          channel,
          type,
          direction,
          phone_number_id,
          provider_event_id,
          raw_body,
          meta,
          created_at
        ) VALUES (
          $1,
          'sms',
          CASE WHEN $3 = 'inbound' THEN 'sms_received' ELSE 'sms_sent' END,
          $3,
          $2,
          $4,
          $5,
          $6::jsonb,
          COALESCE($7::timestamptz, now())
        )
        ON CONFLICT (phone_number_id, provider_event_id)
        WHERE channel = 'sms' AND provider_event_id IS NOT NULL
        DO NOTHING
        RETURNING id`,
        [
          lead.id,
          phone.id,
          payload.direction,
          payload.provider_event_id,
          this.rawContentCryptoService.encrypt(payload.body ?? ''),
          JSON.stringify({ provider: phone.provider }),
          payload.timestamp ?? null
        ]
      );

      if (!insertResult.rowCount) {
        return { accepted: true, deduped: true, lead_id: lead.id };
      }

      if (payload.direction === 'outbound') {
        await this.leadsService.applyTouch(client, lead.id, lead.owner_agent_id);
      } else {
        await this.ensureInboundTask(client, lead.id, lead.owner_agent_id);
      }

      return { accepted: true, deduped: false, lead_id: lead.id };
    });
  }

  async ingestCall(payload: CallWebhookPayload): Promise<{ accepted: boolean; deduped: boolean; lead_id?: string }> {
    return this.databaseService.withSystemTransaction(async (client) => {
      const phone = await this.resolvePhone(client, payload.phone_number_id, payload.to_number);
      if (!phone) {
        return { accepted: false, deduped: false };
      }

      const ownerAgentId = await this.resolveDefaultAgent(client, phone.team_id);

      const lead = await this.leadsService.findOrCreateLeadByPhone(client, {
        teamId: phone.team_id,
        ownerAgentId,
        phone: payload.from_number,
        source: 'call'
      });

      const insertResult = await client.query(
        `INSERT INTO "ConversationEvent" (
          lead_id,
          channel,
          type,
          direction,
          phone_number_id,
          provider_event_id,
          raw_body,
          meta,
          created_at
        ) VALUES (
          $1,
          'call',
          'call_status',
          $3,
          $2,
          $4,
          NULL,
          $5::jsonb,
          COALESCE($6::timestamptz, now())
        )
        ON CONFLICT (phone_number_id, provider_event_id)
        WHERE channel = 'call' AND provider_event_id IS NOT NULL
        DO NOTHING
        RETURNING id`,
        [
          lead.id,
          phone.id,
          payload.direction,
          payload.provider_event_id,
          JSON.stringify({
            status: payload.status,
            duration_seconds: payload.duration_seconds ?? null,
            provider: phone.provider
          }),
          payload.timestamp ?? null
        ]
      );

      if (!insertResult.rowCount) {
        return { accepted: true, deduped: true, lead_id: lead.id };
      }

      return { accepted: true, deduped: false, lead_id: lead.id };
    });
  }

  private async resolveMailbox(
    client: PoolClient,
    mailboxConnectionId?: string,
    mailboxEmail?: string
  ): Promise<{ id: string; user_id: string; team_id: string; provider: string } | null> {
    if (mailboxConnectionId) {
      const result = await client.query(
        `SELECT m.id, m.user_id, u.team_id, m.provider
         FROM "MailboxConnection" m
         JOIN "User" u ON u.id = m.user_id
         WHERE m.id = $1`,
        [mailboxConnectionId]
      );
      return result.rows[0] ?? null;
    }

    if (mailboxEmail) {
      const result = await client.query(
        `SELECT m.id, m.user_id, u.team_id, m.provider
         FROM "MailboxConnection" m
         JOIN "User" u ON u.id = m.user_id
         WHERE m.email_address = $1
         ORDER BY m.created_at ASC
         LIMIT 1`,
        [mailboxEmail]
      );
      return result.rows[0] ?? null;
    }

    return null;
  }

  private async resolvePhone(
    client: PoolClient,
    phoneNumberId?: string,
    toNumber?: string
  ): Promise<{ id: string; team_id: string; provider: string } | null> {
    if (phoneNumberId) {
      const result = await client.query(
        `SELECT id, team_id, provider FROM "PhoneNumber" WHERE id = $1`,
        [phoneNumberId]
      );
      return result.rows[0] ?? null;
    }

    if (toNumber) {
      const result = await client.query(
        `SELECT id, team_id, provider
         FROM "PhoneNumber"
         WHERE number = $1
         LIMIT 1`,
        [toNumber]
      );
      return result.rows[0] ?? null;
    }

    return null;
  }

  private async resolveDefaultAgent(client: PoolClient, teamId: string): Promise<string> {
    const result = await client.query(
      `SELECT id
       FROM "User"
       WHERE team_id = $1 AND role = 'AGENT'
       ORDER BY id
       LIMIT 1`,
      [teamId]
    );

    if (!result.rowCount || !result.rows[0]) {
      throw new Error(`No agent found in team ${teamId}`);
    }

    return result.rows[0].id as string;
  }

  private async ensureInboundTask(client: PoolClient, leadId: string, ownerId: string): Promise<void> {
    const existing = await client.query(
      `SELECT id
       FROM "Task"
       WHERE lead_id = $1
         AND status = 'open'
         AND type IN ('contact_now', 'follow_up')
       LIMIT 1`,
      [leadId]
    );

    if (!existing.rowCount) {
      await client.query(
        `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
         VALUES ($1, $2, now(), 'open', 'contact_now')`,
        [leadId, ownerId]
      );
    }
  }

  isValidSignature(body: unknown, providedSignature?: string): boolean {
    const secret = this.configService.get<string>('WEBHOOK_SHARED_SECRET');
    if (!secret) {
      return true;
    }

    if (!providedSignature) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(providedSignature);
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }
}
