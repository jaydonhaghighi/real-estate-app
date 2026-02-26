import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';

@Injectable()
export class MailSyncJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailSyncJob.name);
  private worker?: Worker;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'mail-sync',
      async (job) => {
        this.logger.log(`Processing mail sync job: ${job.name} ${JSON.stringify(job.data)}`);

        if (job.name === 'mailbox-backfill') {
          return {
            mailbox_id: job.data.mailboxId,
            status: 'queued_for_provider_sync',
            note: 'Provider sync connector should fetch historical data and enqueue webhook-like events.'
          };
        }

        return { status: 'ignored' };
      },
      {
        connection: {
          url: this.configService.getOrThrow<string>('REDIS_URL')
        }
      }
    );

    this.worker.on('failed', (_, error) => {
      this.logger.error(`mail-sync failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
