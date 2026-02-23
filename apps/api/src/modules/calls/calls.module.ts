import { Module } from '@nestjs/common';

import { LeadsModule } from '../leads/leads.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({
  imports: [LeadsModule],
  controllers: [CallsController],
  providers: [CallsService]
})
export class CallsModule {}
