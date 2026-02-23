import { Module } from '@nestjs/common';

import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentStorageService } from './storage.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentStorageService]
})
export class AttachmentsModule {}
