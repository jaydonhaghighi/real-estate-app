import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EscalationRules,
  escalationRuleSchema,
  slaRuleSchema,
  staleRuleSchema,
  templateCreateSchema
} from '@mvp/shared-types';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../common/db/database.service';
import { UserContext } from '../../common/auth/user-context';

@Injectable()
export class TeamService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getTemplates(user: UserContext): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query(
        'SELECT escalation_rules FROM "Team" WHERE id = $1',
        [user.teamId]
      );

      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const rules = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      return rules.templates;
    });
  }

  async createTemplate(user: UserContext, payload: unknown): Promise<Record<string, unknown>> {
    const template = templateCreateSchema.parse(payload);

    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query('SELECT escalation_rules FROM "Team" WHERE id = $1', [user.teamId]);
      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const rules = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      const nextTemplate = {
        id: uuidv4(),
        updated_at: new Date().toISOString(),
        ...template
      };
      const updatedRules = {
        ...rules,
        templates: [...rules.templates, nextTemplate]
      };

      await client.query('UPDATE "Team" SET escalation_rules = $2::jsonb WHERE id = $1', [
        user.teamId,
        JSON.stringify(updatedRules)
      ]);

      return nextTemplate;
    });
  }

  async updateTemplate(user: UserContext, templateId: string, payload: unknown): Promise<Record<string, unknown>> {
    const template = templateCreateSchema.parse(payload);

    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query('SELECT escalation_rules FROM "Team" WHERE id = $1', [user.teamId]);
      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const rules = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      const templateExists = rules.templates.some((item) => item.id === templateId);
      if (!templateExists) {
        throw new NotFoundException('Template not found');
      }

      const updatedTemplate = {
        id: templateId,
        updated_at: new Date().toISOString(),
        ...template
      };

      const updatedRules = {
        ...rules,
        templates: rules.templates.map((item) => (item.id === templateId ? updatedTemplate : item))
      };

      await client.query('UPDATE "Team" SET escalation_rules = $2::jsonb WHERE id = $1', [
        user.teamId,
        JSON.stringify(updatedRules)
      ]);

      return updatedTemplate;
    });
  }

  async deleteTemplate(user: UserContext, templateId: string): Promise<{ id: string; deleted: true }> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query('SELECT escalation_rules FROM "Team" WHERE id = $1', [user.teamId]);
      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const rules = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      const updatedRules = {
        ...rules,
        templates: rules.templates.filter((item) => item.id !== templateId)
      };

      await client.query('UPDATE "Team" SET escalation_rules = $2::jsonb WHERE id = $1', [
        user.teamId,
        JSON.stringify(updatedRules)
      ]);

      return { id: templateId, deleted: true };
    });
  }

  async getRescueSequences(user: UserContext): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query('SELECT escalation_rules FROM "Team" WHERE id = $1', [user.teamId]);
      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const rules = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      return rules.rescue_sequences;
    });
  }

  async updateRescueSequences(user: UserContext, payload: unknown): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query('SELECT escalation_rules FROM "Team" WHERE id = $1', [user.teamId]);
      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const existing = escalationRuleSchema.parse(result.rows[0].escalation_rules as EscalationRules);
      const sequenceUpdateSchema = escalationRuleSchema.pick({ rescue_sequences: true });
      const parsed = sequenceUpdateSchema.parse(payload);
      const updated = {
        ...existing,
        rescue_sequences: parsed.rescue_sequences
      };

      await client.query('UPDATE "Team" SET escalation_rules = $2::jsonb WHERE id = $1', [
        user.teamId,
        JSON.stringify(updated)
      ]);

      return updated.rescue_sequences;
    });
  }

  async getSlaDashboard(user: UserContext): Promise<Record<string, unknown>> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const [tasksDue, tasksDone, staleLeads, activeLeads] = await Promise.all([
        client.query(`SELECT COUNT(*)::int AS count FROM "Task" WHERE status = 'open' AND due_at <= now()`),
        client.query(
          `SELECT COUNT(*)::int AS count
           FROM "Task"
           WHERE status = 'done' AND created_at >= date_trunc('day', now())`
        ),
        client.query(`SELECT COUNT(*)::int AS count FROM "Lead" WHERE state = 'Stale'`),
        client.query(`SELECT COUNT(*)::int AS count FROM "Lead" WHERE state = 'Active'`)
      ]);

      return {
        tasks_due_today: tasksDue.rows[0].count,
        tasks_done_today: tasksDone.rows[0].count,
        stale_leads: staleLeads.rows[0].count,
        active_leads: activeLeads.rows[0].count
      };
    });
  }

  async updateRules(user: UserContext, payload: unknown): Promise<Record<string, unknown>> {
    const ruleSchema = staleRuleSchema.and(slaRuleSchema.partial());

    return this.databaseService.withUserTransaction(user, async (client) => {
      const teamResult = await client.query(
        'SELECT stale_rules, sla_rules, escalation_rules FROM "Team" WHERE id = $1',
        [user.teamId]
      );

      if (!teamResult.rowCount || !teamResult.rows[0]) {
        throw new NotFoundException('Team not found');
      }

      const current = teamResult.rows[0];
      const staleRules = staleRuleSchema.parse({ ...(current.stale_rules as object), ...(payload as object) });
      const existingSla = slaRuleSchema.parse(current.sla_rules);
      const override = ruleSchema.parse(payload);
      const nextSlaRules = {
        ...existingSla,
        ...override
      };

      await client.query(
        `UPDATE "Team"
         SET stale_rules = $2::jsonb,
             sla_rules = $3::jsonb
         WHERE id = $1`,
        [user.teamId, JSON.stringify(staleRules), JSON.stringify(nextSlaRules)]
      );

      return {
        stale_rules: staleRules,
        sla_rules: nextSlaRules,
        escalation_rules: current.escalation_rules
      };
    });
  }
}
