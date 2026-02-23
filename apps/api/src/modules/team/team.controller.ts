import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UserContext } from '../../common/auth/user-context';
import { Roles } from '../../common/rbac/roles.decorator';
import { TeamService } from './team.service';

@Controller('team')
@Roles('TEAM_LEAD')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('templates')
  async getTemplates(@CurrentUser() user: UserContext): Promise<Record<string, unknown>[]> {
    return this.teamService.getTemplates(user);
  }

  @Post('templates')
  async createTemplate(@CurrentUser() user: UserContext, @Body() body: unknown): Promise<Record<string, unknown>> {
    return this.teamService.createTemplate(user, body);
  }

  @Put('templates/:templateId')
  async updateTemplate(
    @CurrentUser() user: UserContext,
    @Param('templateId') templateId: string,
    @Body() body: unknown
  ): Promise<Record<string, unknown>> {
    return this.teamService.updateTemplate(user, templateId, body);
  }

  @Delete('templates/:templateId')
  async deleteTemplate(
    @CurrentUser() user: UserContext,
    @Param('templateId') templateId: string
  ): Promise<{ id: string; deleted: true }> {
    return this.teamService.deleteTemplate(user, templateId);
  }

  @Get('rescue-sequences')
  async getRescueSequences(@CurrentUser() user: UserContext): Promise<Record<string, unknown>[]> {
    return this.teamService.getRescueSequences(user);
  }

  @Put('rescue-sequences')
  async putRescueSequences(
    @CurrentUser() user: UserContext,
    @Body() body: unknown
  ): Promise<Record<string, unknown>[]> {
    return this.teamService.updateRescueSequences(user, body);
  }

  @Get('sla-dashboard')
  async getSlaDashboard(@CurrentUser() user: UserContext): Promise<Record<string, unknown>> {
    return this.teamService.getSlaDashboard(user);
  }

  @Put('rules')
  async putRules(@CurrentUser() user: UserContext, @Body() body: unknown): Promise<Record<string, unknown>> {
    return this.teamService.updateRules(user, body);
  }
}
