import { Controller, Get, Param, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UserContext } from '../../common/auth/user-context';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('search')
  async search(
    @CurrentUser() user: UserContext,
    @Query('q') query = ''
  ): Promise<Record<string, unknown>[]> {
    return this.attachmentsService.search(user, query);
  }

  @Get(':id')
  async get(@CurrentUser() user: UserContext, @Param('id') attachmentId: string): Promise<Record<string, unknown>> {
    return this.attachmentsService.getDownload(user, attachmentId);
  }
}
