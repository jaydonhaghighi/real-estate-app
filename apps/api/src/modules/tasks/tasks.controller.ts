import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { taskDeckQuerySchema, taskSnoozeSchema } from '@mvp/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UserContext } from '../../common/auth/user-context';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('task-deck')
  async taskDeck(
    @CurrentUser() user: UserContext,
    @Query('limit') limit?: string
  ): Promise<Record<string, unknown>[]> {
    const parsed = taskDeckQuerySchema.parse({ limit });
    return this.tasksService.getTaskDeck(user, parsed.limit);
  }

  @Post('tasks/:id/done')
  async done(@CurrentUser() user: UserContext, @Param('id') taskId: string): Promise<{ id: string; status: string }> {
    return this.tasksService.markDone(user, taskId);
  }

  @Post('tasks/:id/snooze')
  async snooze(
    @CurrentUser() user: UserContext,
    @Param('id') taskId: string,
    @Body() body: unknown
  ): Promise<{ id: string; status: string; due_at: string }> {
    const payload = taskSnoozeSchema.parse(body);
    return this.tasksService.snooze(user, taskId, payload.mode);
  }
}
