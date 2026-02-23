import { Injectable, NotFoundException } from '@nestjs/common';
import { aiDraftSchema, aiSummaryRefreshSchema } from '@mvp/shared-types';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { DatabaseService } from '../../common/db/database.service';
import { UserContext } from '../../common/auth/user-context';

@Injectable()
export class AiService {
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async draft(user: UserContext, body: unknown): Promise<{ text: string; language: string; human_action_required: true }> {
    const payload = aiDraftSchema.parse(body);

    return this.databaseService.withUserTransaction(user, async (client) => {
      const leadResult = await client.query(
        `SELECT l.id, l.state, l.primary_email, l.primary_phone, u.language AS user_language, d.language AS lead_language, d.summary
         FROM "Lead" l
         JOIN "User" u ON u.id = $2
         LEFT JOIN "DerivedLeadProfile" d ON d.lead_id = l.id
         WHERE l.id = $1
         LIMIT 1`,
        [payload.lead_id, user.userId]
      );

      if (!leadResult.rowCount || !leadResult.rows[0]) {
        throw new NotFoundException('Lead not found');
      }

      const lead = leadResult.rows[0];
      const language = (lead.lead_language as string | null) ?? (lead.user_language as string);

      const prompt = [
        `Language: ${language}`,
        `Channel: ${payload.channel}`,
        `Lead state: ${lead.state}`,
        `Lead summary: ${lead.summary ?? 'No summary available'}`,
        `Instruction: ${payload.instruction ?? 'Create a professional follow-up message.'}`,
        'Constraints: Keep editable. Do not auto-send. Avoid direct quotes.'
      ].join('\n');

      const text = await this.generateText(prompt, language);

      return {
        text,
        language,
        human_action_required: true
      };
    });
  }

  async refreshSummary(
    user: UserContext,
    body: unknown
  ): Promise<{ lead_id: string; summary: string; language: string; human_action_required: true }> {
    const payload = aiSummaryRefreshSchema.parse(body);

    return this.databaseService.withUserTransaction(user, async (client) => {
      const leadResult = await client.query(
        `SELECT l.id, l.state, l.last_touch_at, l.next_action_at, u.language AS user_language, d.language AS lead_language
         FROM "Lead" l
         JOIN "User" u ON u.id = $2
         LEFT JOIN "DerivedLeadProfile" d ON d.lead_id = l.id
         WHERE l.id = $1
         LIMIT 1`,
        [payload.lead_id, user.userId]
      );

      if (!leadResult.rowCount || !leadResult.rows[0]) {
        throw new NotFoundException('Lead not found');
      }

      const lead = leadResult.rows[0];
      const language = (lead.lead_language as string | null) ?? (lead.user_language as string);

      const events = await client.query(
        `SELECT channel, type, direction, created_at
         FROM "ConversationEvent"
         WHERE lead_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [payload.lead_id]
      );

      const prompt = [
        `Language: ${language}`,
        `Lead state: ${lead.state}`,
        `Last touch: ${lead.last_touch_at ?? 'n/a'}`,
        `Next action: ${lead.next_action_at ?? 'n/a'}`,
        'Recent events (metadata only):',
        JSON.stringify(events.rows, null, 2),
        'Write a concise lead summary without direct quotes.'
      ].join('\n');

      const summary = await this.generateText(prompt, language);

      await client.query(
        `INSERT INTO "DerivedLeadProfile" (lead_id, summary, language, fields_json, metrics_json, updated_at)
         VALUES ($1, $2, $3, '{}'::jsonb, '{}'::jsonb, now())
         ON CONFLICT (lead_id)
         DO UPDATE SET summary = EXCLUDED.summary,
                       language = EXCLUDED.language,
                       updated_at = now()`,
        [payload.lead_id, summary, language]
      );

      return {
        lead_id: payload.lead_id,
        summary,
        language,
        human_action_required: true
      };
    });
  }

  private async generateText(prompt: string, language: string): Promise<string> {
    if (!this.client) {
      return `(${language}) Draft unavailable without OPENAI_API_KEY. Prompt seed: ${prompt.slice(0, 120)}...`;
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content:
            'You generate editable real-estate follow-up text. Never produce auto-send instructions. Avoid direct quoting unless explicitly requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = response.output_text?.trim();
    if (!text) {
      return `(${language}) No model output.`;
    }
    return text;
  }
}
