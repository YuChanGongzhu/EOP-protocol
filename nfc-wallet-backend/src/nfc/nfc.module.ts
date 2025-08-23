import { Module } from '@nestjs/common';
import { NFCController, ContractController } from './nfc.controller';
import { NFCService } from './nfc.service';
import { CryptoModule } from '../crypto/crypto.module';
import { ContractModule } from '../contract/contract.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        CryptoModule,
        ContractModule,
        PrismaModule,
    ],
    controllers: [NFCController, ContractController],
    providers: [NFCService],
    exports: [NFCService],
})
export class NFCModule { } 