import { Injectable, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from './database.service';

interface TeamRuleRow {
  id: string;
  stale_rules: {
    new_lead_sla_minutes?: number;
    active_stale_hours?: number;
    at_risk_threshold_percent?: number;
  };
  escalation_rules: {
    rescue_sequences?: Array<{
      id: string;
      language: string;
      steps: Array<{
        id: string;
        offset_minutes: number;
        enabled: boolean;
      }>;
    }>;
  };
}

interface LeadRow {
  id: string;
  team_id: string;
  owner_agent_id: string;
  state: 'New' | 'Active' | 'At-Risk' | 'Stale';
  created_at: string;
  last_touch_at: string | null;
}

@Injectable()
export class StaleEvaluatorService {
  private readonly logger = new Logger(StaleEvaluatorService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async evaluateAll(): Promise<{ processed: number; at_risk: number; stale: number }> {
    return this.databaseService.withTransaction(async (client) => {
      const teams = await client.query<TeamRuleRow>(
        'SELECT id, stale_rules, escalation_rules FROM "Team" ORDER BY id'
      );

      let processed = 0;
      let atRiskCount = 0;
      let staleCount = 0;

      for (const team of teams.rows) {
        const leads = await client.query<LeadRow>(
          `SELECT id, team_id, owner_agent_id, state, created_at, last_touch_at
           FROM "Lead"
           WHERE team_id = $1
             AND state IN ('New', 'Active', 'At-Risk')`,
          [team.id]
        );

        for (const lead of leads.rows) {
          processed += 1;
          const outcome = await this.evaluateLead(client, team, lead);
          if (outcome === 'at_risk') {
            atRiskCount += 1;
          }
          if (outcome === 'stale') {
            staleCount += 1;
          }
        }
      }

      this.logger.log(`Processed ${processed} leads: ${atRiskCount} at-risk, ${staleCount} stale`);
      return { processed, at_risk: atRiskCount, stale: staleCount };
    });
  }

  private async evaluateLead(
    client: PoolClient,
    team: TeamRuleRow,
    lead: LeadRow
  ): Promise<'none' | 'at_risk' | 'stale'> {
    const staleHours = Number(team.stale_rules?.active_stale_hours ?? 48);
    const atRiskPercent = Number(team.stale_rules?.at_risk_threshold_percent ?? 80);
    const newLeadSlaMinutes = Number(team.stale_rules?.new_lead_sla_minutes ?? 60);

    const now = Date.now();
    const touchMillis = lead.last_touch_at
      ? new Date(lead.last_touch_at).getTime()
      : new Date(lead.created_at).getTime();

    const elapsedMillis = now - touchMillis;
    const staleMillis = staleHours * 60 * 60 * 1000;
    const atRiskMillis = staleMillis * (atRiskPercent / 100);

    if (elapsedMillis >= staleMillis) {
      await client.query(
        `UPDATE "Lead"
         SET state = 'Stale',
             updated_at = now()
         WHERE id = $1`,
        [lead.id]
      );

      await this.ensureRescueTask(client, lead.id, lead.owner_agent_id);
      await this.applyRescueSequenceTasks(client, team, lead.id, lead.owner_agent_id);
      return 'stale';
    }

    if (lead.state === 'New') {
      const newLeadElapsed = now - new Date(lead.created_at).getTime();
      const newLeadAtRiskMillis = newLeadSlaMinutes * 60 * 1000 * 0.8;
      if (newLeadElapsed >= newLeadAtRiskMillis) {
        await client.query(
          `UPDATE "Lead"
           SET state = 'At-Risk',
               updated_at = now()
           WHERE id = $1`,
          [lead.id]
        );
        return 'at_risk';
      }
      return 'none';
    }

    if (elapsedMillis >= atRiskMillis && lead.state !== 'At-Risk') {
      await client.query(
        `UPDATE "Lead"
         SET state = 'At-Risk',
             updated_at = now()
         WHERE id = $1`,
        [lead.id]
      );
      return 'at_risk';
    }

    if (elapsedMillis < atRiskMillis && lead.state === 'At-Risk') {
      await client.query(
        `UPDATE "Lead"
         SET state = 'Active',
             updated_at = now()
         WHERE id = $1`,
        [lead.id]
      );
    }

    return 'none';
  }

  private async ensureRescueTask(client: PoolClient, leadId: string, ownerId: string): Promise<void> {
    const existingTask = await client.query(
      `SELECT id
       FROM "Task"
       WHERE lead_id = $1
         AND type = 'rescue'
         AND status = 'open'
       LIMIT 1`,
      [leadId]
    );

    if (!existingTask.rowCount) {
      await client.query(
        `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
         VALUES ($1, $2, now(), 'open', 'rescue')`,
        [leadId, ownerId]
      );
    }
  }

  private async applyRescueSequenceTasks(
    client: PoolClient,
    team: TeamRuleRow,
    leadId: string,
    ownerId: string
  ): Promise<void> {
    const rescueSequences = team.escalation_rules?.rescue_sequences ?? [];
    if (!rescueSequences.length) {
      return;
    }

    const sequence = rescueSequences[0];
    for (const step of sequence.steps.filter((item) => item.enabled)) {
      await client.query(
        `INSERT INTO "Task" (lead_id, owner_id, due_at, status, type)
         VALUES ($1, $2, now() + ($3 * interval '1 minute'), 'open', 'rescue')`,
        [leadId, ownerId, step.offset_minutes]
      );
    }
  }
}
