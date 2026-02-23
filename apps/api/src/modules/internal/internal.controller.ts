import { Controller, Post } from '@nestjs/common';

import { Public } from '../../common/auth/public.decorator';
import { InternalService } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Public()
  @Post('stale-trigger')
  async staleTrigger(): Promise<{ queued: true }> {
    return this.internalService.triggerStaleEvaluation();
  }
}
