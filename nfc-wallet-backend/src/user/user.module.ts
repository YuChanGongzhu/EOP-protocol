import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ContractModule } from '../contract/contract.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
    imports: [ContractModule, CryptoModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule { } 