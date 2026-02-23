import { Module } from '@nestjs/common';

import { LeadsModule } from '../leads/leads.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [LeadsModule],
  controllers: [MessagesController],
  providers: [MessagesService]
})
export class MessagesModule {}
