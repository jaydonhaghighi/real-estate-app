import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';

@Injectable()
export class RescueSequenceJob implements OnModuleInit {
  private readonly logger = new Logger(RescueSequenceJob.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const worker = new Worker(
      'rescue-sequence',
      async (job) => {
        this.logger.log(`Rescue-sequence job ${job.id} processed for lead ${job.data.leadId}`);
        return {
          status: 'task_only_automation',
          human_send_required: true
        };
      },
      {
        connection: {
          url: this.configService.getOrThrow<string>('REDIS_URL')
        }
      }
    );

    worker.on('failed', (_, error) => {
      this.logger.error(`rescue-sequence failed: ${error.message}`);
    });
  }
}
