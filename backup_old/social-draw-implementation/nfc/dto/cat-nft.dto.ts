import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class DrawCatNFTDto {
    @ApiProperty({
        description: '自己的NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    myNFC: string;

    @ApiProperty({
        description: '其他用户的NFC卡片UID（社交抽卡）',
        example: '04:2b:3c:4d:5e:6f:7a',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    otherNFC: string;

    @ApiProperty({
        description: '小猫名称',
        example: 'Lucky Cat',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    catName: string;
}

export class CatNFTResponseDto {
    @ApiProperty({
        description: 'NFT代币ID (链上tokenId)',
        example: '1',
    })
    tokenId: string;

    @ApiProperty({
        description: '小猫名称',
        example: 'Lucky Cat',
    })
    name: string;

    @ApiProperty({
        description: '稀有度',
        example: 'SR',
        enum: ['R', 'SR', 'SSR', 'UR'],
    })
    rarity: string;

    @ApiProperty({
        description: '小猫颜色',
        example: 'green',
        enum: ['black', 'green', 'red', 'orange', 'purple', 'blue', 'rainbow'],
    })
    color: string;

    @ApiProperty({
        description: '图片URL',
        example: 'https://example.com/cat.png',
    })
    imageUrl: string;

    @ApiProperty({
        description: '元数据',
        example: { 'description': 'A lucky cat' },
        required: false,
    })
    metadata?: Record<string, any>;

    @ApiProperty({
        description: '交易哈希',
        example: '0x1234567890abcdef...',
    })
    txHash: string;

    @ApiProperty({
        description: '铸造时间',
        example: '2023-01-01T00:00:00.000Z',
    })
    mintedAt: Date;
}

export class CatNFTListDto {
    @ApiProperty({
        description: '小猫NFT列表',
        type: [CatNFTResponseDto],
    })
    cats: CatNFTResponseDto[];

    @ApiProperty({
        description: '总数',
        example: 5,
    })
    total: number;

    @ApiProperty({
        description: '当前页码',
        example: 1,
    })
    page: number;

    @ApiProperty({
        description: '总页数',
        example: 1,
    })
    totalPages: number;
}

export class SocialStatsDto {
    @ApiProperty({
        description: 'NFC UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    nfcUID: string;

    @ApiProperty({
        description: '总抽卡次数',
        example: 5,
    })
    drawCount: number;

    @ApiProperty({
        description: '已互动的NFC数量',
        example: 3,
    })
    interactedCount: number;

    @ApiProperty({
        description: '已互动的NFC列表',
        type: [String],
        example: ['04:2b:3c:4d:5e:6f:7a', '04:3c:4d:5e:6f:7a:8b'],
    })
    interactedNFCs: string[];

    @ApiProperty({
        description: '社交奖励概率加成 (基点)',
        example: 250, // 2.5%
    })
    socialBonus: number;
} 