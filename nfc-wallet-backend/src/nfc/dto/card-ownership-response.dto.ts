import { ApiProperty } from '@nestjs/swagger';

export class OwnershipRecord {
    @ApiProperty({
        description: '所有者地址',
        example: 'inj1abc123...',
    })
    owner: string;

    @ApiProperty({
        description: '开始拥有时间戳',
        example: 1640995200,
    })
    fromTimestamp: number;

    @ApiProperty({
        description: '结束拥有时间戳 (0表示当前所有者)',
        example: 1641081600,
    })
    toTimestamp: number;

    @ApiProperty({
        description: '转移原因',
        example: 'transfer',
        enum: ['mint', 'transfer', 'unbind'],
    })
    transferReason: string;

    @ApiProperty({
        description: '拥有时长 (秒)',
        example: 86400,
    })
    duration?: number;
}

export class CardOwnershipResponseDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    nfcUID: string;

    @ApiProperty({
        description: 'NFT Token ID',
        example: 1,
    })
    tokenId: number;

    @ApiProperty({
        description: '当前所有者地址',
        example: 'inj1abc123...',
    })
    currentOwner: string;

    @ApiProperty({
        description: '历史所有者数量',
        example: 3,
    })
    ownershipCount: number;

    @ApiProperty({
        description: '历史所有者记录',
        type: [OwnershipRecord],
    })
    ownershipHistory: OwnershipRecord[];

    @ApiProperty({
        description: '卡片创建时间',
        example: 1640995200,
    })
    createdAt: number;

    @ApiProperty({
        description: '最后转移时间',
        example: 1641081600,
    })
    lastTransferAt: number;
} 