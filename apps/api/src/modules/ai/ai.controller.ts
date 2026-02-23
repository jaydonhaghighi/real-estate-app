import { Body, Controller, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UserContext } from '../../common/auth/user-context';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('draft')
  async draft(
    @CurrentUser() user: UserContext,
    @Body() body: unknown
  ): Promise<{ text: string; language: string; human_action_required: true }> {
    return this.aiService.draft(user, body);
  }

  @Post('summary/refresh')
  async refresh(
    @CurrentUser() user: UserContext,
    @Body() body: unknown
  ): Promise<{ lead_id: string; summary: string; language: string; human_action_required: true }> {
    return this.aiService.refreshSummary(user, body);
  }
}
