import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../common/db/database.service';
import { RawContentCryptoService } from '../../common/crypto/raw-content-crypto.service';
import { UserContext } from '../../common/auth/user-context';

interface LeadRow {
  id: string;
  team_id: string;
  owner_agent_id: string;
  state: 'New' | 'Active' | 'At-Risk' | 'Stale';
}

interface ConversationEventRow {
  id: string;
  channel: string;
  type: string;
  direction: string;
  mailbox_connection_id: string | null;
  phone_number_id: string | null;
  provider_event_id: string | null;
  raw_body: Buffer | null;
  meta: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rawContentCryptoService: RawContentCryptoService
  ) {}

  async getDerivedProfile(user: UserContext, leadId: string): Promise<Record<string, unknown>> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query(
        `SELECT d.lead_id, d.summary, d.language, d.fields_json, d.metrics_json, d.updated_at,
                l.state, l.last_touch_at, l.next_action_at
         FROM "DerivedLeadProfile" d
         JOIN "Lead" l ON l.id = d.lead_id
         WHERE d.lead_id = $1`,
        [leadId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundException('Lead profile not found');
      }

      return result.rows[0];
    });
  }

  async getEventMetadata(user: UserContext, leadId: string): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      if (user.role === 'TEAM_LEAD') {
        const result = await client.query(
          'SELECT id, channel, type, direction, created_at FROM team_event_metadata($1)',
          [leadId]
        );
        return result.rows;
      }

      const result = await client.query(
        `SELECT id, channel, type, direction, created_at
         FROM "ConversationEvent"
         WHERE lead_id = $1
         ORDER BY created_at DESC
         LIMIT 250`,
        [leadId]
      );
      return result.rows;
    });
  }

  async getRawEvents(user: UserContext, leadId: string, reason?: string): Promise<Record<string, unknown>> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const lead = await this.getLeadForAccess(client, leadId, user.teamId);

      if (user.role === 'TEAM_LEAD') {
        if (lead.state !== 'Stale') {
          throw new ForbiddenException('Raw access is only available to Team Leads when lead is Stale');
        }
        if (!reason) {
          throw new ForbiddenException('A reason is required for stale raw access');
        }

        await client.query(
          `INSERT INTO "AuditLog" (actor_id, lead_id, action, reason)
           VALUES ($1, $2, 'TEAM_LEAD_RAW_ACCESS', $3)`,
          [user.userId, leadId, reason]
        );
      }

      const eventRows = await client.query<ConversationEventRow>(
        `SELECT id, channel, type, direction, mailbox_connection_id, phone_number_id, provider_event_id, raw_body, meta, created_at
         FROM "ConversationEvent"
         WHERE lead_id = $1
         ORDER BY created_at DESC
         LIMIT 250`,
        [leadId]
      );

      const attachments = await client.query(
        `SELECT a.id, a.conversation_event_id, a.filename, a.mime_type, a.storage_key, a.size_bytes, a.created_at
         FROM "Attachment" a
         JOIN "ConversationEvent" e ON e.id = a.conversation_event_id
         WHERE e.lead_id = $1
         ORDER BY a.created_at DESC`,
        [leadId]
      );

      return {
        events: eventRows.rows.map((event: ConversationEventRow) => ({
          ...event,
          raw_body: this.rawContentCryptoService.decrypt(event.raw_body)
        })),
        attachments: attachments.rows
      };
    });
  }

  async reassignLead(user: UserContext, leadId: string, newOwnerId: string): Promise<{ lead_id: string; owner_agent_id: string }> {
    if (user.role !== 'TEAM_LEAD') {
      throw new ForbiddenException('Only Team Leads can reassign leads');
    }

    return this.databaseService.withUserTransaction(user, async (client) => {
      const lead = await this.getLeadForAccess(client, leadId, user.teamId);
      if (lead.state !== 'Stale') {
        throw new ForbiddenException('Reassignment is only allowed for stale leads');
      }

      const updateResult = await client.query(
        `UPDATE "Lead"
         SET owner_agent_id = $2,
             updated_at = now()
         WHERE id = $1
         RETURNING id AS lead_id, owner_agent_id`,
        [leadId, newOwnerId]
      );

      if (updateResult.rowCount === 0) {
        throw new NotFoundException('Lead not found');
      }

      await client.query(
        `INSERT INTO "AuditLog" (actor_id, lead_id, action, reason)
         VALUES ($1, $2, 'LEAD_REASSIGN', $3)`,
        [user.userId, leadId, `Reassigned to ${newOwnerId}`]
      );

      return updateResult.rows[0];
    });
  }

  async findOrCreateLeadByEmail(
    client: PoolClient,
    args: {
      teamId: string;
      ownerAgentId: string;
      email: string;
      source: 'email' | 'manual';
    }
  ): Promise<LeadRow> {
    const existing = await client.query<LeadRow>(
      `SELECT id, team_id, owner_agent_id, state
       FROM "Lead"
       WHERE team_id = $1 AND primary_email = $2
       LIMIT 1`,
      [args.teamId, args.email]
    );

    if (existing.rowCount && existing.rows[0]) {
      return existing.rows[0];
    }

    const created = await client.query<LeadRow>(
      `INSERT INTO "Lead" (team_id, owner_agent_id, state, source, primary_email, next_action_at)
       VALUES ($1, $2, 'New', $3, $4, now())
       RETURNING id, team_id, owner_agent_id, state`,
      [args.teamId, args.ownerAgentId, args.source, args.email]
    );

    await client.query(
      `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
       VALUES ($1, $2, now(), 'open', 'contact_now')`,
      [created.rows[0].id, args.ownerAgentId]
    );

    await client.query(
      `INSERT INTO "DerivedLeadProfile" (lead_id, summary, language, fields_json, metrics_json)
       VALUES ($1, 'New lead awaiting first contact.', 'en', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (lead_id) DO NOTHING`,
      [created.rows[0].id]
    );

    return created.rows[0];
  }

  async findOrCreateLeadByPhone(
    client: PoolClient,
    args: {
      teamId: string;
      ownerAgentId: string;
      phone: string;
      source: 'sms' | 'call' | 'manual';
    }
  ): Promise<LeadRow> {
    const existing = await client.query<LeadRow>(
      `SELECT id, team_id, owner_agent_id, state
       FROM "Lead"
       WHERE team_id = $1 AND primary_phone = $2
       LIMIT 1`,
      [args.teamId, args.phone]
    );

    if (existing.rowCount && existing.rows[0]) {
      return existing.rows[0];
    }

    const created = await client.query<LeadRow>(
      `INSERT INTO "Lead" (team_id, owner_agent_id, state, source, primary_phone, next_action_at)
       VALUES ($1, $2, 'New', $3, $4, now())
       RETURNING id, team_id, owner_agent_id, state`,
      [args.teamId, args.ownerAgentId, args.source, args.phone]
    );

    await client.query(
      `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
       VALUES ($1, $2, now(), 'open', 'contact_now')`,
      [created.rows[0].id, args.ownerAgentId]
    );

    await client.query(
      `INSERT INTO "DerivedLeadProfile" (lead_id, summary, language, fields_json, metrics_json)
       VALUES ($1, 'New lead awaiting first contact.', 'en', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (lead_id) DO NOTHING`,
      [created.rows[0].id]
    );

    return created.rows[0];
  }

  async applyTouch(client: PoolClient, leadId: string, ownerId: string): Promise<void> {
    await client.query(
      `UPDATE "Lead"
       SET state = CASE WHEN state = 'New' THEN 'Active' ELSE state END,
           last_touch_at = now(),
           next_action_at = now() + interval '24 hours',
           updated_at = now()
       WHERE id = $1`,
      [leadId]
    );

    await client.query(
      `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
       VALUES ($1, $2, now() + interval '24 hours', 'open', 'follow_up')`,
      [leadId, ownerId]
    );
  }

  private async getLeadForAccess(client: PoolClient, leadId: string, teamId: string): Promise<LeadRow> {
    const leadResult = await client.query<LeadRow>(
      `SELECT id, team_id, owner_agent_id, state
       FROM "Lead"
       WHERE id = $1 AND team_id = $2`,
      [leadId, teamId]
    );

    if (!leadResult.rowCount || !leadResult.rows[0]) {
      throw new NotFoundException('Lead not found');
    }

    return leadResult.rows[0];
  }
}
