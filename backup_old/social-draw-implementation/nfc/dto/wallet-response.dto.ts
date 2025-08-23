import { ApiProperty } from '@nestjs/swagger';

export class NFCCardDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:f3:a1:8a:b2:5d:80:abc123'
    })
    uid: string;

    @ApiProperty({
        description: '卡片昵称',
        example: '我的主卡',
        required: false
    })
    nickname?: string;

    @ApiProperty({
        description: '卡片是否激活',
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        description: '是否为空白卡片',
        example: true
    })
    isBlank: boolean;
}

export class TransactionDto {
    @ApiProperty({
        description: '交易哈希',
        example: '0x1234567890abcdef...'
    })
    txHash: string;

    @ApiProperty({
        description: '交易类型',
        enum: ['SEND', 'RECEIVE', 'INITIAL_FUND', 'DOMAIN_NFT_MINT', 'CAT_NFT_MINT', 'DOMAIN_REG', 'SWAP', 'STAKE', 'UNSTAKE']
    })
    type: string;

    @ApiProperty({
        description: '交易金额',
        example: '0.1',
        required: false
    })
    amount?: string;

    @ApiProperty({
        description: '代币符号',
        example: 'INJ',
        required: false
    })
    tokenSymbol?: string;

    @ApiProperty({
        description: '交易状态',
        enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']
    })
    status: string;

    @ApiProperty({
        description: '创建时间',
        example: '2023-01-01T00:00:00.000Z'
    })
    createdAt: Date;
}

export class WalletResponseDto {
    @ApiProperty({
        description: 'Injective地址',
        example: 'inj1...',
    })
    address: string;

    @ApiProperty({
        description: '以太坊地址',
        example: '0x...',
    })
    ethAddress: string;

    @ApiProperty({
        description: '.inj域名',
        example: 'alice.inj',
        required: false,
    })
    domain?: string;

    @ApiProperty({
        description: '域名NFT代币ID (链上tokenId)',
        example: '1',
        required: false,
    })
    domainTokenId?: string;

    @ApiProperty({
        description: '是否已获得初始资金',
        example: false,
    })
    initialFunded: boolean;

    @ApiProperty({
        description: '是否已注册域名',
        example: false,
    })
    domainRegistered: boolean;

    @ApiProperty({
        description: '关联的NFC卡片（一一对应）',
        type: NFCCardDto,
        required: false
    })
    nfcCard?: NFCCardDto;

    @ApiProperty({
        description: '最近的交易记录',
        type: [TransactionDto]
    })
    recentTransactions: TransactionDto[];

    @ApiProperty({
        description: '是否是新创建的钱包',
        example: true,
    })
    isNewWallet: boolean;
}

export class TransactionResponseDto {
    @ApiProperty({
        description: '操作是否成功',
        example: true
    })
    success: boolean;

    @ApiProperty({
        description: '交易哈希',
        example: '0x1234567890abcdef...',
        required: false
    })
    txHash?: string;

    @ApiProperty({
        description: '错误信息',
        example: '余额不足',
        required: false
    })
    error?: string;

    @ApiProperty({
        description: '交易状态',
        enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'],
        required: false
    })
    status?: string;

    @ApiProperty({
        description: '区块高度',
        example: '123456',
        required: false
    })
    blockHeight?: string;

    @ApiProperty({
        description: '消耗的gas',
        example: '21000',
        required: false
    })
    gasUsed?: string;

    @ApiProperty({
        description: '交易手续费',
        example: '0.001',
        required: false
    })
    fee?: string;

    @ApiProperty({
        description: '交易备注',
        example: '转账给朋友',
        required: false
    })
    memo?: string;

    @ApiProperty({
        description: '原始交易数据',
        required: false
    })
    rawTx?: any;
} 