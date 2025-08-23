import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NFCModule } from './nfc/nfc.module';
import { UserModule } from './user/user.module';
import { CryptoModule } from './crypto/crypto.module';
import { ContractModule } from './contract/contract.module';
import { ChatModule } from './chat/chat.module';
import { ToolsModule } from './tools/tools.module';
import { HealthController } from './health/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        PrismaModule,
        CryptoModule,
        ContractModule,
        NFCModule,
        UserModule,
        ChatModule,
        ToolsModule
    ],
    controllers: [HealthController],
})
export class AppModule { } 