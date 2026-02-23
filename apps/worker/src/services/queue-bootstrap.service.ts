import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class QueueBootstrapService {
  private readonly logger = new Logger(QueueBootstrapService.name);

  private readonly staleQueue: Queue;

  constructor(private readonly configService: ConfigService) {
    this.staleQueue = new Queue('stale-detection', {
      connection: {
        url: this.configService.getOrThrow<string>('REDIS_URL')
      }
    });
  }

  async registerRecurringJobs(): Promise<void> {
    await this.staleQueue.upsertJobScheduler('stale-detection-recurring', {
      every: 5 * 60 * 1000
    }, {
      name: 'evaluate-stale'
    });

    this.logger.log('Recurring stale detection job registered (every 5 minutes)');
  }
}
