import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TxStatus } from '@prisma/client';

export interface CreateTransactionData {
    userId: number;
    txHash: string;
    type: TransactionType;
    amount?: string;
    tokenSymbol?: string;
    fromAddress?: string;
    toAddress?: string;
    status?: TxStatus;
    blockHeight?: string;
    gasUsed?: string;
    fee?: string;
    memo?: string;
    rawTx?: any;
}

@Injectable()
export class TransactionService {
    constructor(private prisma: PrismaService) { }

    /**
     * 创建新的交易记录
     */
    async createTransaction(data: CreateTransactionData) {
        return this.prisma.transaction.create({
            data: {
                userId: data.userId,
                txHash: data.txHash,
                type: data.type,
                amount: data.amount,
                tokenSymbol: data.tokenSymbol,
                fromAddress: data.fromAddress,
                toAddress: data.toAddress,
                status: data.status || TxStatus.PENDING,
                blockHeight: data.blockHeight,
                gasUsed: data.gasUsed,
                fee: data.fee,
                memo: data.memo,
                rawTx: data.rawTx
            }
        });
    }

    /**
     * 更新交易状态
     */
    async updateTransactionStatus(
        txHash: string,
        status: TxStatus,
        blockHeight?: string,
        gasUsed?: string,
        fee?: string
    ) {
        return this.prisma.transaction.update({
            where: { txHash },
            data: {
                status,
                blockHeight,
                gasUsed,
                fee,
                updatedAt: new Date()
            }
        });
    }

    /**
     * 根据用户ID获取交易历史
     */
    async getUserTransactions(userId: number, limit: number = 10) {
        return this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    /**
     * 根据交易哈希查找交易
     */
    async getTransactionByHash(txHash: string) {
        return this.prisma.transaction.findUnique({
            where: { txHash },
            include: {
                user: {
                    select: {
                        address: true,
                        ethAddress: true,
                        domain: true
                    }
                }
            }
        });
    }

    /**
     * 获取待确认的交易
     */
    async getPendingTransactions() {
        return this.prisma.transaction.findMany({
            where: { status: TxStatus.PENDING },
            orderBy: { createdAt: 'asc' }
        });
    }

    /**
     * 获取用户的交易统计
     */
    async getUserTransactionStats(userId: number) {
        const [totalTxs, successTxs, pendingTxs, failedTxs] = await Promise.all([
            this.prisma.transaction.count({ where: { userId } }),
            this.prisma.transaction.count({ where: { userId, status: TxStatus.CONFIRMED } }),
            this.prisma.transaction.count({ where: { userId, status: TxStatus.PENDING } }),
            this.prisma.transaction.count({ where: { userId, status: TxStatus.FAILED } })
        ]);

        return {
            total: totalTxs,
            confirmed: successTxs,
            pending: pendingTxs,
            failed: failedTxs
        };
    }
} 