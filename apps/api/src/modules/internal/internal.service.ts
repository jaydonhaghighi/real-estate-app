import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class InternalService {
  private readonly staleQueue: Queue;

  constructor(private readonly configService: ConfigService) {
    this.staleQueue = new Queue('stale-detection', {
      connection: {
        url: this.configService.getOrThrow<string>('REDIS_URL')
      }
    });
  }

  async triggerStaleEvaluation(): Promise<{ queued: true }> {
    await this.staleQueue.add(
      'evaluate-stale',
      {
        triggeredAt: new Date().toISOString()
      },
      {
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );

    return { queued: true };
  }
}
