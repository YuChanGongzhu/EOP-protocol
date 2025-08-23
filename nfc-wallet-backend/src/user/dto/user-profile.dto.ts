import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
    @ApiProperty({
        description: '以太坊钱包地址',
        example: '0x742d35Cc6bb7C...',
    })
    address: string;

    @ApiProperty({
        description: 'NFC UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    uid: string;

    @ApiProperty({
        description: '用户自定义.inj域名',
        example: 'alice.inj',
        required: false,
    })
    domain?: string;

    @ApiProperty({
        description: '创建时间',
        example: '2024-01-01T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: '最后更新时间',
        example: '2024-01-01T00:00:00.000Z',
    })
    updatedAt: Date;
} 