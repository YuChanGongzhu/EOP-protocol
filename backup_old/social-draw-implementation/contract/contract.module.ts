import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { InjectiveService } from './injective.service';
import { TransactionService } from './transaction.service';

@Module({
    providers: [ContractService, InjectiveService, TransactionService],
    exports: [ContractService, InjectiveService, TransactionService],
})
export class ContractModule { } 