import { ApiProperty } from '@nestjs/swagger';

export class NFCStatusResponseDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    uid: string;

    @ApiProperty({
        description: '卡片状态码',
        example: 1,
        enum: [0, 1, 2],
    })
    status: number;

    @ApiProperty({
        description: '状态描述',
        example: 'bound',
        enum: ['blank', 'bound', 'frozen'],
    })
    description: string;

    @ApiProperty({
        description: '是否为空白卡片',
        example: false,
    })
    isBlank: boolean;

    @ApiProperty({
        description: '是否已绑定',
        example: true,
    })
    isBound: boolean;

    @ApiProperty({
        description: '绑定的钱包地址（如果已绑定）',
        example: 'inj1abc123...',
        required: false,
    })
    walletAddress?: string;

    @ApiProperty({
        description: 'NFT Token ID（如果存在）',
        example: 1,
        required: false,
    })
    nftTokenId?: number;

    @ApiProperty({
        description: '历史绑定次数',
        example: 2,
    })
    bindingHistory: number;
} 