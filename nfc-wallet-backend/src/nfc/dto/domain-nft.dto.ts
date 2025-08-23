import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class RegisterDomainDto {
    @ApiProperty({
        description: 'NFC卡片的唯一标识符',
        example: '04:f3:a1:8a:b2:5d:80',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    uid: string;

    @ApiProperty({
        description: '域名后缀（不包含advx-前缀和.inj后缀），1-25字符，只能包含小写字母、数字和连字符，不能以连字符开始或结束，不能有连续连字符。系统会自动添加advx-前缀',
        example: 'alice',
        minLength: 1,
        maxLength: 25,
        pattern: '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 25)
    @Matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/, {
        message: '域名格式无效：只能包含小写字母、数字和连字符，不能以连字符开始或结束，不能有连续连字符'
    })
    domainPrefix: string;
}

export class DomainNFTResponseDto {
    @ApiProperty({
        description: '注册的域名',
        example: 'alice.inj',
    })
    domain: string;

    @ApiProperty({
        description: '域名NFT代币ID (链上tokenId)',
        example: '1',
    })
    tokenId: string;

    @ApiProperty({
        description: '交易哈希',
        example: '0x1234567890abcdef...',
    })
    txHash: string;

    @ApiProperty({
        description: '注册时间',
        example: '2023-01-01T00:00:00.000Z',
    })
    registeredAt: Date;
}

export class DomainAvailabilityDto {
    @ApiProperty({
        description: '完整域名',
        example: 'alice.inj',
    })
    domain: string;

    @ApiProperty({
        description: '域名是否可用',
        example: true,
    })
    available: boolean;

    @ApiProperty({
        description: '域名所有者地址（如果已被占用）',
        example: 'inj1xwve656jwedjne0dtars3m406g2zh92uqpmkfs',
        required: false,
    })
    ownerAddress?: string | null;
} 