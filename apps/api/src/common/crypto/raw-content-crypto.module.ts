import { Global, Module } from '@nestjs/common';

import { RawContentCryptoService } from './raw-content-crypto.service';

@Global()
@Module({
  providers: [RawContentCryptoService],
  exports: [RawContentCryptoService]
})
export class RawContentCryptoModule {}
