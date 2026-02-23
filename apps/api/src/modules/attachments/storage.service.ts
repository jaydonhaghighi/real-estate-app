import { Injectable } from '@nestjs/common';

@Injectable()
export class AttachmentStorageService {
  // Placeholder for Cloud Storage signed URL integration.
  // In production, this should call @google-cloud/storage to generate V4 signed URLs.
  buildDownloadUrl(storageKey: string): string {
    return `/storage/${encodeURIComponent(storageKey)}`;
  }
}
