import { Controller, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../common/auth/public.decorator';
import { InternalService } from './internal.service';
import { InternalTokenGuard } from './internal-token.guard';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Public()
  @UseGuards(InternalTokenGuard)
  @Post('stale-trigger')
  async staleTrigger(): Promise<{ queued: true }> {
    return this.internalService.triggerStaleEvaluation();
  }
}
