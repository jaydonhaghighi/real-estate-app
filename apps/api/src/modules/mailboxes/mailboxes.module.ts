import { Module } from '@nestjs/common';

import { MailboxesController } from './mailboxes.controller';
import { MailboxesService } from './mailboxes.service';
import { GmailProviderClient } from './providers/gmail.provider';
import { OutlookProviderClient } from './providers/outlook.provider';

@Module({
  controllers: [MailboxesController],
  providers: [MailboxesService, GmailProviderClient, OutlookProviderClient]
})
export class MailboxesModule {}
