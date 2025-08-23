import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class RegisterDomainDto {
    @ApiProperty({
        description: 'NFC卡片的唯一标识符',
        example: '04:f3:a1:8a:b2:5d:80:abc123',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    uid: string;

    @ApiProperty({
        description: '域名前缀（不包含.inj后缀）',
        example: 'alice',
    })
    @IsString()
    @IsNotEmpty()
    @Length(3, 30)
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