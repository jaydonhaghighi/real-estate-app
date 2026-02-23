import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UserContext } from '../../common/auth/user-context';
import { MessagesService } from './messages.service';

const emailReplySchema = z.object({
  lead_id: z.string().uuid(),
  mailbox_connection_id: z.string().uuid().optional(),
  provider_event_id: z.string().optional(),
  thread_id: z.string().min(1).optional(),
  subject: z.string().min(1),
  body: z.string().min(1)
});

const smsSendSchema = z.object({
  lead_id: z.string().uuid(),
  phone_number_id: z.string().uuid(),
  provider_event_id: z.string().optional(),
  body: z.string().min(1)
});

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('email/reply')
  async replyEmail(
    @CurrentUser() user: UserContext,
    @Body() body: unknown
  ): Promise<{ sent: boolean; provider_event_id: string }> {
    const payload = emailReplySchema.parse(body);
    return this.messagesService.replyEmail(user, payload);
  }

  @Post('sms/send')
  async sendSms(
    @CurrentUser() user: UserContext,
    @Body() body: unknown
  ): Promise<{ sent: boolean; provider_event_id: string }> {
    const payload = smsSendSchema.parse(body);
    return this.messagesService.sendSms(user, payload);
  }
}
