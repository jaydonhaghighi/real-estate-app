import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../common/db/database.service';
import { UserContext } from '../../common/auth/user-context';
import { AttachmentStorageService } from './storage.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly attachmentStorageService: AttachmentStorageService
  ) {}

  async search(user: UserContext, query: string): Promise<Record<string, unknown>[]> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query(
        `SELECT a.id, a.conversation_event_id, a.filename, a.mime_type, a.storage_key, a.size_bytes, a.created_at
         FROM "Attachment" a
         WHERE lower(a.filename) LIKE lower($1)
         ORDER BY a.created_at DESC
         LIMIT 100`,
        [`%${query}%`]
      );
      return result.rows;
    });
  }

  async getDownload(user: UserContext, attachmentId: string): Promise<Record<string, unknown>> {
    return this.databaseService.withUserTransaction(user, async (client) => {
      const result = await client.query(
        `SELECT a.id, a.filename, a.mime_type, a.storage_key, a.size_bytes, a.created_at
         FROM "Attachment" a
         WHERE a.id = $1
         LIMIT 1`,
        [attachmentId]
      );

      if (!result.rowCount || !result.rows[0]) {
        throw new NotFoundException('Attachment not found');
      }

      return {
        ...result.rows[0],
        download_url: this.attachmentStorageService.buildDownloadUrl(result.rows[0].storage_key as string)
      };
    });
  }
}
