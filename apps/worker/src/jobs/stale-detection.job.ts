import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';

import { StaleEvaluatorService } from '../services/stale-evaluator.service';

@Injectable()
export class StaleDetectionJob implements OnModuleInit {
  private readonly logger = new Logger(StaleDetectionJob.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly staleEvaluatorService: StaleEvaluatorService
  ) {}

  onModuleInit(): void {
    const worker = new Worker(
      'stale-detection',
      async () => this.staleEvaluatorService.evaluateAll(),
      {
        connection: {
          url: this.configService.getOrThrow<string>('REDIS_URL')
        }
      }
    );

    worker.on('completed', (_, result) => {
      this.logger.log(`stale-detection completed: ${JSON.stringify(result)}`);
    });

    worker.on('failed', (_, error) => {
      this.logger.error(`stale-detection failed: ${error.message}`);
    });
  }
}
